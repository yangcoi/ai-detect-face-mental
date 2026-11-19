"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import axios from "axios";
import { getToken, getUser, clearAuth } from "@/lib/auth";
import EmotionResult from "@/components/EmotionResult";
import Questionnaire, { Question, Answer, QuestionOption } from "@/components/Questionnaire";
import RiskBadge from "@/components/RiskBadge";
import AutoScanner from "@/components/AutoScanner";

const API = "http://localhost:8000";

type Step = "capture" | "survey" | "result";

export default function CheckinPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<Step>("capture");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [temporalData, setTemporalData] = useState<{avgEmotions: any, eyeInfo: any} | null>(null);
  const webcamRef = useRef<Webcam>(null);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [studentNote, setStudentNote] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!getToken() || !u || u.role !== "student") {
      router.push("/login");
      return;
    }
    setUser(u);
    // Fetch random questions
    axios.get(`${API}/questions/random?limit=15`)
      .then(res => {
        setQuestions(res.data);
        // Không pre-fill default answers cho sliders nữa để bắt buộc người dùng tương tác
        setAnswers({});
      })
      .catch(err => console.error("Failed to load questions", err));
  }, [router]);

  const handleAutoScanComplete = useCallback((blob: Blob, avgEmotions: any, eyeInfo: any) => {
    setCapturedBlob(blob);
    setTemporalData({ avgEmotions, eyeInfo });
    setStep("survey");
  }, []);

  const handleAnswerChange = (questionId: number, option: QuestionOption, dwellTime: number, isSensitive: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        question_id: questionId,
        value: option.label,
        weight: option.weight,
        is_sensitive: isSensitive,
        dwell_time: dwellTime
      }
    }));
  };

  const handleSubmit = async () => {
    if (!capturedBlob) return;
    const answersArray = Object.values(answers);
    if (answersArray.length < questions.length) {
      setError("Vui lòng trả lời đầy đủ tất cả câu hỏi trước khi nộp!");
      return;
    }

    // Kiểm tra data_quality: unreliable nếu có > 80% câu trả lời có dwell_time < 1s
    const quickAnswersCount = answersArray.filter(a => a.dwell_time !== undefined && a.dwell_time < 1000).length;
    const is_unreliable = quickAnswersCount > (questions.length * 0.8);

    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", capturedBlob, "checkin.jpg");
    formData.append("student_note", studentNote);
    
    // Gắn cờ is_unreliable vào answers JSON payload tạm thời hoặc để backend tự tính cũng được,
    // Tuy nhiên theo thiết kế, ta sẽ truyền cờ này lên để backend xử lý dễ hơn.
    // Thực tế backend nhận answers_json, nên ta có thể đưa is_unreliable vào FormData riêng.
    formData.append("answers_json", JSON.stringify(answersArray));
    formData.append("is_unreliable", is_unreliable.toString());
    
    if (temporalData) {
      formData.append("averaged_emotions_json", JSON.stringify(temporalData.avgEmotions));
      formData.append("eye_info_json", JSON.stringify(temporalData.eyeInfo));
    }

    try {
      const res = await axios.post(`${API}/checkin`, formData, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setResult(res.data);
      setStep("result");
    } catch (e: any) {
      setError(e.response?.data?.error || "❌ Không kết nối được server.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("capture"); 
    setCapturedBlob(null); 
    setTemporalData(null);
    setResult(null); 
    setError(null);
    // Reset radio answers, keep slider defaults (but we removed slider defaults)
    setAnswers({});
  };
  
  const handleLogout = () => { clearAuth(); router.push("/login"); };

  const STEPS = ["Chụp ảnh", "Khảo sát", "Kết quả"];
  const stepIndex = step === "capture" ? 0 : step === "survey" ? 1 : 2;

  if (!user) return null;

  return (
    <main className="main">
      <header className="header" style={{ maxWidth: 720 }}>
        {/* Premium User Profile Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          background: "rgba(255, 255, 255, 0.6)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.8)",
          padding: "10px 16px",
          borderRadius: "50px",
          marginBottom: 24,
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: "bold", fontSize: "0.9rem"
            }}>
              {user.full_name?.charAt(0)}
            </div>
            <span style={{ color: "var(--text)", fontSize: "0.9rem", fontWeight: 600 }}>
              {user.full_name} <span style={{ color: "var(--text-dim)", fontWeight: 400 }}>· {user.class_name}</span>
            </span>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Đăng xuất ⎋
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <h1 className="logo" style={{ margin: 0 }}>🧠 Mental Check-in</h1>
          <button 
            onClick={() => setIsDevMode(!isDevMode)} 
            style={{ 
              background: isDevMode ? "var(--primary-color)" : "transparent",
              border: "1px solid var(--primary-color)",
              color: isDevMode ? "var(--bg-color)" : "var(--primary-color)",
              padding: "4px 8px", 
              borderRadius: 6,
              fontSize: "0.75rem",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            {isDevMode ? "🛠 Dev Mode: ON" : "🛠 Dev Mode: OFF"}
          </button>
        </div>
        <p className="tagline">Kiểm tra trạng thái tinh thần hôm nay</p>
        <div className="steps-indicator">
          {STEPS.map((label, i) => (
            <div key={i} className={`step-dot ${i <= stepIndex ? "active" : ""}`}>
              <div className="step-circle">{i + 1}</div>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="content">
        {step === "capture" && (
          <div className="step-panel">
            <p className="step-hint">Đưa khuôn mặt vào camera và giữ nguyên trong 15s để hệ thống phân tích</p>
            <div className="webcam-wrapper" style={{ position: "relative", overflow: "visible" }}>
              <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg"
                videoConstraints={{ width: 1280, height: 720, facingMode: "user" }}
                className="webcam-video" />
              <AutoScanner 
                webcamRef={webcamRef} 
                isDevMode={isDevMode} 
                onScanComplete={handleAutoScanComplete} 
              />
            </div>
          </div>
        )}

        {step === "survey" && (
          <div className="step-panel">
            <p className="step-hint" style={{ marginBottom: 16 }}>
              Trả lời {questions.length} câu hỏi để hoàn thành đánh giá
            </p>
            <Questionnaire questions={questions} answers={answers} onChange={handleAnswerChange} />
            
            {/* Hộp thoại chia sẻ ẩn danh/bảo mật */}
            <div className="glass-panel" style={{ marginTop: 24, padding: "20px" }}>
              <div style={{ fontSize: "0.85rem", color: "var(--accent)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Tâm sự cùng giáo viên (Không bắt buộc)
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-dim)", marginBottom: 12 }}>
                Bạn có gì muốn chia sẻ hoặc cần giáo viên hỗ trợ không? 
                <strong> Dữ liệu này được bảo mật và chỉ giáo viên phụ trách mới có thể đọc được.</strong>
              </p>
              <textarea
                value={studentNote}
                onChange={e => setStudentNote(e.target.value)}
                placeholder="Ví dụ: Em đang cảm thấy hơi áp lực với kỳ thi sắp tới..."
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: "rgba(255,255,255,0.7)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none",
                  boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)"
                }}
              />
            </div>

            {error && <p className="error-msg" style={{ marginTop: 16 }}>{error}</p>}
            <div className="btn-row" style={{ marginTop: 20 }}>
              <button onClick={handleReset} className="btn-secondary">← Chụp lại ảnh</button>
              <button onClick={handleSubmit} disabled={loading} className="btn-primary">
                {loading ? "⏳ Đang phân tích..." : "✅ Hoàn thành Check-in"}
              </button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div className="step-panel">
            <p className="success-msg">✅ Check-in thành công!</p>
            {result.risk && (
              <div className="card" style={{ textAlign: "center", padding: "20px" }}>
                <p style={{ color: "var(--text-dim)", fontSize: "0.82rem", marginBottom: 8 }}>Trạng thái sức khỏe tinh thần hôm nay</p>
                <RiskBadge level={result.risk.level} score={result.risk.score} size="lg" />
              </div>
            )}
            <EmotionResult emotions={result.emotions} dominant={result.dominant} eyeInfo={result.eye_info} recommendations={result.recommendations} />
            <button onClick={handleReset} className="btn-primary btn-full" style={{ marginTop: 16 }}>🔄 Check-in ngày mới</button>
          </div>
        )}
      </div>
    </main>
  );
}
