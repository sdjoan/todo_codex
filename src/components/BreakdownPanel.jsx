export default function BreakdownPanel({ todo, state, onClose, onAddAll }) {
  if (state.loading) {
    return (
      <li className="breakdown-panel">
        <div className="breakdown-loading">
          <div className="spin" />
          할 일을 분해하고 있어요...
        </div>
      </li>
    );
  }

  if (state.error) {
    return (
      <li className="breakdown-panel">
        <div className="breakdown-header">
          <span>{state.error}</span>
          <button className="icon-button breakdown-close" type="button" onClick={onClose}>×</button>
        </div>
      </li>
    );
  }

  const subtasks = state.subtasks || [];

  return (
    <li className="breakdown-panel">
      <div className="breakdown-header">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3v12M18 3v12M6 15a3 3 0 0 0 6 0M18 15a3 3 0 0 1-6 0" />
        </svg>
        <span>"{todo.title}" 분해 결과</span>
        <button className="icon-button breakdown-close" type="button" onClick={onClose}>×</button>
      </div>
      <ul className="breakdown-subtasks">
        {subtasks.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      <div className="breakdown-actions">
        <button className="primary-button" type="button" onClick={() => onAddAll(subtasks)}>
          모두 추가 ({subtasks.length}개)
        </button>
      </div>
    </li>
  );
}
