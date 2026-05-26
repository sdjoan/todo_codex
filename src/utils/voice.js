import { parseSpokenDue } from "./date.js";

export function parseVoiceTodo(transcript) {
  const text = transcript.replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
  return {
    title: cleanupVoiceTitle(text),
    due: parseSpokenDue(text),
    priority: parseSpokenPriority(text),
  };
}

function cleanupVoiceTitle(text) {
  const patterns = [
    /^(할 일|투두|일정|스케줄)\s*(등록|추가|만들어|잡아|해줘|해 줘)?\s*/i,
    /(오늘|내일|모레)/g,
    /(이번\s*주|다음\s*주)?\s*[월화수목금토일]요일/g,
    /(\d{1,2}|[가-힣]+)\s*월\s*(\d{1,2}|[가-힣]+)\s*일/g,
    /(오전|오후|아침|저녁|밤|낮|새벽)?\s*(\d{1,2}|[가-힣]+)\s*시(\s*(\d{1,2}|[가-힣]+)\s*분)?/g,
    /(중요|급해|급한|높은\s*우선순위|우선순위\s*높게|낮은\s*우선순위|우선순위\s*낮게|천천히|나중에)/g,
    /(등록해줘|등록해 줘|추가해줘|추가해 줘|알려줘|알려 줘)$/g,
  ];
  return patterns
    .reduce((t, p) => t.replace(p, " "), text)
    .replace(/\s+/g, " ")
    .trim();
}

function parseSpokenPriority(text) {
  if (/(중요|급해|급한|높은\s*우선순위|우선순위\s*높게|최우선)/.test(text)) return "high";
  if (/(낮은\s*우선순위|우선순위\s*낮게|천천히|나중에)/.test(text)) return "low";
  return "normal";
}
