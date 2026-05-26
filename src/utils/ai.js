export const TAGS = {
  업무: { color: "#1d4ed8", bg: "#eff6ff" },
  개인: { color: "#0d7a5f", bg: "#ecfdf5" },
  건강: { color: "#be3a1a", bg: "#fff1ee" },
  학습: { color: "#7c3aed", bg: "#f5f3ff" },
  쇼핑: { color: "#b45309", bg: "#fffbeb" },
  가족: { color: "#be185d", bg: "#fdf2f8" },
  기타: { color: "#667269", bg: "#f4f6f2" },
};

export async function callClaude(messages, maxTokens = 300) {
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
