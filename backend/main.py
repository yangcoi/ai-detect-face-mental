from fastapi import FastAPI, UploadFile, File, Form, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import cv2
import numpy as np
import time
from contextlib import asynccontextmanager
from pydantic import BaseModel

from database import (
    init_db, save_checkin, get_today_checkins, get_all_students,
    get_student_history, get_today_checkin_user_ids,
    get_user_by_username, get_user_by_id, verify_password,
    get_random_questions, get_all_topics_with_questions, get_all_checkins_for_export,
    get_student_baseline, upsert_student_baseline, compute_all_trends
)
import json
import io
import openpyxl
from fastapi.responses import StreamingResponse
from auth import create_access_token, get_current_user, require_student, require_admin
from emotion_analyzer import analyze_emotion, calculate_risk, fuse_emotions, update_student_baseline


# ── Lifespan ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB init
    for i in range(10):
        try:
            init_db()
            print("✅ Database connected & initialized!")
            break
        except Exception as e:
            print(f"⏳ Waiting for DB... ({i+1}/10): {e}")
            time.sleep(2)
    yield


app = FastAPI(title="Mental Check-in API", version="2.0.0", lifespan=lifespan)


# ── Exception Handler ────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Error: {exc}")
    return JSONResponse(status_code=500, content={"error": str(exc)})


# ── CORS ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════

class LoginRequest(BaseModel):
    username: str
    password: str


@app.get("/")
def root():
    return {"status": "🧠 Mental Check-in API v2.0 is running!", "model": "dima806/facial_emotions_image_detection (ViT ~91%)"}


@app.post("/auth/login")
def login(body: LoginRequest):
    user = get_user_by_username(body.username)
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")
    token = create_access_token({"user_id": user["id"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "full_name": user["full_name"],
            "class_name": user["class_name"],
        }
    }


@app.get("/auth/me")
def me(current_user=Depends(get_current_user)):
    return current_user


# ═══════════════════════════════════════════════════
# STUDENT & QUESTIONS
# ═══════════════════════════════════════════════════

@app.get("/questions/random")
def get_random_questions_api(limit: int = 15):
    return get_random_questions(limit)


@app.post("/analyze_face")
async def analyze_face_only(
    file: UploadFile = File(...),
    is_cropped: bool = Form(default=False),
    eye_info_json: str = Form(default="")
):
    """API for Dev Mode: Live visualizer, doesn't save to DB"""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"success": False, "error": "Không đọc được ảnh"}

    frontend_eye_info = json.loads(eye_info_json) if eye_info_json else None
    result, err = analyze_emotion(img, None, is_cropped=is_cropped, frontend_eye_info=frontend_eye_info)

    if err:
        return {"success": False, "error": err}

    result["success"] = True
    return result


