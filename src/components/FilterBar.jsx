export default function FilterBar({ search, filter, onSearchChange, onFilterChange }) {
  const filters = [
    { value: "all", label: "전체" },
    { value: "active", label: "진행" },
    { value: "completed", label: "완료" },
  ];

  return (
    <div className="tools">
      <label className="search">
        <span className="visually-hidden">검색</span>
        <input
          type="search"
          placeholder="검색"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>
      <div className="filters" role="tablist" aria-label="할 일 필터">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            className={`filter${filter === value ? " active" : ""}`}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => onFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
