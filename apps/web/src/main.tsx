import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./ErrorBoundary.js";
async function start() {
  let Game;
  if (new URLSearchParams(location.search).get("legacy") === "1") {
    await import("./styles.css");
    await import("./visual-system.css");
    Game = (await import("./App.js")).App;
  } else if (new URLSearchParams(location.search).get("prototype") === "1") {
    Game = (await import("./new-game/BusinessGame.js")).BusinessGame;
  } else if (new URLSearchParams(location.search).get("enterprise") === "1") {
    Game = (await import("./new-game/EnterpriseGame.js")).EnterpriseGame;
  } else if (new URLSearchParams(location.search).get("core") === "1") {
    Game = (await import("./new-game/CoreGame.js")).CoreGame;
  } else {
    document.title = "College Football Agent Sim";
    Game = (await import("./agency/AgencyGame.js")).AgencyGame;
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary scope="app">
        <Game />
      </ErrorBoundary>
    </StrictMode>,
  );
}
void start().catch(() => {
  const root = document.getElementById("root");
  if (root)
    root.textContent =
      "The game could not load. Please reload to try again. Your saved career has not been changed.";
});
