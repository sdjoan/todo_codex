import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../styles.css";
import App from "./App.jsx";

if ("serviceWorker" in navigator && ["https:", "http:"].includes(location.protocol)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
