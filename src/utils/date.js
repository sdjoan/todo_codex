export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toTimeValue(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function toDateTimeLocalValue(date) {
  return `${toDateValue(date)}T${toTimeValue(date)}`;
}

export function parseDueDate(due) {
  if (!due) return null;
  const normalized = due.includes("T") ? due : `${due}T00:00`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dueStatus(due) {
  if (!due) return "";
  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  const dueDate = parseDueDate(due);
  if (!dueDate) return "";
  if (dueDate < new Date()) return "overdue";
  if (dueDate >= today && dueDate < tomorrow) return "today";
  return "";
}

export function dueLabel(due) {
  if (!due) return "";
  const status = dueStatus(due);
  const dueDate = parseDueDate(due);
  if (!dueDate) return "";
  const formatted = new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dueDate);
  if (status === "today") return `${formatted} 오늘`;
  if (status === "overdue") return `${formatted} 지남`;
  return formatted;
}

export function parseSpokenNumber(value) {
  if (/^\d+$/.test(value)) return Number(value);
  const normalized = value.replace(/\s/g, "");
  const map = {
    영: 0, 공: 0, 한: 1, 하나: 1, 일: 1, 두: 2, 둘: 2, 이: 2, 세: 3, 셋: 3, 삼: 3,
    네: 4, 넷: 4, 사: 4, 다섯: 5, 오: 5, 여섯: 6, 육: 6, 일곱: 7, 칠: 7, 여덟: 8,
    팔: 8, 아홉: 9, 구: 9, 열: 10, 십: 10, 열한: 11, 열하나: 11, 십일: 11,
    열두: 12, 열둘: 12, 십이: 12,
  };
  if (map[normalized] !== undefined) return map[normalized];
  const tenMatch = normalized.match(/^(십|열)([일이삼사오육칠팔구])$/);
  if (tenMatch) return 10 + map[tenMatch[2]];
  return null;
}

export function parseSpokenTime(text) {
  const m = text.match(
    /(오전|오후|아침|저녁|밤|낮|새벽)?\s*(\d{1,2}|[가-힣]+)\s*시(?:\s*(\d{1,2}|[가-힣]+)\s*분)?/,
  );
  if (!m) return null;
  let hours = parseSpokenNumber(m[2]);
  const minutes = m[3] ? parseSpokenNumber(m[3]) : 0;
  if (hours === null || minutes === null) return null;
  const period = m[1] || "";
  if (/(오후|저녁|밤)/.test(period) && hours < 12) hours += 12;
  if (/(오전|아침|새벽)/.test(period) && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

export function parseSpokenDate(text) {
  const now = new Date();
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);

  if (/오늘/.test(text)) return date;
  if (/내일/.test(text)) return addDays(date, 1);
  if (/모레/.test(text)) return addDays(date, 2);

  const mdMatch = text.match(/(\d{1,2}|[가-힣]+)\s*월\s*(\d{1,2}|[가-힣]+)\s*일/);
  if (mdMatch) {
    const month = parseSpokenNumber(mdMatch[1]);
    const day = parseSpokenNumber(mdMatch[2]);
    if (month && day) {
      const target = new Date(now.getFullYear(), month - 1, day);
      if (target < date) target.setFullYear(now.getFullYear() + 1);
      return target;
    }
  }

  const wdMatch = text.match(/(이번\s*주|다음\s*주)?\s*([월화수목금토일])요일/);
  if (wdMatch) {
    const map = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 };
    const targetDay = map[wdMatch[2]];
    const qualifier = wdMatch[1] || "";
    let diff = targetDay - date.getDay();
    if (/다음/.test(qualifier)) {
      const cur = (date.getDay() + 6) % 7;
      const tgt = (targetDay + 6) % 7;
      return addDays(date, 7 - cur + tgt);
    }
    if (!/이번/.test(qualifier) && diff <= 0) diff += 7;
    else if (/이번/.test(qualifier) && diff < 0) diff += 7;
    return addDays(date, diff);
  }

  return null;
}

export function parseSpokenDue(text) {
  const date = parseSpokenDate(text);
  const time = parseSpokenTime(text);
  if (!date && !time) return "";
  const due = date || new Date();
  due.setHours(time?.hours ?? 9, time?.minutes ?? 0, 0, 0);
  return toDateTimeLocalValue(due);
}
