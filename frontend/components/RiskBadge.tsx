"use client";

const RISK_CONFIG = {
  normal:   { label: "Bình thường", color: "#a6e3a1", bg: "rgba(166,227,161,0.12)", icon: "🟢" },
  warning:  { label: "Cần chú ý",   color: "#f9e2af", bg: "rgba(249,226,175,0.12)", icon: "🟡" },
  critical: { label: "Cần can thiệp", color: "#f38ba8", bg: "rgba(243,139,168,0.12)", icon: "🔴" },
};

interface Props {
  level: "normal" | "warning" | "critical";
  score?: number;
  size?: "sm" | "md" | "lg";
}

export default function RiskBadge({ level, score, size = "md" }: Props) {
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.normal;
  const padding = size === "sm" ? "4px 10px" : size === "lg" ? "10px 20px" : "6px 14px";
  const fontSize = size === "sm" ? "0.72rem" : size === "lg" ? "1rem" : "0.82rem";

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding,
      background: cfg.bg,
      border: `1px solid ${cfg.color}`,
      borderRadius: "999px",
      color: cfg.color,
      fontWeight: 600,
      fontSize,
      whiteSpace: "nowrap",
    }}>
      {cfg.icon} {cfg.label}
      {score !== undefined && (
        <span style={{ opacity: 0.7, fontWeight: 400 }}>({score})</span>
      )}
    </span>
  );
}
