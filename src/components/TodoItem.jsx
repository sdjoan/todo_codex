import { dueLabel, dueStatus } from "../utils/date.js";
import { priorityLabel } from "../utils/helpers.js";
import { TAGS } from "../utils/ai.js";

function PriorityIcon({ priority }) {
  if (priority === "high") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 5 7 13H5L12 5Z" /></svg>;
  if (priority === "low") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m12 19-7-13h14l-7 13Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" /></svg>;
}

export default function TodoItem({
  todo,
  isEditing,
  isTagging,
  breakdownState,
  onToggle,
  onEdit,
  onDelete,
  onBreakdown,
}) {
  const status = dueStatus(todo.due);
  const isBreakingDown = breakdownState?.todoId === todo.id;

  return (
    <li
      className={[
        "todo-item",
        `priority-${todo.priority || "normal"}`,
        todo.completed ? "completed" : "",
        isEditing ? "editing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label className="check-wrap">
        <input
          className="todo-check"
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
        />
        <span />
      </label>
      <div className="todo-content">
        <div className={`todo-title${todo.completed ? " completed" : ""}`}>
          {todo.title}
        </div>
        <div className="meta">
          <span className={`priority ${todo.priority || "normal"}`}>
            <PriorityIcon priority={todo.priority} />
            <span>{priorityLabel(todo.priority)}</span>
          </span>
          {todo.due && (
            <span className={`due${status ? ` ${status}` : ""}`}>
              {dueLabel(todo.due)}
            </span>
          )}
          {todo.tag && TAGS[todo.tag] && (
            <span
              className="ai-tag"
              style={{ color: TAGS[todo.tag].color, background: TAGS[todo.tag].bg }}
            >
              {todo.tag}
            </span>
          )}
          {isTagging && !todo.tag && (
            <span className="ai-tag">
              <span className="tag-loading" />
            </span>
          )}
        </div>
      </div>
      <div className="item-actions">
        <button
          className="text-button breakdown-button"
          type="button"
          disabled={isBreakingDown && breakdownState.loading}
          onClick={() => onBreakdown(todo.id)}
        >
          {isBreakingDown && breakdownState.loading
            ? "분석 중"
            : isBreakingDown
            ? "닫기"
            : "분해"}
        </button>
        <button className="text-button edit-button" type="button" onClick={() => onEdit(todo.id)}>
          수정
        </button>
      </div>
      <button
        className="icon-button delete-button"
        type="button"
        aria-label="삭제"
        onClick={() => onDelete(todo.id)}
      >
        ×
      </button>
    </li>
  );
}
