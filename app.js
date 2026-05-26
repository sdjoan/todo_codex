const STORAGE_KEY = "todo_0526_items";
const THEME_KEY = "todo_0526_theme";
const THEME_COLORS = {
  forest: "#0d7a5f",
  ocean: "#2667a6",
  coral: "#c94a2d",
};

const form = document.querySelector("#todoForm");
const input = document.querySelector("#todoInput");
const dueInput = document.querySelector("#dueInput");
const dateInput = document.querySelector("#dateInput");
const timeInput = document.querySelector("#timeInput");
const priorityInput = document.querySelector("#priorityInput");
const voiceButton = document.querySelector("#voiceButton");
const voiceStatus = document.querySelector("#voiceStatus");
const submitButton = document.querySelector("#submitButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const searchInput = document.querySelector("#searchInput");
const list = document.querySelector("#todoList");
const template = document.querySelector("#todoTemplate");
const totalCount = document.querySelector("#totalCount");
const doneCount = document.querySelector("#doneCount");
const remainingCount = document.querySelector("#remainingCount");
const clearCompleted = document.querySelector("#clearCompleted");
const filterButtons = document.querySelectorAll(".filter");
const quickDateButtons = document.querySelectorAll("[data-quick-date]");
const themeButtons = document.querySelectorAll("[data-theme]");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const progressRingFill = document.querySelector("#progressRingFill");

const RING_CIRCUMFERENCE = 2 * Math.PI * 38;

const TAGS = {
  업무:   { color: "#1d4ed8", bg: "#eff6ff" },
  개인:   { color: "#0d7a5f", bg: "#ecfdf5" },
  건강:   { color: "#be3a1a", bg: "#fff1ee" },
  학습:   { color: "#7c3aed", bg: "#f5f3ff" },
  쇼핑:   { color: "#b45309", bg: "#fffbeb" },
  가족:   { color: "#be185d", bg: "#fdf2f8" },
  기타:   { color: "#667269", bg: "#f4f6f2" },
};

const taggingIds = new Set();
let breakdownState = null;

let todos = loadTodos();
let currentFilter = "all";
let searchTerm = "";
let recognition = null;
let isListening = false;
let editingId = null;
let completedCollapsed = true;

const summaryButton = document.querySelector("#summaryButton");
const summaryModal = document.querySelector("#summaryModal");
const closeSummaryModal = document.querySelector("#closeSummaryModal");
const summaryModalBody = document.querySelector("#summaryModalBody");

applyTheme(loadTheme());
setupVoiceInput();
setupSummaryModal();
registerServiceWorker();
updateQuickDateState();
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = input.value.trim();
  if (!title) return;

  const payload = {
    title,
    due: buildDueValue(),
    priority: priorityInput.value,
  };

  if (editingId) {
    updateTodo(editingId, payload);
    clearEditMode();
  } else {
    addTodo(payload);
    resetComposer();
  }
});

cancelEditButton.addEventListener("click", () => {
  clearEditMode();
});

dateInput.addEventListener("change", syncDueInput);
timeInput.addEventListener("change", syncDueInput);

quickDateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setQuickDate(button.dataset.quickDate);
  });
});

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyTheme(button.dataset.theme);
  });
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
    voiceButton.setAttribute("aria-label", "음성 인식 중지");
    voiceButton.title = "음성 인식 중지";
  });

  recognition.addEventListener("end", () => {
    isListening = false;
    voiceButton.classList.remove("listening");
    voiceButton.setAttribute("aria-pressed", "false");
    voiceButton.setAttribute("aria-label", "음성으로 일정 등록");
    voiceButton.title = "음성으로 일정 등록: 내일 오후 3시 병원 예약 중요";
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

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!["https:", "http:"].includes(window.location.protocol)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The app still works without offline caching.
    });
  });
}

