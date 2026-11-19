"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { getToken, getUser, clearAuth } from "@/lib/auth";
import RiskBadge from "@/components/RiskBadge";

const API = "http://localhost:8000";

export default function AdminPage() {
  const router = useRouter();
  const user = typeof window !== "undefined" ? getUser() : null;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"checked" | "not_checked">("checked");

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setData(res.data);
      setLastUpdated(new Date());
    } catch {
      clearAuth();
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getToken() || getUser()?.role !== "admin") {
      router.push("/login");
      return;
    }
    fetchDashboard();
    // Realtime: tự động refresh mỗi 30 giây
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard, router]);

  const handleLogout = () => { clearAuth(); router.push("/login"); };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/admin/export`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Mental_Checkins_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("❌ Lỗi xuất báo cáo Excel");
    }
  };

  const RISK_COLOR: Record<string, string> = {
    normal: "#a6e3a1", warning: "#f9e2af", critical: "#f38ba8"
  };

  if (loading) return (
    <main className="main" style={{ justifyContent: "center" }}>
      <p style={{ color: "var(--text-dim)" }}>⏳ Đang tải dashboard...</p>
    </main>
  );

  return (
    <main className="main admin-main">
      {/* Navbar */}
      <nav className="admin-nav" style={{ 
        background: "rgba(255, 255, 255, 0.6)", 
        backdropFilter: "blur(12px)", 
        borderBottom: "1px solid rgba(255, 255, 255, 0.8)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
      }}>
        <div className="admin-nav-left">
          <span className="logo" style={{ fontSize: "1.2rem", margin: 0 }}>🧠 Mental Check-in</span>
          <span className="admin-badge">Admin Panel</span>
        </div>
        <div className="admin-nav-right" style={{ gap: "20px" }}>
          {lastUpdated && (
            <span className="realtime-dot" style={{ background: "rgba(64, 160, 43, 0.1)", padding: "4px 10px", borderRadius: "20px", display: "flex", alignItems: "center", gap: 6 }} title={`Cập nhật lúc ${lastUpdated.toLocaleTimeString("vi-VN")}`}>
              🟢 Live
            </span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10, borderLeft: "1px solid var(--border)", paddingLeft: 20 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: "bold", fontSize: "0.9rem"
            }}>
              {user?.full_name?.charAt(0) || "A"}
            </div>
            <span style={{ color: "var(--text)", fontSize: "0.9rem", fontWeight: 600 }}>
              {user?.full_name}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-logout" style={{ marginLeft: 8 }}>
            Đăng xuất ⎋
          </button>
        </div>
      </nav>

      <div className="admin-content">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-number">{data?.total_students}</span>
            <span className="stat-label">Tổng học sinh</span>
          </div>
          <div className="stat-card stat-green">
            <span className="stat-number">{data?.checked_in_count}</span>
            <span className="stat-label">Đã check-in</span>
          </div>
          <div className="stat-card stat-yellow">
            <span className="stat-number">{data?.not_checked_count}</span>
            <span className="stat-label">Chưa check-in</span>
          </div>
          <div className="stat-card stat-red">
            <span className="stat-number">{data?.risk_counts?.critical || 0}</span>
            <span className="stat-label">Cần can thiệp</span>
          </div>
        </div>

        {/* Tabs and Export */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="tab-bar" style={{ marginBottom: 0 }}>
            <button
              className={`tab-btn ${activeTab === "checked" ? "active" : ""}`}
              onClick={() => setActiveTab("checked")}
            >
              ✅ Đã check-in ({data?.checked_in_count})
            </button>
            <button
              className={`tab-btn ${activeTab === "not_checked" ? "active" : ""}`}
              onClick={() => setActiveTab("not_checked")}
            >
              ⚠️ Chưa check-in ({data?.not_checked_count})
            </button>
          </div>
          <button onClick={handleExport} className="btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 6 }}>
            <span>📥</span> Xuất Excel
          </button>
        </div>

        {/* Danh sách đã check-in */}
        {activeTab === "checked" && (
          <div className="student-list">
            {data?.today_checkins?.length === 0 && (
              <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "40px" }}>
                Chưa có học sinh nào check-in hôm nay
              </p>
            )}
            {data?.today_checkins?.map((c: any) => (
              <div
                key={c.checkin_id}
                className="student-row"
                onClick={() => router.push(`/admin/student/${c.user_id}`)}
                style={{ borderLeft: `3px solid ${RISK_COLOR[c.risk_level]}` }}
              >
                <div className="student-row-left">
                  <div className="student-avatar">
                    {c.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="student-name">{c.full_name}</p>
                    <p className="student-meta">{c.class_name} · {new Date(c.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div className="student-row-right">
                  <span className="emotion-tag">{EMOTION_EMOJI[c.dominant]} {c.dominant}</span>
                  <RiskBadge level={c.risk_level} score={c.risk_score} size="sm" />
                  <span className="chevron">→</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Danh sách chưa check-in */}
        {activeTab === "not_checked" && (
          <div className="student-list">
            {data?.not_checked_students?.length === 0 && (
              <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "40px" }}>
                🎉 Tất cả học sinh đã check-in hôm nay!
              </p>
            )}
            {data?.not_checked_students?.map((s: any) => (
              <div key={s.id} className="student-row" style={{ borderLeft: "3px solid #f9e2af", opacity: 0.8 }}>
                <div className="student-row-left">
                  <div className="student-avatar" style={{ background: "#313244" }}>
                    {s.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="student-name">{s.full_name}</p>
                    <p className="student-meta">{s.class_name} · Chưa check-in</p>
                  </div>
                </div>
                <div className="student-row-right">
                  <span style={{ color: "#f9e2af", fontSize: "0.8rem" }}>⚠️ Chưa check-in</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const EMOTION_EMOJI: Record<string, string> = {
  happy: "😊", sad: "😔", neutral: "😐",
  angry: "😡", fear: "😨", surprise: "😲", disgust: "🤢",
};
