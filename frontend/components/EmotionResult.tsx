"use client";
import React from "react";

interface EyeInfo {
  state: "open" | "drowsy" | "closed";
  eyes_detected: number;
  drowsiness_score: number;
  is_frowning?: boolean;
  is_squinting?: boolean;
  face_quality_low?: boolean;
  eye_quality_low?: boolean;
  sustained_negative_2s?: boolean;
}

interface Recommendation {
  question: string;
  advice: string;
}

interface Props {
  emotions: Record<string, number>;
  dominant: string;
  eyeInfo?: EyeInfo;
  recommendations?: Recommendation[];
}

const EMOTION_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  happy:    { emoji: "😊", label: "Vui vẻ",     color: "#a6e3a1" },
  sad:      { emoji: "😔", label: "Buồn",        color: "#89b4fa" },
  neutral:  { emoji: "😐", label: "Bình thường", color: "#cdd6f4" },
  angry:    { emoji: "😡", label: "Tức giận",    color: "#f38ba8" },
  fear:     { emoji: "😨", label: "Lo sợ",       color: "#cba6f7" },
  surprise: { emoji: "😲", label: "Ngạc nhiên",  color: "#fab387" },
  disgust:  { emoji: "🤢", label: "Khó chịu",    color: "#94e2d5" },
};

const EYE_STATE_MAP = {
  open:   { emoji: "👀", label: "Mắt mở",     color: "#a6e3a1", bg: "rgba(166,227,161,0.1)" },
  drowsy: { emoji: "😪", label: "Buồn ngủ",   color: "#f9e2af", bg: "rgba(249,226,175,0.1)" },
  closed: { emoji: "😴", label: "Mắt nhắm",   color: "#f38ba8", bg: "rgba(243,139,168,0.1)" },
};

