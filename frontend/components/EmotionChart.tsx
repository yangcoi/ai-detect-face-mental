"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from "recharts";

interface HistoryItem {
  created_at: string;
  happy: number;
  sad: number;
  neutral: number;
  angry: number;
  fear: number;
  risk_score: number;
}

interface Props {
  history: HistoryItem[];
}

const fmt = (dt: string) => {
  const d = new Date(dt);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export function EmotionTrendChart({ history }: Props) {
  const data = [...history].reverse().map(h => ({
    date: fmt(h.created_at),
    "Vui vẻ": Math.round(h.happy),
    "Buồn": Math.round(h.sad),
    "Tức giận": Math.round(h.angry),
    "Lo sợ": Math.round(h.fear),
    "Risk": Math.round(h.risk_score),
  }));

  return (
    <div>
      <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginBottom: 12 }}>
        Xu hướng cảm xúc 7 ngày gần nhất
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <defs>
            <linearGradient id="gHappy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a6e3a1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#a6e3a1" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gSad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#89b4fa" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#89b4fa" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gAngry" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f38ba8" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f38ba8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
          <XAxis dataKey="date" tick={{ fill: "#6c7086", fontSize: 11 }} />
          <YAxis tick={{ fill: "#6c7086", fontSize: 11 }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: "#1e1e2e", border: "1px solid #45475a", borderRadius: 8 }}
            labelStyle={{ color: "#cdd6f4" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#a6adc8" }} />
          <Area type="monotone" dataKey="Vui vẻ" stroke="#a6e3a1" fill="url(#gHappy)" strokeWidth={2} dot={{ r: 3 }} />
          <Area type="monotone" dataKey="Buồn" stroke="#89b4fa" fill="url(#gSad)" strokeWidth={2} dot={{ r: 3 }} />
          <Area type="monotone" dataKey="Tức giận" stroke="#f38ba8" fill="url(#gAngry)" strokeWidth={2} dot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RiskTrendChart({ history }: Props) {
  const data = [...history].reverse().map(h => ({
    date: fmt(h.created_at),
    "Risk Score": Math.round(h.risk_score),
  }));

  return (
    <div>
      <p style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginBottom: 12 }}>
        Chỉ số nguy cơ theo ngày (0 = tốt, 100 = nguy hiểm)
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
          <defs>
            <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f38ba8" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#f38ba8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
          <XAxis dataKey="date" tick={{ fill: "#6c7086", fontSize: 11 }} />
          <YAxis tick={{ fill: "#6c7086", fontSize: 11 }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{ background: "#1e1e2e", border: "1px solid #45475a", borderRadius: 8 }}
            labelStyle={{ color: "#cdd6f4" }}
          />
          <Area type="monotone" dataKey="Risk Score" stroke="#f38ba8" fill="url(#gRisk)" strokeWidth={2} dot={{ r: 3 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
