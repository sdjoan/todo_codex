import { useState, useEffect, useCallback } from "react";
import { loadTodos, saveTodos, loadTheme, saveTheme } from "./utils/storage.js";
import { callClaude, TAGS } from "./utils/ai.js";
import { THEME_COLORS } from "./utils/helpers.js";
import TopBar from "./components/TopBar.jsx";
import Composer from "./components/Composer.jsx";
import FilterBar from "./components/FilterBar.jsx";
import TodoList from "./components/TodoList.jsx";
import SummaryModal from "./components/SummaryModal.jsx";

export default function App() {
  const [todos, setTodos] = useState(() => loadTodos());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [breakdownState, setBreakdownState] = useState(null);
  const [taggingIds, setTaggingIds] = useState(() => new Set());
  const [theme, setTheme] = useState(() => loadTheme());
  const [summaryOpen, setSummaryOpen] = useState(false);

  useEffect(() => {
    document.body.dataset.theme = theme;
    saveTheme(theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = THEME_COLORS[theme] || THEME_COLORS.forest;
  }, [theme]);

  function mutateTodos(updater) {
    setTodos((prev) => {
      const next = updater(prev);
      saveTodos(next);
      return next;
    });
  }

  const addTodo = useCallback(({ title, due = "", priority = "normal" }) => {
    const id = crypto.randomUUID();
    mutateTodos((prev) => [
      { id, title, due, priority, completed: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
    autoTag(id, title);
  }, []);

  function updateTodo(id, patch) {
    mutateTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    if (patch.title !== undefined || patch.due !== undefined || patch.priority !== undefined) {
      setEditingId(null);
    }
  }

  function removeTodo(id) {
    mutateTodos((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
    if (breakdownState?.todoId === id) setBreakdownState(null);
  }

  function clearCompleted() {
    mutateTodos((prev) => prev.filter((t) => !t.completed));
  }

  async function autoTag(todoId, title) {
    setTaggingIds((prev) => new Set([...prev, todoId]));
    try {
      const categories = Object.keys(TAGS).join(", ");
      const text = await callClaude(
        [
          {
            role: "user",
            content: `다음 할 일의 카테고리를 아래 선택지 중 하나로만 답해. 단어만 답할 것.\n선택지: ${categories}\n할 일: "${title}"`,
          },
        ],
        12,
      );
      const tag = Object.keys(TAGS).find((k) => text.includes(k)) || "기타";
      mutateTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, tag } : t)));
    } catch {
      // 태깅 실패는 무시
    } finally {
      setTaggingIds((prev) => {
        const next = new Set(prev);
        next.delete(todoId);
        return next;
      });
    }
  }

  async function handleBreakdown(todoId) {
    if (breakdownState?.todoId === todoId) {
      setBreakdownState(null);
      return;
    }
    setBreakdownState({ todoId, loading: true });
    const todo = todos.find((t) => t.id === todoId);
    try {
      const text = await callClaude(
        [
          {
            role: "user",
            content: `다음 할 일을 실행 가능한 단계 3~5개로 나눠줘. JSON 배열로만 답해. 예: ["단계1","단계2"]\n할 일: "${todo?.title}"`,
          },
        ],
        400,
      );
      const match = text.match(/\[[\s\S]*?\]/);
      const subtasks = match ? JSON.parse(match[0]) : [];
      setBreakdownState({ todoId, loading: false, subtasks });
    } catch {
      setBreakdownState({ todoId, loading: false, error: "분해 실패. 다시 시도해주세요." });
    }
  }

  function handleBreakdownAddAll(parentId, subtasks, parentPriority) {
    const newTodos = subtasks.map((title) => ({
      id: crypto.randomUUID(),
      title,
      due: "",
      priority: parentPriority || "normal",
      completed: false,
      createdAt: new Date().toISOString(),
    }));
    mutateTodos((prev) => {
      const idx = prev.findIndex((t) => t.id === parentId);
      const next = [...prev];
      next.splice(idx + 1, 0, ...newTodos);
      return next;
    });
    setBreakdownState(null);
    newTodos.forEach((t) => autoTag(t.id, t.title));
  }

  const completed = todos.filter((t) => t.completed).length;

  return (
    <main className="app-shell">
      <section className="workspace" aria-labelledby="app-title">
        <TopBar
          todos={todos}
          theme={theme}
          onThemeChange={setTheme}
          onSummary={() => setSummaryOpen(true)}
        />
        <Composer
          todos={todos}
          editingId={editingId}
          onAdd={addTodo}
          onUpdate={updateTodo}
          onCancelEdit={() => setEditingId(null)}
        />
        <FilterBar
          search={search}
          filter={filter}
          onSearchChange={(v) => setSearch(v.trim().toLowerCase())}
          onFilterChange={setFilter}
        />
        <TodoList
          todos={todos}
          filter={filter}
          search={search}
          editingId={editingId}
          breakdownState={breakdownState}
          taggingIds={taggingIds}
          onToggle={(id) => updateTodo(id, { completed: !todos.find((t) => t.id === id)?.completed })}
          onEdit={setEditingId}
          onDelete={removeTodo}
          onBreakdown={handleBreakdown}
          onBreakdownClose={() => setBreakdownState(null)}
          onBreakdownAddAll={handleBreakdownAddAll}
        />
        <footer className="footer">
          <div className="stats">
            <span><strong>{todos.length}</strong> 전체</span>
            <span><strong>{completed}</strong> 완료</span>
          </div>
          <button
            className="ghost-button"
            type="button"
            disabled={completed === 0}
            onClick={clearCompleted}
          >
            완료 삭제
          </button>
        </footer>
      </section>
      <SummaryModal
        open={summaryOpen}
        todos={todos}
        onClose={() => setSummaryOpen(false)}
      />
    </main>
  );
}
