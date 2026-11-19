# AI-Assisted Facial Emotion & Mental Health Risk Detection

Real-time facial emotion recognition, drowsiness tracking, and psychological stress risk screening system built with FastAPI, OpenCV, ONNX Runtime (Vision Transformer), and Next.js.

---

## 1. Overview

The system captures student facial expressions through a web camera, runs a multi-tier computer vision pipeline to detect emotional states and fatigue, and provides an analytics dashboard for school counseling staff to monitor potential psychological stress patterns over time.

---

## 2. System Architecture

The architecture consists of an AI inference backend and a modern web dashboard:

```
+-------------------------------------------------------------+
|                     NEXT.JS 14 FRONTEND                     |
|  - Real-time Webcam AutoScanner (Tailwind CSS, TypeScript)  |
|  - Emotion Distribution Charts & Risk Level Indicators      |
|  - Student Profile & Counseling History Views               |
+-------------------------------------------------------------+
                               │ ▲
             REST API Requests │ │ JSON Responses
                               ▼ │
+-------------------------------------------------------------+
|                      FASTAPI BACKEND                        |
|  - Tier 1: OpenCV Face Detection & Bounding Box Normalizer  |
|  - Tier 2: Eye Aspect Ratio (EAR) & Drowsiness Scorer       |
|  - Tier 3: Quantized Vision Transformer (ONNX ViT) Emotion  |
|  - Risk Aggregator & Session Database Logging               |
+-------------------------------------------------------------+
                               │
                               ▼
+-------------------------------------------------------------+
|                     POSTGRESQL DATABASE                     |
|  - User Credentials (bcrypt) & Role-Based Access            |
|  - Historical Emotion Logs & Mental Health Screening Scores |
+-------------------------------------------------------------+
```

---

## 3. Computer Vision & Emotion Pipeline

1. **Face Detection (Tier 1):**
   - Detects front-facing facial regions using OpenCV Haar Cascades.
   - Normalizes and crops the face bounding box to 224x224 pixels.
2. **Fatigue & Eye State Detection (Tier 2):**
   - Tracks eye openness state (open, drowsy, closed).
   - Computes weighted fatigue score based on prolonged eye closure patterns.
3. **Emotion Classification (Tier 3):**
   - Evaluates facial features using a quantized ONNX Vision Transformer (`Xenova/facial_emotions_image_detection`).
   - Outputs softmax probability distribution across 7 emotions: Angry, Disgust, Fear, Happy, Neutral, Sad, Surprise.
   - Combines emotional entropy with drowsiness to compute a composite psychological stress risk score.

---

## 4. Tech Stack

- **Backend:** Python 3.11+, FastAPI, OpenCV, ONNX Runtime, Hugging Face Hub, Scipy, Passlib (bcrypt).
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS.
- **Database:** PostgreSQL.
- **Deployment:** Docker, Docker Compose.

---

## 5. Quick Start

### Using Docker Compose

```bash
# Clone the repository
git clone https://github.com/yangcoi/ai-detect-face-mental.git
cd ai-detect-face-mental

# Start backend, frontend, and database services
docker-compose up -d --build
```

Access the frontend at `http://localhost:3000` and API docs at `http://localhost:8000/docs`.

### Manual Setup

#### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 6. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/analyze-frame` | Receives raw frame image, runs 3-tier pipeline, returns emotion vector |
| `POST` | `/api/auth/login` | Authenticates administrator/counselor, issues JWT token |
| `GET` | `/api/students/{id}/history` | Retrieves historical emotion and risk trajectory logs |
| `POST` | `/api/screenings` | Submits supplementary standardized psychological questionnaire responses |

---

## License

This project is licensed under the MIT License.