@app.post("/checkin")
async def full_checkin(
    file: UploadFile = File(...),
    answers_json: str = Form(default="[]"),
    is_unreliable: str = Form(default="false"),
    averaged_emotions_json: str = Form(default=""),
    eye_info_json: str = Form(default=""),
    student_note: str = Form(default=""),
    current_user=Depends(require_student),
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return JSONResponse(status_code=400, content={"error": "Không đọc được ảnh"})

    try:
        answers = json.loads(answers_json)
    except:
        answers = []

    # Thu thập lời khuyên cá nhân hóa
    recommendations = []
    if answers:
        conn = get_db_connection()
        cur = conn.cursor()
        for a in answers:
            q_id = a.get("question_id")
            w = float(a.get("weight", 0))
            if q_id and w >= 3:
                cur.execute("SELECT title, recommendation_text FROM questions WHERE id = %s AND recommendation_text IS NOT NULL", (q_id,))
                row = cur.fetchone()
                if row:
                    recommendations.append({"question": row[0], "advice": row[1]})
        cur.close()
        conn.close()

    # Tính điểm questionnaire (0-100). Giả sử max weight mỗi câu = 5, 15 câu = max 75 điểm.
    total_weight = sum(int(a.get("weight", 0)) for a in answers)
    q_score = min(100.0, (total_weight / 75.0) * 100.0)

    try:
        avg_emotions = json.loads(averaged_emotions_json) if averaged_emotions_json else None
        eye_info = json.loads(eye_info_json) if eye_info_json else None
    except:
        avg_emotions, eye_info = None, None

    if avg_emotions and eye_info:
        # Tái cấu trúc theo 2-Tier Architecture
        survey_data = {
            "score": q_score,
            "is_unreliable": is_unreliable.lower() == "true",
            "sensitive_l1_count": sum(1 for a in answers if a.get("is_sensitive") == "level_1" and a.get("weight") >= 4),
            "sensitive_l2_count": sum(1 for a in answers if a.get("is_sensitive") == "level_2" and a.get("weight") >= 4)
        }
        
        # Module 3: Lấy baseline cũ
        student_id = current_user.get("id", 1)
        baseline = get_student_baseline(student_id)
        
        # Tính điểm dựa trên Tầng 1/2 và 5 Module Phase 2
        risk = calculate_risk(avg_emotions, eye_info, survey_data, baseline)
        
        # Cập nhật Baseline sau khi check-in (Module 3)
        if risk['level'] == 'normal':
             updated_baseline = update_student_baseline(baseline, risk.get('neg_score', 0))
             upsert_student_baseline(student_id, updated_baseline)
        
        # Chuẩn bị raw metrics lưu log
        raw_metrics = {
            "raw_vit_emotions": avg_emotions,
            "eye_info": eye_info,
            "survey_data": survey_data,
            "physical_stress_signal": risk.get("physical_stress_signal", False),
            "masked_smile_signal": risk.get("masked_smile_signal", False)
        }
        
        result = {
            "emotions": avg_emotions,
            "dominant": max(avg_emotions, key=avg_emotions.get) if avg_emotions else "unknown",
            "eye_info": eye_info,
            "risk": risk,
            "raw_metrics": raw_metrics
        }
    else:
        # Fallback (chạy phân tích 1 khung hình trên backend)
        survey_data = {
            "score": q_score,
            "is_unreliable": is_unreliable.lower() == "true",
            "sensitive_l1_count": sum(1 for a in answers if a.get("is_sensitive") == "level_1" and a.get("weight") >= 4),
            "sensitive_l2_count": sum(1 for a in answers if a.get("is_sensitive") == "level_2" and a.get("weight") >= 4)
        }
        res, err = analyze_emotion(img, survey_data)
        if err:
            return JSONResponse(status_code=400, content={"error": err})
        result = res

    # Lưu DB
    try:
        save_checkin(
            current_user["id"],
            result["emotions"],
            result["dominant"],
            result["risk"],
            answers,
            data_quality="unreliable" if result.get("risk", {}).get("level") == "recheck" else "reliable",
            raw_metrics=result.get("raw_metrics", {}),
            student_note=student_note
        )
    except Exception as e:
        print(f"⚠️ DB save failed: {e}")

    return {
        "status":     "saved",
        "emotions":   result["emotions"],
        "dominant":   result["dominant"],
        "eye_info":   result["eye_info"],
        "risk":       result["risk"],
        "answers":    answers,
        "recommendations": recommendations,
        "user":       {"full_name": current_user["full_name"]},
    }


@app.get("/student/history")
def student_history(current_user=Depends(require_student)):
    return get_student_history(current_user["id"])


# ═══════════════════════════════════════════════════
# ADMIN
# ═══════════════════════════════════════════════════

@app.get("/admin/dashboard")
def admin_dashboard(current_user=Depends(require_admin)):
    all_students = get_all_students()
    checked_ids = set(get_today_checkin_user_ids())
    today_checkins = get_today_checkins()

    risk_counts = {"normal": 0, "warning": 0, "critical": 0}
    for c in today_checkins:
        level = c.get("risk_level", "normal")
        risk_counts[level] = risk_counts.get(level, 0) + 1

    return {
        "total_students": len(all_students),
        "checked_in_count": len([s for s in all_students if s["id"] in checked_ids]),
        "not_checked_count": len([s for s in all_students if s["id"] not in checked_ids]),
        "risk_counts": risk_counts,
        "today_checkins": today_checkins,
        "not_checked_students": [s for s in all_students if s["id"] not in checked_ids],
    }

@app.post("/admin/compute_trends")
def trigger_trend_computation(current_user=Depends(require_admin)):
    """Module 5 (Trend Layer): Trigger the computation of all student trends manually."""
    try:
        results = compute_all_trends()
        return {"success": True, "computed_count": len(results), "details": results}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})



@app.get("/admin/students")
def admin_students(current_user=Depends(require_admin)):
    return get_all_students()


@app.get("/admin/student/{user_id}/history")
def admin_student_history(user_id: int, current_user=Depends(require_admin)):
    student = get_user_by_id(user_id)
    if not student:
        return JSONResponse(status_code=404, content={"error": "Không tìm thấy học sinh"})
    return {"student": student, "history": get_student_history(user_id, limit=14)}


@app.get("/admin/topics")
def admin_topics(current_user=Depends(require_admin)):
    return get_all_topics_with_questions()


@app.get("/admin/export")
def export_excel(current_user=Depends(require_admin)):
    data = get_all_checkins_for_export()
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Mental Check-ins"
    
    # Headers
    headers = ["ID", "Họ Tên", "Lớp", "Ngày", "Cảm xúc AI", "Risk Score", "Risk Level", 
               "Câu hỏi", "Câu trả lời", "Điểm rủi ro"]
    ws.append(headers)
    
    for row in data:
        base_row = [
            row["checkin_id"], row["full_name"], row["class_name"], row["date"],
            row["dominant_emotion"], row["risk_score"], row["risk_level"]
        ]
        if not row["answers"]:
            ws.append(base_row + ["", "", ""])
        else:
            for i, ans in enumerate(row["answers"]):
                # Cột thông tin chung chỉ ghi ở dòng đầu của user đó, hoặc lặp lại cũng đc
                # Ở đây lặp lại cho dễ filter excel
                ws.append(base_row + [ans["question"], ans["answer"], ans["weight"]])
                
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=Mental_Checkins_Report.xlsx"}
    )
