import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app.js";
import { applyDevSession, captureSessionFromSearch } from "./session.js";
import "./styles.css";

async function boot(): Promise<void> {
  captureSessionFromSearch(window.location.search);
  await applyDevSession();

  const root = document.getElementById("root");
  if (root === null) {
    throw new Error("dashboard root element is missing");
  }

  createRoot(root).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}

void boot();
