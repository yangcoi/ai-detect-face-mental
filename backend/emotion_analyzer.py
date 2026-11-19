"""
emotion_analyzer.py — Pipeline 3 tầng phân tích cảm xúc

Tầng 1: OpenCV face detect + crop
Tầng 2: Eye state detection (open / drowsy / closed) → EAR + Haar
Tầng 3: ONNX ViT emotion × eye_weight + drowsiness scoring
"""

import cv2
import numpy as np
from PIL import Image
import onnxruntime as ort
from huggingface_hub import hf_hub_download
from scipy.special import softmax

# ── Config ──────────────────────────────────────────
MODEL_REPO = "Xenova/facial_emotions_image_detection"
MODEL_FILE = "onnx/model_quantized.onnx"
LABELS     = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Eye state thresholds
EYE_OPEN    = 2   # số mắt detect được để coi là "mở"
EYE_DROWSY  = 1   # 1 mắt → mắt nửa nhắm
EYE_CLOSED  = 0   # không detect mắt → nhắm

# ── Lazy globals ─────────────────────────────────────
_session      = None
_face_cascade = None
_eye_cascade  = None


# ═══════════════════════════════════════════════
# TẦNG 0: Load models
# ═══════════════════════════════════════════════

def get_ort_session():
    global _session
    if _session is None:
        print(f"⏳ Downloading ONNX model: {MODEL_REPO}...")
        path = hf_hub_download(repo_id=MODEL_REPO, filename=MODEL_FILE)
        _session = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        print("✅ Emotion model (ONNX ViT) loaded!")
    return _session


def get_face_cascade():
    global _face_cascade
    if _face_cascade is None:
        _face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    return _face_cascade


def get_eye_cascade():
    global _eye_cascade
    if _eye_cascade is None:
        _eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_eye.xml"
        )
    return _eye_cascade


# ═══════════════════════════════════════════════
# TẦNG 1: Face detection & crop
# ═══════════════════════════════════════════════

def apply_clahe(img_bgr: np.ndarray) -> np.ndarray:
    """Cải thiện contrast để nhận dạng tốt hơn trong nhiều điều kiện ánh sáng"""
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)


def detect_face(img_bgr: np.ndarray):
    """Detect khuôn mặt, trả về (face_crop, face_rect) hoặc (None, None)"""
    cascade = get_face_cascade()
    enhanced = apply_clahe(img_bgr)
    gray = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    faces = cascade.detectMultiScale(
        gray, scaleFactor=1.1, minNeighbors=4,
        minSize=(60, 60), flags=cv2.CASCADE_SCALE_IMAGE,
    )
    if len(faces) == 0:
        return None, None

    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

    pad = int(max(w, h) * 0.25)
    h_img, w_img = img_bgr.shape[:2]
    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(w_img, x + w + pad)
    y2 = min(h_img, y + h + pad)

    face = enhanced[y1:y2, x1:x2]
    face_rect = [int(x), int(y), int(w), int(h)]
    crop_rect = [int(x1), int(y1), int(x2-x1), int(y2-y1)]
    return (face if face.size > 0 else None), face_rect, crop_rect


# ═══════════════════════════════════════════════
# TẦNG 2: Eye state detection
# ═══════════════════════════════════════════════

