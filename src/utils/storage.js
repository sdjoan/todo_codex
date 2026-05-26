export const STORAGE_KEY = "todo_0526_items";
export const THEME_KEY = "todo_0526_theme";

export function loadTodos() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

export function loadTheme() {
  return localStorage.getItem(THEME_KEY) || "forest";
}

export function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}
