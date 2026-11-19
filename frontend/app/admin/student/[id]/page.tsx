"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { getToken, clearAuth } from "@/lib/auth";
import RiskBadge from "@/components/RiskBadge";
import { EmotionTrendChart, RiskTrendChart } from "@/components/EmotionChart";

const API = "http://localhost:8000";

const EMOTION_MAP: Record<string, { emoji: string; label: string; color: string }> = {
  happy:    { emoji: "😊", label: "Vui vẻ",      color: "#a6e3a1" },
  sad:      { emoji: "😔", label: "Buồn",         color: "#89b4fa" },
  neutral:  { emoji: "😐", label: "Bình thường",  color: "#cdd6f4" },
  angry:    { emoji: "😡", label: "Tức giận",     color: "#f38ba8" },
  fear:     { emoji: "😨", label: "Lo sợ",        color: "#cba6f7" },
  surprise: { emoji: "😲", label: "Ngạc nhiên",   color: "#fab387" },
  disgust:  { emoji: "🤢", label: "Khó chịu",     color: "#94e2d5" },
};

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { router.push("/login"); return; }
    axios.get(`${API}/admin/student/${userId}/history`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(res => setData(res.data))
      .catch(() => { clearAuth(); router.push("/login"); })
      .finally(() => setLoading(false));
  }, [userId, router]);

  if (loading) return (
    <main className="main" style={{ justifyContent: "center" }}>
      <p style={{ color: "var(--text-dim)" }}>⏳ Đang tải...</p>
    </main>
  );

  const student = data?.student;
  const history = data?.history || [];
  const latest = history[0];

  return (
    <main className="main admin-main">
      {/* Navbar */}
      <nav className="admin-nav">
        <button onClick={() => router.back()} className="btn-secondary" style={{ padding: "6px 14px", fontSize: "0.82rem" }}>
          ← Quay lại
        </button>
        <span className="logo" style={{ fontSize: "1rem" }}>🧠 Chi tiết học sinh</span>
        <div />
      </nav>

      <div className="admin-content">
        {/* Student hero */}
        <div className="card student-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="student-avatar-lg">{student?.full_name?.charAt(0)}</div>
            <div>
              <h2 style={{ margin: 0, color: "var(--text)" }}>{student?.full_name}</h2>
              <p style={{ color: "var(--text-dim)", margin: "4px 0 8px" }}>
                {student?.class_name} · @{student?.username}
              </p>
              {latest ? (
                <RiskBadge level={latest.risk_level} score={latest.risk_score} size="md" />
              ) : (
                <span style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>Chưa có dữ liệu</span>
              )}
            </div>
          </div>
        </div>

        {/* Check-in hôm nay */}
        {latest && (
          <div className="card">
            <h3 className="card-title">📊 Check-in gần nhất</h3>
            <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginBottom: 16 }}>
              {new Date(latest.created_at).toLocaleString("vi-VN")}
            </p>
            {Object.entries({
              happy: latest.happy, sad: latest.sad, neutral: latest.neutral,
              angry: latest.angry, fear: latest.fear
            }).sort(([,a], [,b]) => (b as number) - (a as number)).map(([emotion, value]) => {
              const info = EMOTION_MAP[emotion];
              const pct = Math.round(value as number);
              return (
                <div key={emotion} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 4 }}>
                    <span>{info?.emoji} {info?.label}</span>
                    <span style={{ color: info?.color, fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: info?.color }} />
                  </div>
                </div>
              );
            })}
            {latest.answers && latest.answers.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ fontSize: "0.9rem", color: "var(--text)", marginBottom: 12 }}>Chi tiết câu trả lời</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {latest.answers.map((a: any, i: number) => (
                    <div key={i} style={{ background: "var(--bg-secondary)", padding: 12, borderRadius: 8 }}>
                      <p style={{ fontSize: "0.85rem", color: "var(--text)", marginBottom: 4 }}>{i+1}. {a.question}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--primary-color)", fontWeight: 600 }}>{a.answer}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Risk: +{a.weight}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Charts */}
        {history.length > 1 && (
          <>
            <div className="card">
              <h3 className="card-title">📈 Xu hướng cảm xúc</h3>
              <EmotionTrendChart history={history} />
            </div>
            <div className="card">
              <h3 className="card-title">⚠️ Chỉ số nguy cơ</h3>
              <RiskTrendChart history={history} />
            </div>
          </>
        )}

        {history.length === 0 && (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <p style={{ color: "var(--text-dim)" }}>Học sinh này chưa có lịch sử check-in</p>
          </div>
        )}
      </div>
    </main>
  );
}