def detect_eye_state(face_bgr: np.ndarray, crop_rect: list) -> dict:
    """
    Phân tích trạng thái mắt từ vùng mặt đã crop.
    Returns:
        {
          "state": "open" | "drowsy" | "closed",
          "eyes_detected": int,       # số mắt tìm thấy
          "drowsiness_score": float,  # 0 (tỉnh) → 100 (ngủ gật)
          "eye_boxes": list           # toạ độ tuyệt đối trên ảnh gốc
        }
    """
    cascade = get_eye_cascade()
    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    # Chỉ tìm mắt ở vùng 20% -> 55% để tránh lông mày và mũi
    h = gray.shape[0]
    y_start = int(h * 0.20)
    y_end = int(h * 0.55)
    upper = gray[y_start:y_end]

    eyes = cascade.detectMultiScale(
        upper, scaleFactor=1.1, minNeighbors=3,
        minSize=(15, 15),
    )

    # Lọc ra tối đa 2 mắt to nhất (tránh nhiễu)
    if len(eyes) > 2:
        eyes = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]

    n = len(eyes)

    if n >= 2:
        state = "open"
        drowsiness = 0.0
    elif n == 1:
        state = "drowsy"
        drowsiness = 50.0
    else:
        state = "closed"
        drowsiness = 90.0

    # Chuyển toạ độ mắt về toạ độ gốc (của img_bgr ban đầu)
    cx, cy = crop_rect[0], crop_rect[1] + y_start
    eye_boxes = [[int(ex + cx), int(ey + cy), int(ew), int(eh)] for (ex, ey, ew, eh) in eyes]

    return {
        "state": state,
        "eyes_detected": n,
        "drowsiness_score": drowsiness,
        "eye_boxes": eye_boxes
    }


# ═══════════════════════════════════════════════
# TẦNG 3: ONNX ViT Emotion + Fusion
# ═══════════════════════════════════════════════

