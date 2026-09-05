import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./ErrorBoundary.js";
import { App } from "./App.js";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* The backstop. A render error anywhere above this used to unmount the
        document and leave a white screen with no way back. */}
    <ErrorBoundary scope="app">
      <App />
    </ErrorBoundary>
  </StrictMode>
);
