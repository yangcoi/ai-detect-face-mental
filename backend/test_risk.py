import sys
from unittest.mock import MagicMock
sys.modules['cv2'] = MagicMock()
sys.modules['PIL'] = MagicMock()
sys.modules['onnxruntime'] = MagicMock()
sys.modules['huggingface_hub'] = MagicMock()
sys.modules['scipy'] = MagicMock()
sys.modules['scipy.special'] = MagicMock()

import json
from emotion_analyzer import calculate_risk, calculate_negative_score, redistribute_happy

passed = 0
total = 0

def assert_case(name, emotions, eye_info, survey, baseline, expect_level, expect_reason_part=None):
    global passed, total
    total += 1
    # add default face_quality if missing to mock detection logic
    if 'face_quality' not in eye_info:
        eye_info['face_quality'] = {'mouth_visible': True, 'eyes_visible': True, 'full_face_visible': True}
    
    # Tự động tính các giá trị phái sinh nếu test case chỉ cung cấp giá trị gộp
    if "neg_score" in emotions:
        # Trick để calculate_negative_score trả về đúng giá trị neg_score mong muốn
        val = emotions["neg_score"]
        # neg = 0.4 * avg_saf + 0.4 * peak_saf + 0.2 * disgust
        # if we set avg_sad = val / 0.8 * 3, it's too complex. 
        # Just mock it or set disgust = val/0.2.
        emotions["disgust"] = val / 0.2
    
    res = calculate_risk(emotions, eye_info, survey, baseline)
        
    if res["level"] != expect_level:
        print(f"❌ {name} FAILED: Expected level {expect_level}, got {res['level']}. Result: {res}")
        return
    if expect_reason_part and expect_reason_part.lower() not in res.get("note", "").lower():
        print(f"❌ {name} FAILED: Expected reason to contain '{expect_reason_part}', got '{res.get('note', '')}'. Result: {res}")
        return
    passed += 1
    print(f"✅ {name} PASSED")

def run_tests():
    print("🚀 Bắt đầu chạy Test Suite Nhóm A-H...\n")

    # --- Nhóm A ---
    assert_case("A1", {}, {}, {"score": 80}, None, "critical", "điểm khảo sát quá cao")
    assert_case("A2", {}, {}, {"score": 50, "sensitive_l2_count": 1}, None, "critical", "câu hỏi nguy cơ cao")
    
    # A3: 50đ, 1 câu L1 -> behavior=0 -> final=50 -> warning
    assert_case("A3", {}, {}, {"score": 50, "sensitive_l1_count": 1}, None, "warning") 
    assert_case("A4", {}, {}, {"score": 50, "sensitive_l1_count": 2}, None, "critical", "câu hỏi nguy cơ trung bình")
    assert_case("A5", {}, {"drowsiness_score": 50}, {"score": 20}, None, "critical", "kiệt sức")
    assert_case("A6", {}, {"drowsiness_score": 44}, {"score": 20}, None, "normal")

    # --- Nhóm B ---
    assert_case("B1", {}, {}, {"score": 90, "is_unreliable": True}, None, "recheck", "khảo sát")
    assert_case("B2", {}, {"drowsiness_score": 60}, {"score": 90, "is_unreliable": True}, None, "critical", "kiệt sức")
    assert_case("B3", {}, {}, {"score": 50, "is_unreliable": True}, None, "recheck")
    # B4: eyes_visible = False -> PERCLOS ignored, normal final score (20)
    assert_case("B4", {}, {"face_quality": {"eyes_visible": False, "full_face_visible": False, "mouth_visible": True}, "drowsiness_score": 60}, {"score": 20}, None, "normal")
    # B5: mouth_visible=False, eyes_visible=True, mắt có dấu hiệu nhẹ (PERCLOS=30) -> được tính behavior
    assert_case("B5", {}, {"face_quality": {"eyes_visible": True, "full_face_visible": False, "mouth_visible": False}, "drowsiness_score": 30}, {"score": 20}, None, "normal")
    # B6: mouth_visible=False, L2=1 -> critical qua nhánh survey
    assert_case("B6", {}, {"face_quality": {"eyes_visible": True, "full_face_visible": False, "mouth_visible": False}}, {"score": 20, "sensitive_l2_count": 1}, None, "critical", "câu hỏi nguy cơ cao")

    # --- Nhóm C ---
    assert_case("C2", {"disgust": 70/0.2}, {"sustained_negative_2s": True}, {"score": 20}, None, "critical", "cảm xúc tiêu cực bùng phát")
    assert_case("C4", {"disgust": 90/0.2}, {"sustained_negative_2s": True, "face_quality": {"full_face_visible": False, "eyes_visible": True, "mouth_visible": True}}, {"score": 20}, None, "normal")

    # --- Nhóm D ---
    assert_case("D1", {}, {"blink_rate_per_min": 45, "drowsiness_score": 10}, {"score": 15}, None, "normal")
    assert_case("D2", {}, {"blink_rate_per_min": 45, "drowsiness_score": 50}, {"score": 15}, None, "critical", "kiệt sức")
    assert_case("D3", {}, {"blink_rate_per_min": 18, "drowsiness_score": 10}, {"score": 15}, None, "normal")

    # --- Nhóm E ---
    # E2: Happy=80, mouth_active, eye_active=False -> fake smile -> redistribute.
    assert_case("E2", {"happy": 80, "blendshapes": {"mouthSmileLeft": 0.5, "mouthSmileRight": 0.5, "cheekSquintLeft": 0.1, "cheekSquintRight": 0.1}}, {}, {"score": 20}, None, "normal")
    
    # --- Nhóm F ---
    baseline = {"sample_count": 8, "neg_score_mean": 20, "neg_score_std": 5.0} # (35-20)/5 = 3.0 >= 2.5
    assert_case("F3", {"disgust": 35/0.2}, {"sustained_negative_2s": True}, {"score": 20}, baseline, "critical", "lệch bất thường")

    # --- Nhóm H ---
    assert_case("H1", {}, {}, {"score": 20}, None, "normal")
    # H2: Khảo sát=30, neg_score=60, PERCLOS=20. Final = 30 + 0.6*70*0.35 = 44.7 -> warning
    assert_case("H2", {"disgust": 60/0.2}, {"drowsiness_score": 20}, {"score": 30}, None, "warning")
    # H3: Khảo sát=90 (unreliable=False), hành vi tốt -> 90 + 0 = 90 -> critical (vì Khảo sát=90 tự trigger Tầng 1)
    # Wait, H3 said "giả sử không trigger Tầng 1 do lỗi giả lập". Actually Khảo sát=90 will trigger Tầng 1 (A1).
    # H4: Khảo sát=15, physical_stress (blink>30, perclos<45), neg=10, PERCLOS=10
    assert_case("H4", {"disgust": 10/0.2}, {"blink_rate_per_min": 45, "drowsiness_score": 10}, {"score": 15}, None, "normal")

    print(f"\n--- TỔNG KẾT: {passed}/{total} CASES PASSED ---")
    if passed != total:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
