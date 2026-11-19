"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { saveAuth } from "@/lib/auth";

const API = "http://localhost:8000";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      const { access_token, user } = res.data;
      saveAuth(access_token, user);
      if (user.role === "admin") router.push("/admin");
      else router.push("/checkin");
    } catch {
      setError("Sai tên đăng nhập hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-main">
      <div className="login-card">
        {/* Logo */}
        <div className="login-header">
          <span className="login-logo">🧠</span>
          <h1 className="login-title">Mental Check-in</h1>
          <p className="login-sub">Hệ thống theo dõi sức khỏe tinh thần học sinh</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label className="form-label">Tên đăng nhập</label>
            <input
              type="text"
              className="form-input"
              placeholder="admin / hs001 / hs002..."
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="error-msg">{error}</p>}

          <div className="form-group" style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginTop: "12px", marginBottom: "16px" }}>
            <input 
              type="checkbox" 
              id="consent" 
              checked={consent} 
              onChange={e => setConsent(e.target.checked)} 
              style={{ marginTop: "4px", accentColor: "var(--primary-color)", width: "16px", height: "16px" }}
            />
            <label htmlFor="consent" style={{ fontSize: "0.85rem", color: "var(--text-dim)", lineHeight: "1.4", cursor: "pointer" }}>
              Hệ thống sử dụng AI xử lý hình ảnh trực tiếp trên thiết bị của bạn để đo lường cảm xúc. <strong>Không có bất kỳ hình ảnh hay video nào được lưu trữ hay truyền ra ngoài.</strong>
            </label>
          </div>

          <button type="submit" disabled={loading || !consent} className="btn-primary btn-full">
            {loading ? "⏳ Đang đăng nhập..." : "Đăng nhập →"}
          </button>
        </form>

        {/* Demo hint */}
        <div className="login-hint">
          <p>👩‍🏫 Admin: <code>admin / admin123</code></p>
          <p>🎓 Học sinh: <code>hs001 / pass123</code></p>
        </div>
      </div>
    </main>
  );
}
