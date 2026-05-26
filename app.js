const STORAGE_KEY = "todo_0526_items";

const form = document.querySelector("#todoForm");
const input = document.querySelector("#todoInput");
const dueInput = document.querySelector("#dueInput");
const priorityInput = document.querySelector("#priorityInput");
const voiceButton = document.querySelector("#voiceButton");
const voiceStatus = document.querySelector("#voiceStatus");
const searchInput = document.querySelector("#searchInput");
const list = document.querySelector("#todoList");
const template = document.querySelector("#todoTemplate");
const totalCount = document.querySelector("#totalCount");
const doneCount = document.querySelector("#doneCount");
const remainingCount = document.querySelector("#remainingCount");
const clearCompleted = document.querySelector("#clearCompleted");
const filterButtons = document.querySelectorAll(".filter");

let todos = loadTodos();
let currentFilter = "all";
let searchTerm = "";
let recognition = null;
let isListening = false;

setupVoiceInput();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = input.value.trim();
  if (!title) return;

  addTodo({
    title,
    due: dueInput.value,
    priority: priorityInput.value,
  });

  form.reset();
  priorityInput.value = "normal";
  input.focus();
});

searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  render();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    render();
  });
});

clearCompleted.addEventListener("click", () => {
  todos = todos.filter((todo) => !todo.completed);
  saveAndRender();
});

function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceButton.disabled = true;
    voiceStatus.textContent = "이 브라우저는 음성 등록을 지원하지 않습니다.";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "ko-KR";
  recognition.interimResults = false;
  recognition.continuous = false;

  voiceButton.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
      return;
    }

    voiceStatus.textContent = "말씀하세요. 예: 내일 오후 3시 병원 예약 중요";
    try {
      recognition.start();
    } catch {
      voiceStatus.textContent = "음성 인식을 다시 시작하려면 잠시 후 눌러주세요.";
    }
  });

  recognition.addEventListener("start", () => {
    isListening = true;
    voiceButton.classList.add("listening");
    voiceButton.setAttribute("aria-pressed", "true");
    voiceButton.textContent = "중지";
  });

  recognition.addEventListener("end", () => {
    isListening = false;
    voiceButton.classList.remove("listening");
    voiceButton.setAttribute("aria-pressed", "false");
    voiceButton.textContent = "녹음";
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript.trim();
    const parsed = parseVoiceTodo(transcript);

    if (!parsed.title) {
      voiceStatus.textContent = `"${transcript}"에서 할 일을 찾지 못했습니다.`;
      return;
    }

    addTodo(parsed);
    voiceStatus.textContent = `"${parsed.title}" 등록 완료`;
  });

  recognition.addEventListener("error", (event) => {
    const messages = {
      "not-allowed": "마이크 권한이 허용되지 않았습니다.",
      "no-speech": "음성이 감지되지 않았습니다.",
      network: "음성 인식 네트워크 오류가 발생했습니다.",
    };
    voiceStatus.textContent = messages[event.error] || "음성 인식을 시작하지 못했습니다.";
  });
}

function addTodo({ title, due = "", priority = "normal" }) {
  todos.unshift({
    id: crypto.randomUUID(),
    title,
    due,
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
  });
  saveAndRender();
}

function parseVoiceTodo(transcript) {
  const text = transcript.replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
  return {
    title: cleanupVoiceTitle(text),
    due: parseSpokenDue(text),
    priority: parseSpokenPriority(text),
  };
}

function cleanupVoiceTitle(text) {
  const cleanupPatterns = [
    /^(할 일|투두|일정|스케줄)\s*(등록|추가|만들어|잡아|해줘|해 줘)?\s*/i,
    /(오늘|내일|모레)/g,
    /(이번\s*주|다음\s*주)?\s*[월화수목금토일]요일/g,
    /(\d{1,2}|[가-힣]+)\s*월\s*(\d{1,2}|[가-힣]+)\s*일/g,
    /(오전|오후|아침|저녁|밤|낮|새벽)?\s*(\d{1,2}|[가-힣]+)\s*시(\s*(\d{1,2}|[가-힣]+)\s*분)?/g,
    /(중요|급해|급한|높은\s*우선순위|우선순위\s*높게|낮은\s*우선순위|우선순위\s*낮게|천천히|나중에)/g,
    /(등록해줘|등록해 줘|추가해줘|추가해 줘|알려줘|알려 줘)$/g,
  ];

  return cleanupPatterns
    .reduce((title, pattern) => title.replace(pattern, " "), text)
    .replace(/\s+/g, " ")
    .trim();
}

