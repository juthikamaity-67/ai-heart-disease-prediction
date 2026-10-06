import { useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts'

/* ── Sample patient data ────────────────────────────────────── */
const SAMPLE_PATIENT = {
  age: 54, sex: 1, cp: 2, trestbps: 140, chol: 239,
  thalach: 160, exang: 0, oldpeak: 1.2, ca: 0, thal: 2
}

const DEFAULT_FORM = {
  age: '', sex: '', cp: '', trestbps: '', chol: '',
  thalach: '', exang: '', oldpeak: '', ca: '', thal: ''
}

/* ── Severity helpers ───────────────────────────────────────── */
function getSeverityClass(severity) {
  if (!severity) return 'severity-none'
  const s = severity.toLowerCase()
  if (s === 'low') return 'severity-low'
  if (s === 'medium') return 'severity-medium'
  if (s === 'high') return 'severity-high'
  return 'severity-none'
}

function getSeverityColor(severity) {
  if (!severity) return 'var(--accent-pulse)'
  const s = severity.toLowerCase()
  if (s === 'low') return 'var(--low)'
  if (s === 'medium') return 'var(--medium)'
  if (s === 'high') return 'var(--high)'
  return 'var(--accent-pulse)'
}

function parseRisk(raw) {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace('%', ''))
    return isNaN(n) ? 0 : n
  }
  return 0
}

function formatTimestamp(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
    ' · ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/* ── Custom tooltip ─────────────────────────────────────────── */
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <strong>{payload[0].name}</strong>: {payload[0].value.toFixed(1)}%
      </div>
    )
  }
  return null
}

/* ── Risk Chart ─────────────────────────────────────────────── */
function RiskChart({ riskValue, severity }) {
  const color = getSeverityColor(severity)
  const safe = Math.max(0, 100 - riskValue)
  const data = [
    { name: 'Risk', value: parseFloat(riskValue.toFixed(1)) },
    { name: 'Safe', value: parseFloat(safe.toFixed(1)) }
  ]

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} barCategoryGap="30%" margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={900}>
            <Cell fill={color} />
            <Cell fill="rgba(79,142,247,0.35)" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Confidence Radial ─────────────────────────────────────── */
function ConfidenceGauge({ value }) {
  const data = [{ name: 'Confidence', value }]
  return (
    <ResponsiveContainer width="100%" height={110}>
      <RadialBarChart
        cx="50%" cy="90%"
        innerRadius="60%" outerRadius="90%"
        startAngle={180} endAngle={0}
        data={data}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar
          dataKey="value"
          cornerRadius={6}
          fill="var(--accent-cyan)"
          background={{ fill: 'rgba(255,255,255,0.05)' }}
          isAnimationActive
          animationDuration={1000}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  )
}

