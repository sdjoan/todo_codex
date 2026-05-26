import { useState } from "react";
import TodoItem from "./TodoItem.jsx";
import BreakdownPanel from "./BreakdownPanel.jsx";

function getEmptyMessage(filter, search) {
  if (search) return "검색 결과가 없습니다.";
  if (filter === "active") return "진행 중인 할 일이 없습니다.";
  if (filter === "completed") return "완료된 할 일이 없습니다.";
  return "아직 등록된 할 일이 없습니다.";
}

function matchesView(todo, filter, search) {
  const matchesFilter =
    filter === "all" ||
    (filter === "active" && !todo.completed) ||
    (filter === "completed" && todo.completed);
  const matchesSearch =
    !search ||
    todo.title.toLowerCase().includes(search) ||
    (todo.tag && todo.tag.includes(search));
  return matchesFilter && matchesSearch;
}

export default function TodoList({
  todos,
  filter,
  search,
  editingId,
  breakdownState,
  taggingIds,
  onToggle,
  onEdit,
  onDelete,
  onBreakdown,
  onBreakdownClose,
  onBreakdownAddAll,
}) {
  const [completedCollapsed, setCompletedCollapsed] = useState(true);

  const visible = todos.filter((t) => matchesView(t, filter, search));

  if (visible.length === 0) {
    return (
      <ul className="todo-list" aria-live="polite">
        <li className="empty">{getEmptyMessage(filter, search)}</li>
      </ul>
    );
  }

  function renderItem(todo) {
    const items = [
      <TodoItem
        key={todo.id}
        todo={todo}
        isEditing={todo.id === editingId}
        isTagging={taggingIds.has(todo.id)}
        breakdownState={breakdownState}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onBreakdown={onBreakdown}
      />,
    ];
    if (breakdownState?.todoId === todo.id) {
      items.push(
        <BreakdownPanel
          key={`bd-${todo.id}`}
          todo={todo}
          state={breakdownState}
          onClose={onBreakdownClose}
          onAddAll={(subtasks) => onBreakdownAddAll(todo.id, subtasks, todo.priority)}
        />,
      );
    }
    return items;
  }

  if (filter !== "all" || search) {
    return (
      <ul className="todo-list" aria-live="polite">
        {visible.flatMap(renderItem)}
      </ul>
    );
  }

  const active = visible.filter((t) => !t.completed);
  const completed = visible.filter((t) => t.completed);

  return (
    <ul className="todo-list" aria-live="polite">
      {active.length === 0 && completed.length > 0 ? (
        <li className="empty">할 일을 모두 완료했습니다!</li>
      ) : (
        active.flatMap(renderItem)
      )}

      {completed.length > 0 && (
        <li className="section-separator">
          <button
            className="section-toggle"
            type="button"
            aria-expanded={!completedCollapsed}
            onClick={() => setCompletedCollapsed((v) => !v)}
          >
            <span>완료됨 {completed.length}개</span>
            <svg
              className={`chevron${completedCollapsed ? "" : " open"}`}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </li>
      )}

      {!completedCollapsed && completed.flatMap(renderItem)}
    </ul>
  );
}
