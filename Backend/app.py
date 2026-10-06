import os
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ============================================================
# LOAD MODEL
# ============================================================

MODEL_PATH = os.path.join(os.path.dirname(__file__), "BEST.pkl")

try:
    model = joblib.load(MODEL_PATH)
    print(f"[INFO] Model loaded successfully from: {MODEL_PATH}")
    print(f"[INFO] Model type: {type(model).__name__}")
except Exception as e:
    model = None
    print(f"[ERROR] Failed to load model: {e}")


# ============================================================
# REQUIRED FEATURES
# ============================================================

REQUIRED_FIELDS = [
    "age",
    "sex",
    "cp",
    "trestbps",
    "chol",
    "thalach",
    "exang",
    "oldpeak",
    "ca",
    "thal"
]


FIELD_TYPES = {
    "age": float,
    "sex": float,
    "cp": float,
    "trestbps": float,
    "chol": float,
    "thalach": float,
    "exang": float,
    "oldpeak": float,
    "ca": float,
    "thal": float
}


# ============================================================
# VALIDATE INPUT
# ============================================================

def validate_and_parse(data):

    values = []

    for field in REQUIRED_FIELDS:

        if field not in data:
            return None, f"Missing required field: {field}"

        try:
            value = FIELD_TYPES[field](data[field])

            if not np.isfinite(value):
                return None, f"Invalid value for {field}"

            values.append(value)

        except (TypeError, ValueError):
            return None, f"Invalid value for {field}"


    # Sex
    if values[1] not in (0, 1):
        return None, "sex must be 0 (Female) or 1 (Male)"


    # Chest pain
    if values[2] not in (0, 1, 2, 3):
        return None, "cp must be 0, 1, 2, or 3"


    # Exercise induced angina
    if values[6] not in (0, 1):
        return None, "exang must be 0 (No) or 1 (Yes)"


    # Number of major vessels
    if values[8] < 0 or values[8] > 3:
        return None, "ca must be between 0 and 3"


    # Thal
    # New BEST.pkl uses 0-3 encoding
    if values[9] not in (0, 1, 2, 3):
        return None, "thal must be 0, 1, 2, or 3"


    return np.array(values, dtype=float).reshape(1, -1), None


# ============================================================
# SEVERITY
# ============================================================

def get_severity(risk_pct):

    if risk_pct >= 70:
        return "High"

    elif risk_pct >= 50:
        return "Medium"

    else:
        return "Low"


# ============================================================
# DOCTOR SUGGESTION
# ============================================================

def get_doctor_suggestion(severity):

    if severity == "High":

        return (
            "Seek prompt medical evaluation, especially if "
            "you have symptoms."
        )

    elif severity == "Medium":

        return (
            "Discuss the result with a healthcare professional "
            "and maintain heart-healthy habits."
        )

    else:

        return (
            "Maintain a heart-healthy lifestyle and follow "
            "routine medical check-ups."
        )


# ============================================================
# HOME
# ============================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({

        "status": "online",

        "message": "AI Disease Prediction API is running",

        "model_loaded": model is not None,

        "endpoint": "POST /predict",

        "required_fields": REQUIRED_FIELDS,

        "encoding": {

            "sex": "0=Female, 1=Male",

            "cp": (
                "0=Typical angina, "
                "1=Atypical angina, "
                "2=Non-anginal, "
                "3=Asymptomatic"
            ),

            "exang": "0=No, 1=Yes",

            "ca": "0-3",

            "thal": "0-3"

        }

    }), 200


# ============================================================
# PREDICTION
# ============================================================

@app.route("/predict", methods=["POST"])
def predict():

    if model is None:

        return jsonify({

            "error": "Model not loaded. Put BEST.pkl beside app.py.",

            "status": 503

        }), 503


    if not request.is_json:

        return jsonify({

            "error": "Send JSON with Content-Type: application/json",

            "status": 400

        }), 400


    data = request.get_json(silent=True)


    if not isinstance(data, dict):

        return jsonify({

            "error": "Invalid JSON body",

            "status": 400

        }), 400


    features, error = validate_and_parse(data)


    if error:

        return jsonify({

            "error": error,

            "required_fields": REQUIRED_FIELDS,

            "status": 400

        }), 400


    try:

        # ----------------------------------------------------
        # MODEL PREDICTION
        # ----------------------------------------------------

        raw_prediction = int(model.predict(features)[0])


        # ----------------------------------------------------
        # PROBABILITY
        # ----------------------------------------------------

        if hasattr(model, "predict_proba"):

            probabilities = model.predict_proba(features)[0]

            classes = list(model.classes_)

            if 1 in classes:

                disease_index = classes.index(1)

            else:

                disease_index = int(np.argmax(classes))


            risk_pct = round(
                float(probabilities[disease_index]) * 100,
                2
            )

        else:

            risk_pct = (
                100.0
                if raw_prediction == 1
                else 0.0
            )


        # ----------------------------------------------------
        # RESULT
        # ----------------------------------------------------

        prediction_label = (
            "Disease Detected"
            if raw_prediction == 1
            else "No Disease"
        )

        severity = get_severity(risk_pct)

        suggestion = get_doctor_suggestion(severity)


        return jsonify({

            "prediction": prediction_label,

            "risk_percentage": f"{risk_pct}%",

            "severity": severity,

            "doctor_suggestion": suggestion

        }), 200


    except Exception as e:

        return jsonify({

            "error": f"Prediction failed: {str(e)}",

            "status": 500

        }), 500


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def not_found(e):

    return jsonify({

        "error": "Endpoint not found",

        "status": 404

    }), 404


@app.errorhandler(405)
def method_not_allowed(e):

    return jsonify({

        "error": "Method not allowed. Use POST for /predict",

        "status": 405

    }), 405


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )