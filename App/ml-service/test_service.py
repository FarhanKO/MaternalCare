"""
Tests for the risk service.

    .venv/Scripts/python -m pytest test_service.py -q

The unit conversions get the most attention here, deliberately. A wrong
threshold produces an obviously wrong answer that somebody notices; a wrong
unit produces a plausible answer that nobody notices, and that is the failure
this service is most exposed to.
"""
import pytest
from fastapi.testclient import TestClient

import app as service

client = TestClient(service.app)

WELL = {"age": 25, "systolic": 110, "diastolic": 70, "sugar_mg_dl": 82, "temp_c": 36.8}
UNWELL = {"age": 37, "systolic": 145, "diastolic": 95, "sugar_mg_dl": 200, "temp_c": 38.0,
          "heart_bpm": 95}


def test_health_reports_a_loaded_model():
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["trained_on_rows"] > 0


def test_model_card_admits_the_duplicate_problem():
    card = client.get("/model").json()
    # the honest score and the inflated one are both published
    assert card["cv_f1_macro_mean"] < card["cv_f1_macro_if_duplicates_kept"]
    assert card["duplicates_dropped"] > 0
    assert "memorised" in card["honesty_note"] or "already seen" in card["honesty_note"]


def test_glucose_is_converted_from_mg_dl_to_mmol():
    """
    180 mg/dL is 10 mmol/L. If the conversion were dropped, the model would be
    handed 180 against a training range of 6-19 and would answer anyway.
    """
    assert service.MG_DL_PER_MMOL == pytest.approx(18.018)
    assert 180 / service.MG_DL_PER_MMOL == pytest.approx(9.99, abs=0.02)


def test_temperature_is_converted_from_celsius_to_fahrenheit():
    assert 37.0 * 9 / 5 + 32 == pytest.approx(98.6)


def test_a_well_mother_reads_low():
    body = client.post("/predict", json=WELL).json()
    assert body["level"] == "low"
    assert body["probabilities"]["low"] > body["probabilities"]["high"]


def test_an_unwell_mother_reads_high():
    body = client.post("/predict", json=UNWELL).json()
    assert body["level"] == "high"


def test_the_two_are_not_the_same_answer():
    """Guards against a model that has collapsed to one class."""
    a = client.post("/predict", json=WELL).json()["level"]
    b = client.post("/predict", json=UNWELL).json()["level"]
    assert a != b


def test_a_missing_pulse_is_imputed_and_declared():
    body = client.post("/predict", json=WELL).json()
    assert body["imputed"] == ["heart_bpm"]

    given = client.post("/predict", json={**WELL, "heart_bpm": 78}).json()
    assert given["imputed"] == []


def test_readings_below_the_training_range_are_clamped_not_refused():
    """
    The dataset's lowest glucose is 6 mmol/L (108 mg/dL) — it contains no
    healthy-glucose pregnancies. Refusing those would leave the service unable
    to speak about most mothers using this app.
    """
    body = client.post("/predict", json=WELL)
    assert body.status_code == 200
    fields = [c["field"] for c in body.json()["clamped"]]
    assert "sugar_mg_dl" in fields


def test_readings_above_the_training_range_are_refused():
    """Clamping 400 mg/dL down to 342 would hide the severity that matters."""
    r = client.post("/predict", json={**WELL, "sugar_mg_dl": 400})
    assert r.status_code == 422
    assert "above anything this model was trained on" in r.json()["detail"]


def test_impossible_blood_pressure_is_refused():
    r = client.post("/predict", json={**WELL, "systolic": 60, "diastolic": 90})
    assert r.status_code == 422


def test_probabilities_sum_to_one():
    p = client.post("/predict", json=UNWELL).json()["probabilities"]
    assert sum(p.values()) == pytest.approx(1.0, abs=0.01)
    assert set(p) == {"low", "medium", "high"}


def test_every_prediction_carries_its_own_caveat():
    q = client.post("/predict", json=WELL).json()["model_quality"]
    assert "not a diagnosis" in q["caveat"]
    assert q["trained_on_rows"] > 0