export default function EmotionResult({ emotions, dominant, eyeInfo, recommendations }: Props) {
  const sorted = Object.entries(emotions).sort(([, a], [, b]) => b - a);
  const dom = EMOTION_MAP[dominant];
  const eye = eyeInfo ? EYE_STATE_MAP[eyeInfo.state] : null;

  return (
    <div className="result-wrapper">
      {/* Dominant emotion hero - PREMIUM GLOW */}
      <div className="glass-panel premium-glow" style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          fontSize: "4rem", 
          marginBottom: "12px", 
          animation: "pulse-glow 2s infinite alternate",
          display: "inline-block"
        }}>
          {dom?.emoji}
        </div>
        <div>
          <p style={{ color: "var(--text-dim)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Cảm xúc chủ đạo</p>
          <h2 className="gradient-text" style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
            {dom?.label}
          </h2>
        </div>
      </div>

      {/* Gợi ý dành riêng cho bạn (Recommendations) */}
      {recommendations && recommendations.length > 0 && (
        <div className="glass-panel" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "var(--accent)", display: "flex", alignItems: "center", gap: "8px" }}>
            💡 Gợi ý dành riêng cho bạn
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {recommendations.map((rec, idx) => (
              <div key={idx} className="recommendation-card" style={{ animationDelay: `${idx * 0.15}s` }}>
                <p className="question-text">Về vấn đề: <i>{rec.question}</i></p>
                <p className="advice-text">{rec.advice}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eye state + drowsiness */}
      {eyeInfo && (
        <div className="glass-panel" style={{ marginBottom: 24, padding: "16px 20px" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "16px", color: "var(--text)" }}>👁️ Trạng thái mắt</h3>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 16px", borderRadius: 12,
              background: eye?.bg, border: `1px solid ${eye?.color}`,
              boxShadow: "0 2px 10px rgba(0,0,0,0.02)"
            }}>
              <span style={{ fontSize: "1.4rem" }}>{eye?.emoji}</span>
              <div>
                <p style={{ margin: 0, color: eye?.color, fontWeight: 600, fontSize: "0.9rem" }}>
                  {eye?.label}
                </p>
                <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.72rem" }}>
                  Phát hiện {eyeInfo.eyes_detected} mắt
                </p>
              </div>
            </div>

            {/* Drowsiness meter */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-dim)", marginBottom: 6 }}>
                <span>Mức độ buồn ngủ</span>
                <span style={{ color: eyeInfo.drowsiness_score > 60 ? "#f38ba8" : eyeInfo.drowsiness_score > 30 ? "#f9e2af" : "#a6e3a1", fontWeight: 700 }}>
                  {eyeInfo.drowsiness_score}%
                </span>
              </div>
              <div className="progress-track" style={{ height: 8, background: "rgba(0,0,0,0.05)" }}>
                <div className="progress-fill" style={{
                  width: `${eyeInfo.drowsiness_score}%`,
                  borderRadius: 8,
                  background: eyeInfo.drowsiness_score > 60
                    ? "linear-gradient(90deg, #f9e2af, #f38ba8)"
                    : eyeInfo.drowsiness_score > 30
                    ? "#f9e2af"
                    : "#a6e3a1",
                }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Detection Analysis (Meta-signals) */}
      {eyeInfo && (
        <div className="glass-panel" style={{ marginBottom: 24, padding: "16px 20px" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "16px", color: "var(--text)" }}>📹 Phân tích Hành vi & Biểu cảm (15s)</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            
            {/* Phân tích độ tỉnh táo & Trạng thái mắt */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "var(--bg-secondary)", padding: 12, borderRadius: 8 }}>
              <span style={{ fontSize: "1.4rem" }}>👀</span>
              <div>
                <p style={{ fontWeight: 600, color: "var(--text-color)", margin: "0 0 4px 0", fontSize: "0.9rem" }}>Tình trạng mắt & Tỉnh táo</p>
                <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.85rem", lineHeight: 1.4 }}>
                  {eyeInfo.drowsiness_score > 40 
                    ? "Mắt lờ đờ, chớp mắt rất chậm hoặc nhắm liên tục (dấu hiệu kiệt sức/ngủ gật rõ rệt)." 
                    : eyeInfo.drowsiness_score > 15 
                      ? "Có hiện tượng chớp mắt chậm, tần suất nheo/nhắm mắt cao hơn bình thường (bắt đầu mệt mỏi)." 
                      : eyeInfo.blink_rate_per_min > 30
                        ? `Chớp mắt liên tục (${Math.round(eyeInfo.blink_rate_per_min)} lần/phút). Dấu hiệu của sự bồn chồn, căng thẳng hoặc mỏi mắt.`
                        : eyeInfo.is_squinting
                          ? "Mắt mở nhỏ, có hiện tượng nheo mắt liên tục."
                          : "Mắt mở to, chớp mắt đều đặn, duy trì độ tỉnh táo tốt."}
                  {eyeInfo.is_squinting && " Học sinh có biểu hiện nheo mắt nhiều, có thể do mỏi mắt, nhìn màn hình lâu hoặc đang gặp căng thẳng/khó chịu."}
                </p>
              </div>
            </div>

            {/* Phân tích Cơ mặt & Cảm xúc */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "var(--bg-secondary)", padding: 12, borderRadius: 8 }}>
              <span style={{ fontSize: "1.4rem" }}>🎭</span>
              <div>
                <p style={{ fontWeight: 600, color: "var(--text-color)", margin: "0 0 4px 0", fontSize: "0.9rem" }}>Động thái Cơ mặt</p>
                <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.85rem", lineHeight: 1.4 }}>
                  {eyeInfo.is_frowning 
                    ? "Phát hiện cơ mày nhíu lại nhiều lần. Đây thường là phản xạ vô thức khi đang gặp áp lực, căng thẳng, hoặc suy nghĩ quá mức." 
                    : "Cơ vùng trán và mày thư giãn, không có dấu hiệu nhíu mày hay gồng cứng."}
                  {eyeInfo.sustained_negative_2s 
                    ? " Đặc biệt: Biểu cảm buồn/căng thẳng xuất hiện liên tục và duy trì kéo dài (>2 giây), cho thấy đây không phải là biểu cảm thoáng qua mà là tâm trạng thực sự." 
                    : " Không phát hiện các cơn bùng phát cảm xúc tiêu cực kéo dài."}
                </p>
              </div>
            </div>

            {/* Chất lượng Dữ liệu */}
            {(eyeInfo.face_quality_low || eyeInfo.eye_quality_low) && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "rgba(243,139,168,0.1)", border: "1px solid #f38ba8", padding: 12, borderRadius: 8 }}>
                <span style={{ fontSize: "1.4rem" }}>⚠️</span>
                <div>
                  <p style={{ fontWeight: 600, color: "#f38ba8", margin: "0 0 4px 0", fontSize: "0.9rem" }}>Lưu ý về chất lượng Camera</p>
                  <p style={{ margin: 0, color: "var(--text-dim)", fontSize: "0.85rem", lineHeight: 1.4 }}>
                    Học sinh không nhìn thẳng, cúi gằm mặt hoặc camera bị che khuất trong phần lớn thời gian 15s. Một số phân tích hành vi phía trên có thể không phản ánh chính xác nhất.
                  </p>
                </div>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Emotion bars */}
      <div className="glass-panel" style={{ padding: "16px 20px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "16px", color: "var(--text)" }}>📊 Phân tích cảm xúc</h3>
        {sorted.map(([emotion, value]) => {
          const info = EMOTION_MAP[emotion];
          const pct = Math.round(value);
          return (
            <div key={emotion} className="emotion-row" style={{ marginBottom: 10 }}>
              <div className="emotion-header" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{info?.emoji} {info?.label}</span>
                <span className="emotion-pct" style={{ color: info?.color, fontWeight: 600, fontSize: "0.85rem" }}>{pct}%</span>
              </div>
              <div className="progress-track" style={{ height: 6, background: "rgba(0,0,0,0.05)" }}>
                <div
                  className="progress-fill"
                  style={{ width: `${pct}%`, background: info?.color, borderRadius: 6 }}
                />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
