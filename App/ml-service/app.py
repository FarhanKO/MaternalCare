"""
Maternal health risk prediction service.

    uvicorn app:app --port 8000

A small FastAPI service in front of the model trained by train.py. The Node
application calls POST /predict and merges the answer with its own rule engine;
it never depends on this being up.

The service does three jobs that are not "run the model":

1. It converts units. The application speaks mg/dL and Celsius because that is
   what a Bangladeshi clinic writes on a chart; the model learned mmol/L and
   Fahrenheit because that is how the dataset was published. Getting this wrong
   throws no error — it returns a confident answer computed from a glucose
   value eighteen times too large.

2. It refuses input it should not be predicting from. A model asked about a
   systolic pressure of 400 will still return a class and a probability. Out of
   range means 422, not a guess.

3. It says how sure it is, and how good it is. Every prediction carries the
   class probabilities and a pointer to the training metrics, because a model
   trained on 451 distinct records should not be presented as an oracle.
"""
from pathlib import Path
from typing import Literal, Optional

import json

import pandas as pd
from fastapi import FastAPI, HTTPException
from joblib import load
from pydantic import BaseModel, Field

HERE = Path(__file__).parent
MODEL_PATH = HERE / "model.joblib"
METRICS_PATH = HERE / "metrics.json"

FEATURES = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]

# The application's own vocabulary. The dataset says "mid risk"; every screen,
# table and PDF in this project has said "medium" since the first sprint, and
# the translation belongs here rather than in five places downstream.
TO_APP = {"low risk": "low", "mid risk": "medium", "high risk": "high"}

# mg/dL -> mmol/L. The reciprocal of the 18.018 mg/dL per mmol/L for glucose.
MG_DL_PER_MMOL = 18.018

# What the model saw. Anything outside this is not something it can speak to,
# and the median is what stands in for a heart rate the app has not collected.
TRAINED_RANGE = {
    "age": (10, 70),
    "systolic": (70, 160),
    "diastolic": (49, 100),
    "sugar_mg_dl": (6 * MG_DL_PER_MMOL, 19 * MG_DL_PER_MMOL),   # 108 - 342
    "temp_c": (36.6, 39.5),
    "heart_bpm": (40, 200),
}
MEDIAN_HEART_BPM = 76.0

app = FastAPI(
    title="MaternalCare+ risk model",
    version="1.0.0",
    description="Classifies a pregnancy as low, medium or high risk from five vital signs.",
)

_model = load(MODEL_PATH) if MODEL_PATH.exists() else None
_metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8")) if METRICS_PATH.exists() else {}


class Reading(BaseModel):
    """One set of vitals, in the units the application stores them in."""

    age: float = Field(..., description="Years")
    systolic: float = Field(..., description="mmHg")
    diastolic: float = Field(..., description="mmHg")
    sugar_mg_dl: float = Field(..., description="Fasting blood glucose, mg/dL")
    temp_c: float = Field(..., description="Body temperature, Celsius")
    # Optional because the application did not collect a maternal pulse until
    # this service asked for one. Absent, the dataset median stands in and the
    # response says so — a prediction resting on an assumed value should not
    # look like one resting on a measurement.
    heart_bpm: Optional[float] = Field(None, description="Maternal pulse, bpm")


class Prediction(BaseModel):
    level: Literal["low", "medium", "high"]
    label: str
    confidence: float
    probabilities: dict
    imputed: list
    clamped: list
    model_quality: dict


@app.get("/health")
def health() -> dict:
    """Is the model loaded and ready? The Node side checks this before trusting us."""
    return {
        "status": "ok" if _model is not None else "no-model",
        "model": MODEL_PATH.name if _model is not None else None,
        "trained_on_rows": _metrics.get("rows_used"),
    }


@app.get("/model")
def model_card() -> dict:
    """
    Everything known about how good this model is, served rather than buried
    in a file — including the gap between its honest score and the inflated one
    that the duplicate rows in this dataset produce.
    """
    if not _metrics:
        raise HTTPException(status_code=503, detail="No training metrics available")
    return _metrics


def _bound(name: str, value: float, clamped: list) -> float:
    """
    Bring a reading inside the range the model was trained on — or refuse.

    The two directions are not symmetrical, and treating them the same way was
    the first thing that had to be fixed here.

    Below the minimum, the reading is *better* than anything the model saw. The
    UCI dataset's lowest blood glucose is 6 mmol/L, or 108 mg/dL, which is
    already above a normal fasting result: the data contains no healthy-glucose
    pregnancies at all. Rejecting those left the service unable to say anything
    about most of the mothers using this app. Clamping to the minimum asks the
    model its most favourable seen value, which can only understate risk in the
    direction of "she is fine", and the response says the value was clamped.

    Above the maximum it is refused. Clamping a glucose of 400 mg/dL down to
    342 would hide exactly the severity that matters, and at that end the
    honest answer is not a class from a small model — it is the rule engine and
    the vital-sign alerts, which both already say see someone now.
    """
    low, high = TRAINED_RANGE[name]
    if value > high:
        raise HTTPException(
            status_code=422,
            detail=(
                f"{name} of {value:g} is above anything this model was trained on "
                f"(max {high:g}). A reading that far out needs a clinician, not a "
                f"classifier."
            ),
        )
    if value < low:
        clamped.append({"field": name, "given": value, "used": low})
        return low
    return value


@app.post("/predict", response_model=Prediction)
def predict(r: Reading) -> Prediction:
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded — run train.py")

    imputed = []
    clamped: list = []
    heart = r.heart_bpm
    if heart is None:
        heart = MEDIAN_HEART_BPM
        imputed.append("heart_bpm")

    age = _bound("age", r.age, clamped)
    systolic = _bound("systolic", r.systolic, clamped)
    diastolic = _bound("diastolic", r.diastolic, clamped)
    sugar = _bound("sugar_mg_dl", r.sugar_mg_dl, clamped)
    temp = _bound("temp_c", r.temp_c, clamped)
    heart = _bound("heart_bpm", heart, clamped)

    if r.systolic <= r.diastolic:
        raise HTTPException(
            status_code=422,
            detail="Systolic pressure must be higher than diastolic — check the reading.",
        )

    # The conversions this service exists to get right.
    #
    # Built as a named frame rather than a bare list so the columns are matched
    # by name, the way the pipeline was fitted. A positional list works right
    # up until somebody reorders FEATURES, at which point every prediction is
    # wrong and nothing raises.
    row = pd.DataFrame(
        [{
            "Age": age,
            "SystolicBP": systolic,
            "DiastolicBP": diastolic,
            "BS": sugar / MG_DL_PER_MMOL,      # mg/dL -> mmol/L
            "BodyTemp": temp * 9 / 5 + 32,     # Celsius -> Fahrenheit
            "HeartRate": heart,
        }],
        columns=FEATURES,
    )

    proba = _model.predict_proba(row)[0]
    classes = list(_model.classes_)
    best = max(range(len(proba)), key=lambda i: proba[i])
    raw = classes[best]

    return Prediction(
        level=TO_APP[raw],
        label=raw,
        confidence=round(float(proba[best]), 4),
        probabilities={TO_APP[c]: round(float(p), 4) for c, p in zip(classes, proba)},
        imputed=imputed,
        clamped=clamped,
        model_quality={
            "trained_on_rows": _metrics.get("rows_used"),
            "cv_f1_macro": _metrics.get("cv_f1_macro_mean"),
            "test_accuracy": _metrics.get("test_accuracy"),
            "caveat": (
                "Trained on 451 distinct records from Bangladeshi clinics. "
                "Decision support, not a diagnosis."
            ),
        },
    )
