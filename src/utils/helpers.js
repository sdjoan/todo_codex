export function priorityLabel(priority) {
  return { high: "높음", normal: "보통", low: "낮음" }[priority] || "보통";
}

export function priorityIcon(priority) {
  const icons = {
    high: '<path d="m12 5 7 13H5L12 5Z" />',
    normal: '<circle cx="12" cy="12" r="6" />',
    low: '<path d="m12 19-7-13h14l-7 13Z" />',
  };
  return icons[priority] || icons.normal;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export const THEME_COLORS = {
  forest: "#0d7a5f",
  ocean: "#2667a6",
  coral: "#c94a2d",
};