function parseSpokenPriority(text) {
  if (/(중요|급해|급한|높은\s*우선순위|우선순위\s*높게|최우선)/.test(text)) {
    return "high";
  }

  if (/(낮은\s*우선순위|우선순위\s*낮게|천천히|나중에)/.test(text)) {
    return "low";
  }

  return "normal";
}

function parseSpokenDue(text) {
  const date = parseSpokenDate(text);
  const time = parseSpokenTime(text);

  if (!date && !time) return "";

  const due = date || new Date();
  due.setHours(time?.hours ?? 9, time?.minutes ?? 0, 0, 0);

  return toDateTimeLocalValue(due);
}

function parseSpokenDate(text) {
  const now = new Date();
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);

  if (/오늘/.test(text)) return date;
  if (/내일/.test(text)) return addDays(date, 1);
  if (/모레/.test(text)) return addDays(date, 2);

  const monthDayMatch = text.match(/(\d{1,2}|[가-힣]+)\s*월\s*(\d{1,2}|[가-힣]+)\s*일/);
  if (monthDayMatch) {
    const month = parseSpokenNumber(monthDayMatch[1]);
    const day = parseSpokenNumber(monthDayMatch[2]);

    if (month && day) {
      const target = new Date(now.getFullYear(), month - 1, day);
      if (target < date) target.setFullYear(now.getFullYear() + 1);
      return target;
    }
  }

  const weekdayMatch = text.match(/(이번\s*주|다음\s*주)?\s*([월화수목금토일])요일/);
  if (weekdayMatch) {
    return parseSpokenWeekday(date, weekdayMatch[1] || "", weekdayMatch[2]);
  }

  return null;
}

function parseSpokenWeekday(today, qualifier, weekday) {
  const weekdayMap = {
    일: 0,
    월: 1,
    화: 2,
    수: 3,
    목: 4,
    금: 5,
    토: 6,
  };
  const targetDay = weekdayMap[weekday];
  let diff = targetDay - today.getDay();

  if (/다음/.test(qualifier)) {
    const currentMondayBasedDay = (today.getDay() + 6) % 7;
    const targetMondayBasedDay = (targetDay + 6) % 7;
    return addDays(today, 7 - currentMondayBasedDay + targetMondayBasedDay);
  } else if (!/이번/.test(qualifier) && diff <= 0) {
    diff += 7;
  } else if (/이번/.test(qualifier) && diff < 0) {
    diff += 7;
  }

  return addDays(today, diff);
}