function applyTheme(theme) {
  const nextTheme = THEME_COLORS[theme] ? theme : "forest";
  document.body.dataset.theme = nextTheme;
  localStorage.setItem(THEME_KEY, nextTheme);
  if (themeColorMeta) themeColorMeta.content = THEME_COLORS[nextTheme];

  themeButtons.forEach((button) => {
    const active = button.dataset.theme === nextTheme;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function loadTheme() {
  return localStorage.getItem(THEME_KEY) || "forest";
}

function addTodo({ title, due = "", priority = "normal" }) {
  const id = crypto.randomUUID();
  todos.unshift({
    id,
    title,
    due,
    priority,
    completed: false,
    createdAt: new Date().toISOString(),
  });
  saveAndRender();
  autoTag(id);
}

function setEditMode(id) {
  const todo = todos.find((item) => item.id === id);
  if (!todo) return;

  editingId = id;
  input.value = todo.title;
  setDueFields(todo.due);
  priorityInput.value = todo.priority || "normal";
  submitButton.textContent = "저장";
  cancelEditButton.classList.remove("hidden");
  voiceStatus.textContent = "수정할 내용을 바꾼 뒤 저장하세요.";
  input.focus();
  render();
}

function clearEditMode() {
  editingId = null;
  submitButton.textContent = "추가";
  cancelEditButton.classList.add("hidden");
  voiceStatus.textContent = "";
  resetComposer();
  render();
}

function resetComposer() {
  form.reset();
  dueInput.value = "";
  priorityInput.value = "normal";
  updateQuickDateState();
  input.focus();
}

function setQuickDate(value) {
  if (value === "clear") {
    dateInput.value = "";
    timeInput.value = "";
    syncDueInput();
    return;
  }

  const target = new Date();
  target.setHours(0, 0, 0, 0);

  if (value === "tomorrow") {
    target.setDate(target.getDate() + 1);
  }

  if (value === "next-week") {
    target.setDate(target.getDate() + 7);
  }

  dateInput.value = toDateValue(target);
  if (!timeInput.value) timeInput.value = "09:00";
  syncDueInput();
}

function syncDueInput() {
  dueInput.value = buildDueValue();
  updateQuickDateState();
}

function buildDueValue() {
  if (!dateInput.value) return "";
  return `${dateInput.value}T${timeInput.value || "09:00"}`;
}

function setDueFields(due) {
  const dueDate = parseDueDate(due);

  if (!dueDate) {
    dateInput.value = "";
    timeInput.value = "";
    dueInput.value = "";
    updateQuickDateState();
    return;
  }

  dateInput.value = toDateValue(dueDate);
  timeInput.value = toTimeValue(dueDate);
  syncDueInput();
}

function updateQuickDateState() {
  const today = startOfToday();
  const selectedDate = dateInput.value ? parseDueDate(dateInput.value) : null;

  quickDateButtons.forEach((button) => {
    let active = false;

    if (button.dataset.quickDate === "clear") {
      active = !dateInput.value;
    } else if (selectedDate) {
      const diffDays = Math.round((selectedDate - today) / 86400000);
      active =
        (button.dataset.quickDate === "today" && diffDays === 0) ||
        (button.dataset.quickDate === "tomorrow" && diffDays === 1) ||
        (button.dataset.quickDate === "next-week" && diffDays === 7);
    }

    button.classList.toggle("active", active);
  });
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
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${toDateValue(date)}T${hours}:${minutes}`;
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toTimeValue(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function render() {
  list.replaceChildren();

  const completed = todos.filter((t) => t.completed).length;
  const remaining = todos.length - completed;

  totalCount.textContent = todos.length;
  doneCount.textContent = completed;
  remainingCount.textContent = remaining;
  clearCompleted.disabled = completed === 0;
  updateProgressRing(completed);

  const visibleTodos = todos.filter(matchesView);

  if (visibleTodos.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = getEmptyMessage();
    list.append(empty);
    return;
  }

  if (currentFilter !== "all" || searchTerm) {
    visibleTodos.forEach((todo) => appendItem(todo));
    return;
  }

  const activeTodos = visibleTodos.filter((t) => !t.completed);
  const completedTodos = visibleTodos.filter((t) => t.completed);

  if (activeTodos.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = completedTodos.length > 0 ? "할 일을 모두 완료했습니다!" : getEmptyMessage();
    list.append(empty);
  } else {
    activeTodos.forEach((todo) => appendItem(todo));
  }

  if (completedTodos.length > 0) {
    const separator = document.createElement("li");
    separator.className = "section-separator";
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "section-toggle";
    toggleBtn.type = "button";
    toggleBtn.setAttribute("aria-expanded", String(!completedCollapsed));
    toggleBtn.innerHTML = `<span>완료됨 ${completedTodos.length}개</span>
      <svg class="chevron${completedCollapsed ? "" : " open"}" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 9l6 6 6-6"/>
      </svg>`;
    toggleBtn.addEventListener("click", () => {
      completedCollapsed = !completedCollapsed;
      render();
    });
    separator.append(toggleBtn);
    list.append(separator);

    if (!completedCollapsed) {
      completedTodos.forEach((todo) => appendItem(todo));
    }
  }
}

function appendItem(todo) {
  list.append(buildTodoItem(todo));
  if (breakdownState?.todoId === todo.id) {
    list.append(buildBreakdownPanel(todo));
  }
}

function updateProgressRing(completed) {
  if (!progressRingFill) return;
  const ratio = todos.length > 0 ? completed / todos.length : 0;
  progressRingFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);
}

function buildTodoItem(todo) {
  const item = template.content.firstElementChild.cloneNode(true);
  const checkbox = item.querySelector(".todo-check");
  const title = item.querySelector(".todo-title");
  const priority = item.querySelector(".priority");
  const due = item.querySelector(".due");
  const aiTagEl = item.querySelector(".ai-tag");
  const editButton = item.querySelector(".edit-button");
  const deleteButton = item.querySelector(".delete-button");
  const breakdownButton = item.querySelector(".breakdown-button");

  item.classList.toggle("completed", todo.completed);
  item.classList.toggle("editing", todo.id === editingId);
  item.classList.add(`priority-${todo.priority || "normal"}`);
  checkbox.checked = todo.completed;
  title.value = todo.title;
  priority.className = `priority ${todo.priority || "normal"}`;
  priority.innerHTML = `${priorityIcon(todo.priority)}<span>${priorityLabel(todo.priority)}</span>`;
  due.textContent = dueLabel(todo.due);
  due.className = `due ${dueStatus(todo.due)}`;

  if (todo.tag && TAGS[todo.tag]) {
    aiTagEl.textContent = todo.tag;
    aiTagEl.style.color = TAGS[todo.tag].color;
    aiTagEl.style.background = TAGS[todo.tag].bg;
  } else if (taggingIds.has(todo.id)) {
    aiTagEl.innerHTML = '<span class="tag-loading"></span>';
  }

  const isBreakingDown = breakdownState?.todoId === todo.id;
  if (isBreakingDown && breakdownState.loading) {
    breakdownButton.disabled = true;
    breakdownButton.textContent = "분석 중";
  } else if (isBreakingDown) {
    breakdownButton.textContent = "닫기";
  }

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
  editButton.addEventListener("click", () => setEditMode(todo.id));
  breakdownButton.addEventListener("click", () => handleBreakdown(todo.id));

  return item;
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
  if (editingId === id) {
    editingId = null;
    submitButton.textContent = "추가";
    cancelEditButton.classList.add("hidden");
    resetComposer();
  }
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

function priorityIcon(priority) {
  const icons = {
    high: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 5 7 13H5L12 5Z" /></svg>',
    normal: '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" /></svg>',
    low: '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 19-7-13h14l-7 13Z" /></svg>',
  };

  return icons[priority] || icons.normal;
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

  const today = startOfToday();
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

function normalizeDueInputValue(due) {
  if (!due) return "";

  const dueDate = parseDueDate(due);
  if (!dueDate) return "";

  return toDateTimeLocalValue(dueDate);
}

function getEmptyMessage() {
  if (searchTerm) return "검색 결과가 없습니다.";
  if (currentFilter === "active") return "진행 중인 할 일이 없습니다.";
  if (currentFilter === "completed") return "완료된 할 일이 없습니다.";
  return "아직 등록된 할 일이 없습니다.";
}

// === AI ===

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function callClaude(messages, maxTokens = 300) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content[0].text.trim();
}

async function autoTag(todoId) {
  const todo = todos.find((t) => t.id === todoId);
  if (!todo || todo.tag) return;

  taggingIds.add(todoId);
  render();

  try {
    const categories = Object.keys(TAGS).join(", ");
    const text = await callClaude([
      {
        role: "user",
        content: `다음 할 일의 카테고리를 아래 선택지 중 하나로만 답해. 단어만 답할 것.\n선택지: ${categories}\n할 일: "${todo.title}"`,
      },
    ], 12);
    const tag = Object.keys(TAGS).find((k) => text.includes(k)) || "기타";
    todos = todos.map((t) => (t.id === todoId ? { ...t, tag } : t));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // 태깅 실패는 무시
  } finally {
    taggingIds.delete(todoId);
    render();
  }
}

async function handleBreakdown(todoId) {
  if (breakdownState?.todoId === todoId) {
    breakdownState = null;
    render();
    return;
  }

  breakdownState = { todoId, loading: true, subtasks: null };
  render();

  try {
    const todo = todos.find((t) => t.id === todoId);
    const text = await callClaude([
      {
        role: "user",
        content: `다음 할 일을 실행 가능한 단계 3~5개로 나눠줘. JSON 배열로만 답해. 예: ["단계1","단계2"]\n할 일: "${todo.title}"`,
      },
    ], 400);
    const match = text.match(/\[[\s\S]*?\]/);
    const subtasks = match ? JSON.parse(match[0]) : [];
    breakdownState = { todoId, loading: false, subtasks };
  } catch {
    breakdownState = { todoId, loading: false, subtasks: null, error: "분해에 실패했습니다. 다시 시도해주세요." };
  }
  render();
}

function buildBreakdownPanel(todo) {
  const li = document.createElement("li");
  li.className = "breakdown-panel";

  if (breakdownState.loading) {
    li.innerHTML = `<div class="breakdown-loading"><div class="spin"></div>할 일을 분해하고 있어요...</div>`;
    return li;
  }

  if (breakdownState.error) {
    li.innerHTML = `<div class="breakdown-header">
      <span>${escapeHtml(breakdownState.error)}</span>
      <button class="icon-button breakdown-close" type="button" aria-label="닫기">×</button>
    </div>`;
    li.querySelector(".breakdown-close").addEventListener("click", () => {
      breakdownState = null;
      render();
    });
    return li;
  }

  const subtasks = breakdownState.subtasks || [];
  const splitSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3v12M18 3v12M6 15a3 3 0 0 0 6 0M18 15a3 3 0 0 1-6 0"/></svg>`;

  li.innerHTML = `
    <div class="breakdown-header">
      ${splitSvg}
      <span>"${escapeHtml(todo.title)}" 분해 결과</span>
      <button class="icon-button breakdown-close" type="button" aria-label="닫기">×</button>
    </div>
    <ul class="breakdown-subtasks">
      ${subtasks.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
    </ul>
    <div class="breakdown-actions">
      <button class="primary-button add-all-btn" type="button">모두 추가 (${subtasks.length}개)</button>
    </div>
  `;

  li.querySelector(".breakdown-close").addEventListener("click", () => {
    breakdownState = null;
    render();
  });

  li.querySelector(".add-all-btn").addEventListener("click", () => {
    const parent = todos.find((t) => t.id === todo.id);
    const newTodos = subtasks.map((title) => ({
      id: crypto.randomUUID(),
      title,
      due: "",
      priority: parent?.priority || "normal",
      completed: false,
      createdAt: new Date().toISOString(),
    }));
    const parentIndex = todos.findIndex((t) => t.id === todo.id);
    todos.splice(parentIndex + 1, 0, ...newTodos);
    breakdownState = null;
    newTodos.forEach((t) => autoTag(t.id));
    saveAndRender();
  });

  return li;
}

function setupSummaryModal() {
  summaryButton.addEventListener("click", handleSummary);
  closeSummaryModal.addEventListener("click", () => summaryModal.classList.add("hidden"));
  summaryModal.addEventListener("click", (e) => {
    if (e.target === summaryModal) summaryModal.classList.add("hidden");
  });
}

async function handleSummary() {
  if (todos.length === 0) {
    renderSummary({ error: "요약할 할 일이 없습니다." });
    summaryModal.classList.remove("hidden");
    return;
  }

  summaryModal.classList.remove("hidden");
  summaryModalBody.innerHTML = `<div class="summary-loading"><div class="spin"></div>분석 중...</div>`;
  summaryButton.classList.add("loading");

  try {
    const listText = todos
      .map((t) =>
        `- [${t.completed ? "완료" : "미완료"}] ${t.title}${t.due ? ` (마감: ${dueLabel(t.due)})` : ""} [${priorityLabel(t.priority)}]`,
      )
      .join("\n");

    const text = await callClaude([
      {
        role: "user",
        content: `다음 할 일 목록을 분석해서 JSON으로 답해줘. 다른 말 없이 JSON만.\n형식: {"overview":"전체 상황 한 문장","focus":["집중1","집중2"],"tip":"조언"}\n\n${listText}`,
      },
    ], 500);

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("파싱 실패");
    renderSummary({ data: JSON.parse(match[0]) });
  } catch (err) {
    renderSummary({ error: err.message || "AI 요약에 실패했습니다." });
  } finally {
    summaryButton.classList.remove("loading");
  }
}

function renderSummary({ data, error }) {
  if (error) {
    summaryModalBody.innerHTML = `<p class="summary-error">${escapeHtml(error)}</p>`;
    return;
  }
  summaryModalBody.innerHTML = `
    <div class="summary-modal-body-inner">
      <div class="summary-section">
        <div class="summary-section-label">전체 상황</div>
        <div class="summary-overview">${escapeHtml(data.overview)}</div>
      </div>
      ${data.focus?.length ? `
      <div class="summary-section">
        <div class="summary-section-label">오늘 집중</div>
        <ul class="summary-focus-list">
          ${data.focus.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
        </ul>
      </div>` : ""}
      ${data.tip ? `
      <div class="summary-section">
        <div class="summary-section-label">조언</div>
        <p class="summary-tip">${escapeHtml(data.tip)}</p>
      </div>` : ""}
    </div>
  `;
}
