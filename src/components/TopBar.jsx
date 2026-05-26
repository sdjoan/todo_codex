const RING_CIRCUMFERENCE = 2 * Math.PI * 38;

const THEME_COLORS = {
  forest: "#0d7a5f",
  ocean: "#2667a6",
  coral: "#c94a2d",
};

export default function TopBar({ todos, theme, onThemeChange, onSummary }) {
  const completed = todos.filter((t) => t.completed).length;
  const remaining = todos.length - completed;
  const ratio = todos.length > 0 ? completed / todos.length : 0;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - ratio);

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">오늘의 작업</p>
        <h1 id="app-title">Todo</h1>
      </div>
      <div className="top-actions">
        <button className="ai-button" type="button" onClick={onSummary}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
          </svg>
          AI 요약
        </button>
        <div className="theme-switcher" aria-label="디자인 컬러 선택">
          {Object.entries(THEME_COLORS).map(([key]) => (
            <button
              key={key}
              className={`theme-option${theme === key ? " active" : ""}`}
              type="button"
              data-theme={key}
              aria-label={`${key} 테마`}
              aria-pressed={theme === key}
              onClick={() => onThemeChange(key)}
            >
              <span className={`swatch ${key}`} />
            </button>
          ))}
        </div>
        <div className="summary" aria-live="polite">
          <svg className="progress-ring" viewBox="0 0 88 88" aria-hidden="true">
            <circle className="ring-track" cx="44" cy="44" r="38" />
            <circle
              className="ring-fill"
              cx="44"
              cy="44"
              r="38"
              style={{ strokeDashoffset }}
            />
          </svg>
          <div className="summary-inner">
            <span>{remaining}</span>
            <span>남음</span>
          </div>
        </div>
      </div>
    </header>
  );
}
