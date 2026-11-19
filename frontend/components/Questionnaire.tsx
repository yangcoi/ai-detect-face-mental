"use client";
import React from "react";

export type QuestionOption = {
  label: string;
  weight: number;
  value?: number;
};

export type Question = {
  id: number;
  title: string;
  type: "slider" | "radio" | "percentage";
  options: QuestionOption[];
  topic_name: string;
};

export type Answer = {
  question_id: number;
  value: string;
  weight: number;
  is_sensitive: string;
  dwell_time: number;
};

interface Props {
  questions: Question[];
  answers: Record<number, Answer>;
  onChange: (questionId: number, option: QuestionOption, dwellTime: number, isSensitive: string) => void;
}

export default function Questionnaire({ questions, answers, onChange }: Props) {
  // Track mount time for each question to calculate dwell time
  const questionMountTimes = React.useRef<Record<number, number>>({});

  React.useEffect(() => {
    questions.forEach(q => {
      if (!questionMountTimes.current[q.id]) {
        questionMountTimes.current[q.id] = performance.now();
      }
    });
  }, [questions]);
  if (questions.length === 0) {
    return <p style={{ textAlign: "center", color: "var(--text-dim)" }}>Đang tải bộ câu hỏi...</p>;
  }

  return (
    <div className="card questionnaire" style={{ padding: 0, background: "transparent", boxShadow: "none" }}>
      {questions.map((q, index) => {
        const currentAnswer = answers[q.id];
        const isSlider = q.type === "slider";

        return (
          <div key={q.id} className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "0.75rem", color: "var(--primary-color)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Chủ đề: {q.topic_name}
            </div>
            <label className="question-label" style={{ marginBottom: 12 }}>
              {index + 1}. {q.title}
            </label>

            {q.type === "percentage" ? (
              <div className="question-item">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={currentAnswer ? Number(currentAnswer.value.replace('%', '')) : 50}
                  onChange={e => {
                    const val = Number(e.target.value);
                    const w1 = q.options[0].weight;
                    const v1 = q.options[0].value || 0;
                    const w2 = q.options[1].weight;
                    const v2 = q.options[1].value || 100;
                    
                    const weight = w1 + (w2 - w1) * ((val - v1) / (v2 - v1));
                    
                    const opt: QuestionOption = {
                      label: `${val}%`,
                      weight: weight,
                      value: val
                    };
                    const dwellTime = performance.now() - (questionMountTimes.current[q.id] || performance.now());
                    onChange(q.id, opt, dwellTime, (q as any).is_sensitive || 'none');
                  }}
                  className={`slider ${!currentAnswer ? 'unanswered' : ''}`}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{q.options[0].label}</span>
                  <span style={{ fontSize: "0.9rem", color: currentAnswer ? "var(--primary-color)" : "var(--text-dim)", fontWeight: currentAnswer ? "bold" : "normal" }}>
                    {currentAnswer ? currentAnswer.value : "Kéo để chọn"}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{q.options[1].label}</span>
                </div>
              </div>
            ) : isSlider ? (
              <div className="question-item">
                <input
                  type="range"
                  min={1}
                  max={q.options.length}
                  value={currentAnswer ? q.options.findIndex(o => o.label === currentAnswer.value) + 1 : 0}
                  onChange={e => {
                    const opt = q.options[Number(e.target.value) - 1];
                    const dwellTime = performance.now() - (questionMountTimes.current[q.id] || performance.now());
                    onChange(q.id, opt, dwellTime, (q as any).is_sensitive || 'none');
                  }}
                  className={`slider ${!currentAnswer ? 'unanswered' : ''}`}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{q.options[0].label}</span>
                  <span style={{ fontSize: "0.9rem", color: currentAnswer ? "var(--primary-color)" : "var(--text-dim)", fontWeight: currentAnswer ? "bold" : "normal" }}>
                    {currentAnswer ? currentAnswer.value : "Chưa chọn"}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{q.options[q.options.length - 1].label}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {q.options.map((opt, i) => {
                  const isSelected = currentAnswer?.value === opt.label;
                  return (
                    <label
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        background: isSelected ? "var(--primary-light)" : "var(--bg-secondary)",
                        border: `1.5px solid ${isSelected ? "var(--primary-color)" : "transparent"}`,
                        borderRadius: 12,
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={opt.label}
                        checked={isSelected}
                        onChange={() => {
                          const dwellTime = performance.now() - (questionMountTimes.current[q.id] || performance.now());
                          onChange(q.id, opt, dwellTime, (q as any).is_sensitive || 'none');
                        }}
                        style={{ margin: 0, width: 18, height: 18, accentColor: "var(--primary-color)" }}
                      />
                      <span style={{ fontSize: "0.95rem", color: isSelected ? "var(--primary-dark)" : "var(--text-color)", fontWeight: isSelected ? 600 : 400 }}>
                        {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
