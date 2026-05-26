import { useState, useEffect, useRef, useCallback } from "react";
import { toDateValue, startOfToday, addDays } from "../utils/date.js";
import { parseVoiceTodo } from "../utils/voice.js";

export default function Composer({ todos, editingId, onAdd, onUpdate, onCancelEdit }) {
  const [title, setTitle] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [priority, setPriority] = useState("normal");
  const [voiceStatus, setVoiceStatus] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const titleRef = useRef(null);
  const recognitionRef = useRef(null);
  const onAddRef = useRef(onAdd);

  useEffect(() => { onAddRef.current = onAdd; }, [onAdd]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setVoiceSupported(true);
    const r = new SR();
    r.lang = "ko-KR";
    r.interimResults = false;
    r.continuous = false;
    r.addEventListener("start", () => setIsListening(true));
    r.addEventListener("end", () => setIsListening(false));
    r.addEventListener("result", (e) => {
      const transcript = e.results[0][0].transcript.trim();
      const parsed = parseVoiceTodo(transcript);
      if (!parsed.title) {
        setVoiceStatus(`"${transcript}"에서 할 일을 찾지 못했습니다.`);
        return;
      }
      onAddRef.current(parsed);
      setVoiceStatus(`"${parsed.title}" 등록 완료`);
    });
    r.addEventListener("error", (e) => {
      const msgs = {
        "not-allowed": "마이크 권한이 허용되지 않았습니다.",
        "no-speech": "음성이 감지되지 않았습니다.",
        network: "음성 인식 네트워크 오류가 발생했습니다.",
      };
      setVoiceStatus(msgs[e.error] || "음성 인식을 시작하지 못했습니다.");
    });
    recognitionRef.current = r;
    return () => r.abort();
  }, []);

  useEffect(() => {
    if (!editingId) {
      resetForm();
      return;
    }
    const todo = todos.find((t) => t.id === editingId);
    if (!todo) return;
    setTitle(todo.title);
    if (todo.due) {
      const [d, t] = todo.due.split("T");
      setDateValue(d || "");
      setTimeValue(t || "");
    } else {
      setDateValue("");
      setTimeValue("");
    }
    setPriority(todo.priority || "normal");
    setVoiceStatus("수정할 내용을 바꾼 뒤 저장하세요.");
    setTimeout(() => titleRef.current?.focus(), 0);
  }, [editingId]);

  function resetForm() {
    setTitle("");
    setDateValue("");
    setTimeValue("");
    setPriority("normal");
    setVoiceStatus("");
  }

  function buildDue() {
    if (!dateValue) return "";
    return `${dateValue}T${timeValue || "09:00"}`;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    const payload = { title: trimmed, due: buildDue(), priority };
    if (editingId) {
      onUpdate(editingId, payload);
    } else {
      onAdd(payload);
      resetForm();
    }
    titleRef.current?.focus();
  }

  function handleQuickDate(value) {
    if (value === "clear") { setDateValue(""); setTimeValue(""); return; }
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (value === "tomorrow") d.setDate(d.getDate() + 1);
    if (value === "next-week") d.setDate(d.getDate() + 7);
    setDateValue(toDateValue(d));
    if (!timeValue) setTimeValue("09:00");
  }

  function handleVoice() {
    const r = recognitionRef.current;
    if (!r) return;
    if (isListening) { r.stop(); return; }
    setVoiceStatus("말씀하세요. 예: 내일 오후 3시 병원 예약 중요");
    try { r.start(); } catch {
      setVoiceStatus("음성 인식을 다시 시작하려면 잠시 후 눌러주세요.");
    }
  }

  const today = startOfToday();
  const sel = dateValue ? new Date(dateValue + "T00:00") : null;
  const diff = sel ? Math.round((sel - today) / 86400000) : null;
  const quickActive = {
    today: diff === 0, tomorrow: diff === 1, "next-week": diff === 7, clear: !dateValue,
  };
  const quickLabels = { today: "오늘", tomorrow: "내일", "next-week": "다음 주", clear: "없음" };

  return (
    <>
      <form className="composer" onSubmit={handleSubmit} autoComplete="off">
        <label className="field text-field">
          <span>할 일</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            type="text"
            placeholder="새 할 일을 입력하세요"
            maxLength={120}
            required
          />
        </label>
        <div className="field schedule-field">
          <span>마감</span>
          <div className="schedule-picker">
            <input
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              type="date"
              aria-label="마감 날짜"
            />
            <label className="time-control" title="마감 시간 설정">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="clock-icon">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 8v5l3 2" />
              </svg>
              <span className="visually-hidden">마감 시간</span>
              <input
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                type="time"
                aria-label="마감 시간"
              />
            </label>
          </div>
          <div className="quick-dates" aria-label="빠른 날짜 선택">
            {["today", "tomorrow", "next-week", "clear"].map((v) => (
              <button
                key={v}
                type="button"
                className={quickActive[v] ? "active" : ""}
                onClick={() => handleQuickDate(v)}
              >
                {quickLabels[v]}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>우선순위</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="normal">● 보통</option>
            <option value="high">▲ 높음</option>
            <option value="low">▼ 낮음</option>
          </select>
        </label>
        <div className="voice-wrap">
          <button
            type="button"
            className={`voice-button${isListening ? " listening" : ""}`}
            onClick={handleVoice}
            disabled={!voiceSupported}
            aria-label={isListening ? "음성 인식 중지" : "음성으로 일정 등록"}
            aria-pressed={isListening}
            title="음성으로 일정 등록: 내일 오후 3시 병원 예약 중요"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="mic-icon">
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
              <path d="M19 11a7 7 0 0 1-14 0" />
              <path d="M12 18v3" />
              <path d="M8 21h8" />
            </svg>
            <span className="visually-hidden">음성으로 일정 등록</span>
          </button>
        </div>
        <button className="primary-button" type="submit">
          {editingId ? "저장" : "추가"}
        </button>
        {editingId && (
          <button type="button" className="ghost-button cancel-edit" onClick={onCancelEdit}>
            취소
          </button>
        )}
      </form>
      <p className="voice-status" aria-live="polite">{voiceStatus}</p>
    </>
  );
}