def classify_emotion(face_bgr: np.ndarray) -> dict:
    """Chạy ONNX ViT model → {label: percentage}"""
    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(face_rgb).resize((224, 224))
    arr = np.array(pil, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    arr = arr.transpose(2, 0, 1)
    tensor = np.expand_dims(arr, 0)

    session = get_ort_session()
    logits = session.run(None, {session.get_inputs()[0].name: tensor})[0][0]
    probs = softmax(logits)
    return {LABELS[i]: round(float(probs[i]) * 100, 2) for i in range(len(LABELS))}


def fuse_emotions(raw_emotions: dict, eye_info: dict) -> dict:
    """
    Điều chỉnh emotion dựa trên eye_state:
    - closed  → giảm mạnh happy, tăng neutral/sad
    - drowsy  → giảm vừa happy, tăng nhẹ sad
    - open    → giữ nguyên kết quả model
    """
    emotions = dict(raw_emotions)
    state = eye_info.get("state", "open")
    is_frowning = eye_info.get("is_frowning", False)

    if state == "closed":
        # Mắt nhắm: không thể đánh giá là vui — giảm 80% happy
        emotions["happy"] = emotions.get("happy", 0) * 0.2
        emotions["surprise"] = emotions.get("surprise", 0) * 0.3
        emotions["neutral"] = min(100, emotions.get("neutral", 0) + 30)
        emotions["sad"]     = min(100, emotions.get("sad", 0) + 15)

    elif state == "drowsy":
        # Mắt nửa nhắm: buồn ngủ — giảm 50% happy
        emotions["happy"] = emotions.get("happy", 0) * 0.5
        emotions["neutral"] = min(100, emotions.get("neutral", 0) + 15)
        emotions["sad"]     = min(100, emotions.get("sad", 0) + 8)

    if is_frowning:
        # Frowning means stress/anger/sadness - phạt nặng happy và tăng điểm tiêu cực
        emotions["happy"] = emotions.get("happy", 0) * 0.1
        emotions["angry"] = min(100, emotions.get("angry", 0) + 40)
        emotions["sad"]   = min(100, emotions.get("sad", 0) + 20)

    # Re-normalize về 100%
    total = sum(emotions.values())
    if total > 0:
        emotions = {k: round(v / total * 100, 2) for k, v in emotions.items()}

    return emotions


def redistribute_happy(emotions: dict, happy_penalty_factor: float) -> dict:
    original_happy = emotions.get('happy', 0)
    reduced_happy = original_happy * happy_penalty_factor
    freed_mass = original_happy - reduced_happy

    other_labels = ['sad', 'angry', 'fear', 'disgust', 'surprise', 'neutral']
    other_total = sum(emotions.get(k, 0) for k in other_labels)

    adjusted = dict(emotions)
    adjusted['happy'] = reduced_happy
    if other_total > 0:
        for k in other_labels:
            adjusted[k] = emotions.get(k, 0) + freed_mass * (emotions.get(k, 0) / other_total)
    return adjusted


def calculate_negative_score(emotions: dict, is_squinting: bool) -> float:
    avg_saf = (emotions.get('avg_sad', 0) + emotions.get('avg_angry', 0) + emotions.get('avg_fear', 0)) / 3.0
    peak_saf = (emotions.get('peak_sad', 0) + emotions.get('peak_angry', 0) + emotions.get('peak_fear', 0)) / 3.0

    if is_squinting:
        neg = 0.5 * avg_saf + 0.5 * peak_saf
    else:
        neg = 0.4 * avg_saf + 0.4 * peak_saf + 0.2 * emotions.get('disgust', 0)

    return min(100.0, neg)


def update_student_baseline(baseline: dict, current_neg_score: float) -> dict:
    if baseline is None:
        return {'sample_count': 1, 'neg_score_mean': current_neg_score, 'neg_score_std': 0.0}
    
    n = baseline.get('sample_count', 0) + 1
    mean = baseline.get('neg_score_mean', 0)
    new_mean = mean + (current_neg_score - mean) / n
    
    # Simple running std dev estimate
    old_std = baseline.get('neg_score_std', 0)
    new_std = np.sqrt(((n-1)*old_std**2 + (current_neg_score - mean)*(current_neg_score - new_mean)) / n)
    
    return {'sample_count': n, 'neg_score_mean': new_mean, 'neg_score_std': new_std}


def calculate_risk(emotions: dict, eye_info: dict, survey_data: dict, baseline: dict = None) -> dict:
    # ---- 1. Bóc tách dữ liệu ----
    survey_score = survey_data.get('score', 0)
    is_unreliable = survey_data.get('is_unreliable', False)
    sensitive_l1_count = survey_data.get('sensitive_l1_count', 0)
    sensitive_l2_count = survey_data.get('sensitive_l2_count', 0)

    # Module 4: Regional Face Quality
    face_quality = eye_info.get('face_quality', {'mouth_visible': True, 'eyes_visible': True, 'full_face_visible': True})
    eyes_visible = face_quality.get('eyes_visible', True)
    mouth_visible = face_quality.get('mouth_visible', True)
    full_face_visible = face_quality.get('full_face_visible', True)

    perclos = eye_info.get('drowsiness_score', 0)
    blink_rate = eye_info.get('blink_rate_per_min', 0)         # Module 1
    is_squinting = eye_info.get('is_squinting', False)
    sustained_negative_2s = eye_info.get('sustained_negative_2s', False)

    # ---- 2. Module 2: Duchenne smile correction (chỉ nếu mouth + eyes đều thấy) ----
    happy_confidence_low = False
    
    if mouth_visible and eyes_visible:
        masked_smile = eye_info.get('masked_smile_signal', False)

        if emotions.get('happy', 0) >= 40 and masked_smile:
            emotions = redistribute_happy(emotions, happy_penalty_factor=0.5)
            happy_confidence_low = True

    # ---- 3. Negative Score (chỉ tính nếu eyes_visible) ----
    neg_score = 0
    if eyes_visible:
        neg_score = calculate_negative_score(emotions, is_squinting)

    # ---- 4. Module 1: Blink rate — tách khỏi PERCLOS ----
    physical_stress_signal = False
    if eyes_visible and perclos < 45 and blink_rate > 30:
        physical_stress_signal = True

    # ---- 5. Module 3: Personal baseline deviation ----
    deviation_z = None
    use_baseline_trigger = False
    if baseline is not None and baseline.get('sample_count', 0) >= 5 and eyes_visible:
        std = max(baseline.get('neg_score_std', 0), 5.0)
        deviation_z = (neg_score - baseline.get('neg_score_mean', 0)) / std
        use_baseline_trigger = True

    # ---- 6. TẦNG 1: SAFETY NET ----
    tier1_critical = False
    trigger_reasons = []

    if not is_unreliable:
        if survey_score >= 75:
            tier1_critical = True; trigger_reasons.append("Điểm khảo sát quá cao")
        if sensitive_l2_count >= 1:
            tier1_critical = True; trigger_reasons.append("Cảnh báo câu hỏi nguy cơ cao")
        if sensitive_l1_count >= 2:
            tier1_critical = True; trigger_reasons.append("Cảnh báo nhiều câu hỏi nguy cơ trung bình")

    if eyes_visible and perclos >= 45:
        tier1_critical = True; trigger_reasons.append("Kiệt sức/Ngủ gật liên tục")

    if full_face_visible and sustained_negative_2s:
        if neg_score >= 70:
            tier1_critical = True; trigger_reasons.append("Cảm xúc tiêu cực bùng phát liên tục")
        elif use_baseline_trigger and deviation_z >= 2.5:
            tier1_critical = True; trigger_reasons.append(f"Lệch bất thường so với trạng thái thường ngày (z={deviation_z:.1f})")

    if tier1_critical:
        return {
            "level": "critical",
            "score": 100,
            "note": ", ".join(trigger_reasons) + (" (Lưu ý: Khảo sát lười điền)" if is_unreliable else "")
        }

    # ---- 4. TẦNG 2: COMPOSITE SCORE ----
    if is_unreliable:
        return {"level": "recheck", "score": 0, "note": "Học sinh bấm bừa khảo sát, cần xác minh lại"}

    behavior_modifier = 0
    valid_signals = []
    if full_face_visible:
        valid_signals.append(neg_score)
    if eyes_visible:
        valid_signals.append(perclos)
    if valid_signals:
        behavior_modifier = max(valid_signals) / 100.0   # tín hiệu hành vi tệ nhất trong số các nguồn còn đáng tin

    final_score = survey_score + behavior_modifier * (100 - survey_score) * 0.35

    if final_score >= 35:
        return {"level": "warning", "score": final_score}
    else:
        return {"level": "normal", "score": final_score}


# ═══════════════════════════════════════════════
# PUBLIC API
# ═══════════════════════════════════════════════

def analyze_emotion(img_bgr: np.ndarray, survey_data: dict = None, is_cropped: bool = False, frontend_eye_info: dict = None):
    """
    Pipeline đầy đủ:
    1. Detect & crop mặt
    2. Detect trạng thái mắt
    3. ONNX ViT classify emotion
    4. Fusion điều chỉnh theo mắt
    5. Tính risk score tổng hợp

    Returns:
        (result_dict, error_message)
        result_dict = {
            emotions, dominant, eye_info, risk, debug_boxes
        }
    """
    if is_cropped:
        face = img_bgr
        h, w = img_bgr.shape[:2]
        face_rect = [0, 0, w, h]
        crop_rect = [0, 0, w, h]
    else:
        # 1. Face detect
        face_data = detect_face(img_bgr)
        if face_data[0] is None:
            return None, "Không tìm thấy khuôn mặt. Hãy nhìn thẳng vào camera."
        
        face, face_rect, crop_rect = face_data

    # 2. Eye state
    if frontend_eye_info is not None:
        eye_info = frontend_eye_info
        # Default boxes to empty if from frontend
        eye_info["eye_boxes"] = []
    else:
        eye_info = detect_eye_state(face, crop_rect)

    # 3. Emotion model
    try:
        raw_emotions = classify_emotion(face)
    except Exception as e:
        return None, f"Lỗi emotion model: {str(e)}"

    # 4. Fusion
    emotions = fuse_emotions(raw_emotions, eye_info)
    dominant = max(emotions, key=emotions.get)

    # 5. Risk score
    if survey_data is None:
        survey_data = {}
    risk = calculate_risk(emotions, eye_info, survey_data)

    return {
        "emotions":     emotions,
        "raw_emotions": raw_emotions,   # giữ để debug
        "dominant":     dominant,
        "eye_info":     eye_info,
        "risk":         risk,
        "debug_boxes": {
            "face_box": face_rect,
            "crop_box": crop_rect,
            "eye_boxes": eye_info["eye_boxes"]
        }
    }, None
