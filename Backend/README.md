# 🫀 AI Disease Prediction Backend

A production-ready Flask REST API that uses a pre-trained Scikit-learn model (`BEST (1).pkl`) to predict heart disease risk, severity, and provide doctor suggestions.

---

## 📁 Project Structure

```
your-project/
├── app.py              ← Flask backend (main server)
├── BEST (1).pkl        ← Your trained ML model
├── requirements.txt    ← Python dependencies
        
└── README.md
```

---

## ⚙️ Local Setup

### 1. Clone / set up the project
```bash
mkdir disease-api && cd disease-api
# Place app.py, requirements.txt, and BEST (1).pkl here
```

### 2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the development server
```bash
python app.py
# Server starts at http://localhost:5000
```

---

## 🔌 API Reference

### `GET /`
Health check — confirms the server is running and model is loaded.

**Response:**
```json
{
  "status": "online",
  "service": "AI Disease Prediction API",
  "model_loaded": true,
  "endpoint": "POST /predict"
}
```

---

### `POST /predict`
Accepts patient medical data and returns AI prediction.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "age":      55,
  "sex":      1,
  "cp":       3,
  "trestbps": 140,
  "chol":     250,
  "fbs":      0,
  "restecg":  1,
  "thalach":  150,
  "exang":    1,
  "oldpeak":  2.3
}
```

| Field     | Type    | Description                          |
|-----------|---------|--------------------------------------|
| age       | integer | Patient age in years                 |
| sex       | integer | 1 = male, 0 = female                 |
| cp        | integer | Chest pain type (0–3)                |
| trestbps  | integer | Resting blood pressure (mm Hg)       |
| chol      | integer | Serum cholesterol (mg/dl)            |
| fbs       | integer | Fasting blood sugar > 120 mg/dl (0/1)|
| restecg   | integer | Resting ECG results (0–2)            |
| thalach   | integer | Maximum heart rate achieved          |
| exang     | integer | Exercise induced angina (0/1)        |
| oldpeak   | float   | ST depression induced by exercise    |

**Success Response (200):**
```json
{
  "prediction":        "Disease Detected",
  "risk_percentage":   "82.45%",
  "severity":          "High",
  "doctor_suggestion": "Consult a cardiologist immediately for a full cardiac evaluation and further medical treatment."
}
```

**Error Response (400):**
```json
{
  "error":           "Missing required field: 'chol'",
  "status":          400,
  "required_fields": ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak"]
}
```

---

## 🎯 Severity Classification

| Risk %    | Severity | Doctor Suggestion                          |
|-----------|----------|--------------------------------------------|
| 0 – 29%   | Low      | Healthy lifestyle & regular exercise       |
| 30 – 69%  | Medium   | Consult a general physician                |
| 70 – 100% | High     | Consult a cardiologist immediately         |

---

## 🧪 Testing with cURL

```bash
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "age": 55, "sex": 1, "cp": 3, "trestbps": 140,
    "chol": 250, "fbs": 0, "restecg": 1, "thalach": 150,
    "exang": 1, "oldpeak": 2.3
  }'
```

---

## 🌐 Frontend Integration (React / Next.js)

```javascript
const res = await fetch("https://your-api-url.onrender.com/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    age: 55, sex: 1, cp: 3, trestbps: 140,
    chol: 250, fbs: 0, restecg: 1, thalach: 150,
    exang: 1, oldpeak: 2.3
  })
});
const data = await res.json();
console.log(data.prediction, data.risk_percentage);
```

---

## 🚀 Deployment

### Render.com (Recommended — Free Tier Available)
1. Push all files (including `BEST (1).pkl`) to a GitHub repo
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` — click **Deploy**
5. Your API is live at `https://your-service.onrender.com`

### Railway
1. Install Railway CLI: `npm i -g @railway/cli`
2. `railway login && railway init && railway up`
3. Set env var: `MODEL_PATH = BEST (1).pkl`

### Production Gunicorn Command
```bash
gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

---

## 🔧 Environment Variables

| Variable    | Default          | Description                        |
|-------------|------------------|------------------------------------|
| MODEL_PATH  | `BEST (1).pkl`   | Path to the pickled ML model       |
| PORT        | `5000`           | Port the server listens on         |
| FLASK_ENV   | `production`     | Set to `development` for debug mode|
