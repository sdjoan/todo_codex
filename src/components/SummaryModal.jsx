import { useState, useEffect } from "react";
import { callClaude } from "../utils/ai.js";
import { dueLabel } from "../utils/date.js";
import { priorityLabel } from "../utils/helpers.js";

export default function SummaryModal({ open, todos, onClose }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    if (todos.length === 0) {
      setStatus("error");
      setErrorMsg("요약할 할 일이 없습니다.");
      return;
    }
    setStatus("loading");
    setData(null);

    const listText = todos
      .map(
        (t) =>
          `- [${t.completed ? "완료" : "미완료"}] ${t.title}${t.due ? ` (마감: ${dueLabel(t.due)})` : ""} [${priorityLabel(t.priority)}]`,
      )
      .join("\n");

    callClaude(
      [
        {
          role: "user",
          content: `다음 할 일 목록을 분석해서 JSON으로 답해줘. 다른 말 없이 JSON만.\n형식: {"overview":"전체 상황 한 문장","focus":["집중1","집중2"],"tip":"조언"}\n\n${listText}`,
        },
      ],
      500,
    )
      .then((text) => {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("파싱 실패");
        setData(JSON.parse(match[0]));
        setStatus("done");
      })
      .catch((err) => {
        setErrorMsg(err.message || "AI 요약에 실패했습니다.");
        setStatus("error");
      });
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="summary-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summaryModalTitle"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="summary-modal-box">
        <div className="summary-modal-header">
          <span id="summaryModalTitle">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </svg>
            AI 요약
          </span>
          <button className="icon-button" type="button" aria-label="닫기" onClick={onClose}>×</button>
        </div>

        {status === "loading" && (
          <div className="summary-loading"><div className="spin" />분석 중...</div>
        )}
        {status === "error" && (
          <p className="summary-error">{errorMsg}</p>
        )}
        {status === "done" && data && (
          <div className="summary-modal-body-inner">
            <div className="summary-section">
              <div className="summary-section-label">전체 상황</div>
              <div className="summary-overview">{data.overview}</div>
            </div>
            {data.focus?.length > 0 && (
              <div className="summary-section">
                <div className="summary-section-label">오늘 집중</div>
                <ul className="summary-focus-list">
                  {data.focus.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {data.tip && (
              <div className="summary-section">
                <div className="summary-section-label">조언</div>
                <p className="summary-tip">{data.tip}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