function parseSpokenTime(text) {
  const timeMatch = text.match(
    /(오전|오후|아침|저녁|밤|낮|새벽)?\s*(\d{1,2}|[가-힣]+)\s*시(?:\s*(\d{1,2}|[가-힣]+)\s*분)?/,
  );

  if (!timeMatch) return null;

  let hours = parseSpokenNumber(timeMatch[2]);
  const minutes = timeMatch[3] ? parseSpokenNumber(timeMatch[3]) : 0;
  if (hours === null || minutes === null) return null;

  const period = timeMatch[1] || "";
  if (/(오후|저녁|밤)/.test(period) && hours < 12) hours += 12;
  if (/(오전|아침|새벽)/.test(period) && hours === 12) hours = 0;

  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function parseSpokenNumber(value) {
  if (/^\d+$/.test(value)) return Number(value);

  const normalized = value.replace(/\s/g, "");
  const numberMap = {
    영: 0,
    공: 0,
    한: 1,
    하나: 1,
    일: 1,
    두: 2,
    둘: 2,
    이: 2,
    세: 3,
    셋: 3,
    삼: 3,
    네: 4,
    넷: 4,
    사: 4,
    다섯: 5,
    오: 5,
    여섯: 6,
    육: 6,
    일곱: 7,
    칠: 7,
    여덟: 8,
    팔: 8,
    아홉: 9,
    구: 9,
    열: 10,
    십: 10,
    열한: 11,
    열하나: 11,
    십일: 11,
    열두: 12,
    열둘: 12,
    십이: 12,
  };

  if (numberMap[normalized] !== undefined) return numberMap[normalized];

  const tenMatch = normalized.match(/^(십|열)([일이삼사오육칠팔구])$/);
  if (tenMatch) return 10 + numberMap[tenMatch[2]];

  return null;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateTimeLocalValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function render() {
  list.replaceChildren();

  const visibleTodos = todos.filter(matchesView);
  const completed = todos.filter((todo) => todo.completed).length;
  const remaining = todos.length - completed;

  totalCount.textContent = todos.length;
  doneCount.textContent = completed;
  remainingCount.textContent = remaining;
  clearCompleted.disabled = completed === 0;

  if (visibleTodos.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = getEmptyMessage();
    list.append(empty);
    return;
  }

  visibleTodos.forEach((todo) => {
    const item = template.content.firstElementChild.cloneNode(true);
    const checkbox = item.querySelector(".todo-check");
    const title = item.querySelector(".todo-title");
    const priority = item.querySelector(".priority");
    const due = item.querySelector(".due");
    const deleteButton = item.querySelector(".delete-button");

    item.classList.toggle("completed", todo.completed);
    checkbox.checked = todo.completed;
    title.value = todo.title;
    priority.textContent = priorityLabel(todo.priority);
    priority.className = `priority ${todo.priority}`;
    due.textContent = dueLabel(todo.due);
    due.className = `due ${dueStatus(todo.due)}`;

    checkbox.addEventListener("change", () => {
      updateTodo(todo.id, { completed: checkbox.checked });
    });

    title.addEventListener("change", () => {
      const nextTitle = title.value.trim();
      if (nextTitle) {
        updateTodo(todo.id, { title: nextTitle });
      } else {
        removeTodo(todo.id);
      }
    });

    title.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        title.blur();
      }
    });

    deleteButton.addEventListener("click", () => removeTodo(todo.id));
    list.append(item);
  });
}

function matchesView(todo) {
  const matchesFilter =
    currentFilter === "all" ||
    (currentFilter === "active" && !todo.completed) ||
    (currentFilter === "completed" && todo.completed);

  const matchesSearch =
    !searchTerm ||
    todo.title.toLowerCase().includes(searchTerm) ||
    priorityLabel(todo.priority).toLowerCase().includes(searchTerm);

  return matchesFilter && matchesSearch;
}

function updateTodo(id, patch) {
  todos = todos.map((todo) => (todo.id === id ? { ...todo, ...patch } : todo));
  saveAndRender();
}

function removeTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  render();
}

function loadTodos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function priorityLabel(priority) {
  return {
    high: "높음",
    normal: "보통",
    low: "낮음",
  }[priority] || "보통";
}

function dueLabel(due) {
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

function dueStatus(due) {
  if (!due) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dueDate = parseDueDate(due);
  if (!dueDate) return "";

  if (dueDate < new Date()) return "overdue";
  if (dueDate >= today && dueDate < tomorrow) return "today";
  return "";
}

function parseDueDate(due) {
  const normalizedDue = due.includes("T") ? due : `${due}T00:00`;
  const dueDate = new Date(normalizedDue);
  return Number.isNaN(dueDate.getTime()) ? null : dueDate;
}

function getEmptyMessage() {
  if (searchTerm) return "검색 결과가 없습니다.";
  if (currentFilter === "active") return "진행 중인 할 일이 없습니다.";
  if (currentFilter === "completed") return "완료된 할 일이 없습니다.";
  return "아직 등록된 할 일이 없습니다.";
}
