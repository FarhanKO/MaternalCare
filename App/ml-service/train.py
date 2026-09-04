"""
Train the maternal health risk classifier.

    python train.py

Reads data/maternal-health-risk.csv (UCI Maternal Health Risk Data Set, 1,014
records collected from hospitals and community clinics in rural Bangladesh),
trains a model, writes model.joblib and metrics.json beside it.

Two things about this dataset that matter more than the choice of algorithm:

Units. `BS` is millimoles per litre and `BodyTemp` is Fahrenheit. The
application stores blood glucose in mg/dL and temperature in Celsius, because
that is what Bangladeshi clinics write on a chart. Feeding 104 mg/dL into a
model that learned "6 to 19" would not throw an error — it would quietly
predict from a value four hundred times too large, and return a confident
answer. The conversion happens in app.py at the API boundary and is tested,
because a silent unit error is the most likely way this whole service ends up
worse than the rule engine it sits beside.

Size. One thousand rows is a small dataset, and it comes from one country's
clinics. That is enough to be useful and nowhere near enough to be authoritative,
which is why the service returns its confidence and its training metrics
alongside every prediction, and why the application keeps the transparent rule
engine as an equal voice rather than deferring to this.
"""
import json
from pathlib import Path

import pandas as pd
from joblib import dump
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import GridSearchCV, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

HERE = Path(__file__).parent
DATA = HERE / "data" / "maternal-health-risk.csv"
MODEL = HERE / "model.joblib"
METRICS = HERE / "metrics.json"

FEATURES = ["Age", "SystolicBP", "DiastolicBP", "BS", "BodyTemp", "HeartRate"]

# the order the API reports probabilities in, low to high
CLASSES = ["low risk", "mid risk", "high risk"]


def load() -> pd.DataFrame:
    df = pd.read_csv(DATA, encoding="utf-8-sig")

    before = len(df)

    # Two records carry a heart rate of 7 bpm. That is not a slow pulse, it is
    # a typing error, and a tree will happily learn a split on it. Anything
    # outside a survivable range goes.
    df = df[(df["HeartRate"] >= 40) & (df["HeartRate"] <= 200)]

    # The dataset ships with duplicate rows. Left in, they leak between the
    # train and test split and inflate the score by several points — the model
    # is then graded on records it has already seen.
    df = df.drop_duplicates()

    print(f"  {before} rows -> {len(df)} after dropping bad heart rates and duplicates")
    return df


def main() -> None:
    df = load()
    X = df[FEATURES]
    y = df["RiskLevel"]

    print("  class balance:", dict(y.value_counts()))

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Scaling is not required by a forest, but it is in the pipeline so the
    # exported artifact is self-contained: whatever preprocessing the model
    # needs travels with it, and app.py never has to remember to repeat it.
    pipe = Pipeline(
        [
            ("scale", StandardScaler()),
            (
                "clf",
                RandomForestClassifier(
                    random_state=42,
                    # the classes are uneven (roughly 40/33/27) and the
                    # expensive mistake is calling a high-risk pregnancy low,
                    # so the minority class gets weighted up
                    class_weight="balanced",
                ),
            ),
        ]
    )

    grid = GridSearchCV(
        pipe,
        {
            "clf__n_estimators": [200, 400],
            "clf__max_depth": [None, 8, 14],
            "clf__min_samples_leaf": [1, 2, 4],
        },
        cv=5,
        scoring="f1_macro",
        n_jobs=-1,
    )
    grid.fit(X_train, y_train)
    model = grid.best_estimator_

    print("  best params:", grid.best_params_)

    cv = cross_val_score(model, X_train, y_train, cv=5, scoring="f1_macro")

    # The number this project should be able to defend out loud.
    #
    # Published work on this dataset routinely reports 85-90% accuracy. Those
    # figures are obtained with the duplicate rows left in: 1,014 records
    # contain only 451 distinct ones, so the same feature vector lands in both
    # the training and the test half and the model is graded on records it has
    # already memorised. Scored that way this same data gives ~0.86 f1; scored
    # honestly it gives ~0.62. Both are recorded here so the difference can be
    # explained rather than discovered.
    leaky = pd.read_csv(DATA, encoding="utf-8-sig")
    leaky = leaky[(leaky["HeartRate"] >= 40) & (leaky["HeartRate"] <= 200)]
    leaky_cv = cross_val_score(
        model, leaky[FEATURES], leaky["RiskLevel"], cv=5, scoring="f1_macro"
    )
    y_pred = model.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)

    labels = list(model.classes_)
    matrix = confusion_matrix(y_test, y_pred, labels=labels).tolist()

    # The number worth watching is not accuracy. It is how often a genuinely
    # high-risk pregnancy was called low — the one error with a cost attached.
    hi, lo = labels.index("high risk"), labels.index("low risk")
    high_called_low = matrix[hi][lo]
    high_total = sum(matrix[hi])

    metrics = {
        "rows_used": int(len(df)),
        "rows_in_file": int(len(leaky)),
        "duplicates_dropped": int(len(leaky) - len(df)),
        "honesty_note": (
            "Scored on de-duplicated data. The same model scored with the "
            f"duplicate rows left in reports f1_macro {leaky_cv.mean():.4f}, "
            "which is the figure most published results on this dataset quote "
            "— it grades the model on rows it has already seen."
        ),
        "cv_f1_macro_if_duplicates_kept": round(float(leaky_cv.mean()), 4),
        "features": FEATURES,
        "classes": labels,
        "best_params": {k: v for k, v in grid.best_params_.items()},
        "cv_f1_macro_mean": round(float(cv.mean()), 4),
        "cv_f1_macro_std": round(float(cv.std()), 4),
        "test_accuracy": round(float(report["accuracy"]), 4),
        "test_f1_macro": round(float(report["macro avg"]["f1-score"]), 4),
        "per_class": {
            c: {
                "precision": round(float(report[c]["precision"]), 4),
                "recall": round(float(report[c]["recall"]), 4),
                "support": int(report[c]["support"]),
            }
            for c in labels
        },
        "confusion_matrix": {"labels": labels, "matrix": matrix},
        "high_risk_missed_as_low": {
            "count": int(high_called_low),
            "of": int(high_total),
            "note": "The costly error: a high-risk pregnancy classified low risk.",
        },
        "feature_importance": {
            f: round(float(w), 4)
            for f, w in sorted(
                zip(FEATURES, model.named_steps["clf"].feature_importances_),
                key=lambda kv: kv[1],
                reverse=True,
            )
        },
        "units": {
            "BS": "mmol/L (the application converts from mg/dL)",
            "BodyTemp": "Fahrenheit (the application converts from Celsius)",
        },
        "source": "UCI Maternal Health Risk Data Set (Ahmed et al.), 1014 records",
    }

    dump(model, MODEL)
    METRICS.write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    print(f"\n  cv f1_macro     {metrics['cv_f1_macro_mean']} (+/- {metrics['cv_f1_macro_std']})")
    print(f"  test accuracy   {metrics['test_accuracy']}")
    print(f"  test f1_macro   {metrics['test_f1_macro']}")
    print(f"  high called low {high_called_low} of {high_total}")
    print(f"  importance      {metrics['feature_importance']}")
    print(f"\n  for comparison, the same model with duplicates left in:")
    print(f"  cv f1_macro     {metrics['cv_f1_macro_if_duplicates_kept']}  <- the leaked figure")
    print(f"\n  wrote {MODEL.name} and {METRICS.name}")


if __name__ == "__main__":
    main()