/* ── Main App ─────────────────────────────────────────────────── */
export default function App() {
  const [formData, setFormData] = useState(DEFAULT_FORM)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  const handleChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }, [])

  const handleSample = () => {
    setFormData(SAMPLE_PATIENT)
    setError(null)
  }

  const handleReset = () => {
    setFormData(DEFAULT_FORM)
    setResult(null)
    setError(null)
  }

  const handlePredict = async () => {
    setError(null)
    // Validate
    const fields = Object.entries(formData)
    const missing = fields.filter(([, v]) => v === '' || v === null || v === undefined)
    if (missing.length > 0) {
      setError('Please fill in all fields before predicting.')
      return
    }

    const payload = {
      age: Number(formData.age),
      sex: Number(formData.sex),
      cp: Number(formData.cp),
      trestbps: Number(formData.trestbps),
      chol: Number(formData.chol),
      thalach: Number(formData.thalach),
      exang: Number(formData.exang),
      oldpeak: Number(formData.oldpeak),
      ca: Number(formData.ca),
      thal: Number(formData.thal),
    }

    setLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      const riskNum = parseRisk(data.risk_percentage)
      const isDisease = data.prediction?.toLowerCase().includes('disease detected') ||
        data.prediction?.toLowerCase().includes('detected')
      const confidence = isDisease ? riskNum : 100 - riskNum

      const enriched = { ...data, riskNum, confidence, timestamp: new Date() }
      setResult(enriched)
      setHistory(prev => [enriched, ...prev].slice(0, 10))
    } catch (err) {
      setError(err.message || 'Failed to reach prediction server. Ensure Flask backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const isDisease = result?.prediction?.toLowerCase().includes('detected')

  return (
    <div className="app-wrapper">

      {/* HERO */}
      <div className="hero">
        <div className="hero-badge">
          <span className="dot" />
          AI-Powered Medical Analysis
        </div>
        <h1>Heart Disease Predictor</h1>
        <p>Enter patient vitals below for instant AI-driven cardiovascular risk analysis and clinical guidance.</p>
      </div>

      {/* FORM */}
      <div className="glass-card section fade-up">
        <div className="card-title">
          <div className="icon">🩺</div>
          Patient Medical Details
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label>Age (years)</label>
            <input type="number" name="age" placeholder="e.g. 52" min="1" max="120"
              value={formData.age} onChange={handleChange} />
          </div>

          <div className="form-field">
            <label>Sex</label>
            <select name="sex" value={formData.sex} onChange={handleChange}>
              <option value="">Select sex</option>
              <option value="0">0 — Female</option>
              <option value="1">1 — Male</option>
            </select>
          </div>

          <div className="form-field">
            <label>Chest Pain Type (CP)</label>
            <select name="cp" value={formData.cp} onChange={handleChange}>
              <option value="">Select type</option>
              <option value="0">0 — Typical Angina</option>
              <option value="1">1 — Atypical Angina</option>
              <option value="2">2 — Non-Anginal Pain</option>
              <option value="3">3 — Asymptomatic</option>
            </select>
          </div>

          <div className="form-field">
            <label>Resting Blood Pressure (mmHg)</label>
            <input type="number" name="trestbps" placeholder="e.g. 130" min="50" max="250"
              value={formData.trestbps} onChange={handleChange} />
          </div>

          <div className="form-field">
            <label>Cholesterol (mg/dL)</label>
            <input type="number" name="chol" placeholder="e.g. 240" min="100" max="600"
              value={formData.chol} onChange={handleChange} />
          </div>

          <div className="form-field">
            <label>Max Heart Rate Achieved</label>
            <input type="number" name="thalach" placeholder="e.g. 150" min="60" max="220"
              value={formData.thalach} onChange={handleChange} />
          </div>

          <div className="form-field">
            <label>Exercise Induced Angina</label>
            <select name="exang" value={formData.exang} onChange={handleChange}>
              <option value="">Select</option>
              <option value="0">0 — No</option>
              <option value="1">1 — Yes</option>
            </select>
          </div>

          <div className="form-field">
            <label>ST Depression (Oldpeak)</label>
            <input type="number" name="oldpeak" placeholder="e.g. 1.5" min="0" max="10" step="0.1"
              value={formData.oldpeak} onChange={handleChange} />
          </div>

          <div className="form-field">
            <label>Major Vessels (CA)</label>
            <select name="ca" value={formData.ca} onChange={handleChange}>
              <option value="">Select (0–3)</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>

          <div className="form-field">
            <label>Thalassemia (Thal)</label>
            <select name="thal" value={formData.thal} onChange={handleChange}>
              <option value="">Select type</option>
              <option value="1">1 — Normal</option>
              <option value="2">2 — Fixed Defect</option>
              <option value="3">3 — Reversible Defect</option>
            </select>
          </div>
        </div>

        <div className="btn-row">
          <button className="btn btn-primary" onClick={handlePredict} disabled={loading}>
            {loading ? '⏳ Analyzing…' : '🔬 Predict Risk'}
          </button>
          <button className="btn btn-secondary" onClick={handleSample}>
            👤 Sample Patient
          </button>
          <button className="btn btn-ghost" onClick={handleReset}>
            ↺ Reset
          </button>
        </div>

        {error && (
          <div className="error-banner">⚠️ {error}</div>
        )}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="glass-card section fade-up">
          <div className="loading-overlay">
            <div className="spinner" />
            <span>Analyzing patient vitals with AI model…</span>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {result && !loading && (
        <div className="result-section">

          {/* Prediction + Severity */}
          <div className={`glass-card prediction-card section ${isDisease ? 'disease-detected' : 'no-disease'}`}>
            <div className="prediction-icon" style={{
              background: isDisease ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'
            }}>
              {isDisease ? '❤️‍🔥' : '💚'}
            </div>
            <div className="prediction-text">
              <h3 style={{ color: isDisease ? 'var(--high)' : 'var(--low)' }}>
                {result.prediction || (isDisease ? 'Disease Detected' : 'No Disease')}
              </h3>
              <p>AI cardiovascular risk assessment complete.</p>
              {result.severity && (
                <span className={`severity-badge ${getSeverityClass(result.severity)}`}>
                  ● {result.severity} Severity
                </span>
              )}
            </div>
          </div>

          {/* Stat cards */}
          <div className="result-grid section">
            <div className="stat-card fade-up">
              <span className="stat-label">Risk Percentage</span>
              <div className="stat-value" style={{ color: getSeverityColor(result.severity) }}>
                {result.riskNum.toFixed(1)}%
              </div>
              <div className="risk-bar-track">
                <div className="risk-bar-fill" style={{
                  width: `${result.riskNum}%`,
                  background: getSeverityColor(result.severity),
                }} />
              </div>
              <span className="stat-sub">Out of 100% maximum risk</span>
            </div>

            <div className="stat-card fade-up-2">
              <span className="stat-label">Prediction Confidence</span>
              <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                {result.confidence.toFixed(1)}%
              </div>
              <ConfidenceGauge value={result.confidence} />
            </div>
          </div>

          {/* Severity Chart */}
          <div className="glass-card section fade-up-2">
            <div className="card-title">
              <div className="icon">📊</div>
              Severity Analysis
            </div>
            <RiskChart riskValue={result.riskNum} severity={result.severity} />
          </div>

          {/* Doctor Suggestion */}
          {result.doctor_suggestion && (
            <div className="doctor-card fade-up-3">
              <div className="doctor-icon">👨‍⚕️</div>
              <div className="doctor-text">
                <strong>Clinical Recommendation</strong>
                <p>{result.doctor_suggestion}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      <div className="glass-card history-section fade-up">
        <div className="history-header">
          <div className="card-title" style={{ marginBottom: 0 }}>
            <div className="icon">🕐</div>
            Prediction History
          </div>
          {history.length > 0 && (
            <button className="btn btn-ghost" style={{ padding: '7px 16px', fontSize: 12 }}
              onClick={() => setHistory([])}>
              Clear
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="empty-history">No predictions yet — run your first analysis above.</div>
        ) : (
          <div className="history-list">
            {history.map((h, i) => {
              const hDisease = h.prediction?.toLowerCase().includes('detected')
              return (
                <div className="history-item" key={i}>
                  <div className="history-left">
                    <span className="history-pred" style={{ color: hDisease ? 'var(--high)' : 'var(--low)' }}>
                      {hDisease ? '❤️‍🔥' : '💚'} {h.prediction}
                    </span>
                    <span className="history-time">{formatTimestamp(h.timestamp)}</span>
                  </div>
                  <div className="history-right">
                    <span className="history-risk" style={{ color: getSeverityColor(h.severity) }}>
                      {h.riskNum?.toFixed(1)}%
                    </span>
                    {h.severity && (
                      <span className={`severity-badge ${getSeverityClass(h.severity)}`}
                        style={{ fontSize: 11, padding: '3px 10px' }}>
                        {h.severity}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
