# Risk model service (F13)

A FastAPI service that classifies a pregnancy as **low**, **medium** or **high**
risk from five vital signs, using a random forest trained on the UCI Maternal
Health Risk Data Set.

It is a second service, not part of the Express app. The Node side calls it and
merges the answer with its own rule engine — **and works fine when this is not
running.** That is deliberate: a maternal health app that goes blank because a
Python process is down would be worse than one with no model at all.

---

## Running it

```bash
npm run ml:serve
```

First time, or after pulling:

```bash
python -m venv ml-service/.venv && node ml-service/run.js -m pip install -r requirements.txt && npm run ml:train
```

Point the Node app somewhere else with `ML_SERVICE_URL`; change the 2.5 s
give-up time with `ML_TIMEOUT_MS`.

## Endpoints

| | |
|---|---|
| `GET /health` | is the model loaded |
| `GET /model` | the model card — how it was trained, how well it scores |
| `POST /predict` | one set of vitals in, a class and probabilities out |
| `GET /docs` | FastAPI's generated API browser |

```bash
curl -X POST localhost:8000/predict -H 'Content-Type: application/json' \
  -d '{"age":37,"systolic":138,"diastolic":90,"sugar_mg_dl":133,"temp_c":36.8}'
```

## Three things worth knowing

**The units differ from the app's.** The dataset publishes blood glucose in
mmol/L and temperature in Fahrenheit. This application stores mg/dL and Celsius,
because that is what a Bangladeshi clinic writes on a chart. The conversion
happens in `app.py` at the API boundary and is covered by tests, because getting
it wrong throws no error — it returns a confident answer computed from a glucose
value eighteen times too large.

**The published accuracy for this dataset is inflated.** Papers on it routinely
report 85–90%. The 1,014 rows contain only 451 distinct ones, so the same
feature vector lands in both the training and the test half and the model is
graded on records it has already memorised. Scored that way this model reports
**f1 0.75**; scored on de-duplicated data it reports **f1 0.64, accuracy 65%**.
Both numbers are in `metrics.json` and served from `GET /model`. The lower one
is the real one.

**The dataset has no healthy-glucose pregnancies.** Its lowest blood sugar is
6 mmol/L — 108 mg/dL — which is already above a normal fasting result. Readings
*below* the trained range are therefore clamped to the minimum and the response
says so; readings *above* it are refused outright, because clamping a glucose of
400 down to 342 would hide exactly the severity that matters.

## Why the rule engine is still there

`models/riskModel.js` was not replaced, and should not be:

- **It explains itself.** It returns the individual factors behind the score,
  and the whole care plan (F14) is built out of them — "your last fasting
  glucose was 104 mg/dL" comes from there. A forest returns a class and has
  nothing to say about why.
- **It works offline**, with no Python and no model file.
- **The model has seen real pregnancies**, which hand-written thresholds have
  not.

So both are shown, and where they disagree the app says so rather than picking
a winner. On the seeded caseload Nusrat Jahan reads *medium* by rules and
*high* by model, on a blood pressure of 142/93 — that disagreement is the
useful output, and it is the point at which a clinician should be the one
deciding.

## Tests

```bash
npm run ml:test
```

13 tests, weighted towards the unit conversions and the range guards. A wrong
threshold gives an obviously wrong answer that somebody notices; a wrong unit
gives a plausible one that nobody does.
