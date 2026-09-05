import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary.js";

function Explodes(): never {
  throw new Error("hooks changed between renders");
}

describe("ErrorBoundary", () => {
  it("keeps a broken screen from taking the document with it", () => {
    // The recruiting board threw during render and React unmounted the whole
    // app: white screen, no message, no way back, while the career sat safely
    // in the worker and the autosave. A cold player reproduced it 3/3 and
    // concluded the game was broken.
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      render(<ErrorBoundary scope="test"><Explodes /></ErrorBoundary>);
      expect(screen.getByRole("alert")).toBeInTheDocument();
      // And it must say the career survived, because that is the fact the
      // player most needs and least expects from a broken screen.
      expect(document.body.textContent).toContain("Your career is safe");
    } finally {
      spy.mockRestore();
    }
  });

  it("offers a way back when the caller can provide one", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      render(<ErrorBoundary scope="test" onReset={onReset}><Explodes /></ErrorBoundary>);
      await user.click(screen.getByRole("button", { name: /dashboard/i }));
      expect(onReset).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it("renders its children untouched when nothing throws", () => {
    render(<ErrorBoundary scope="test"><p>the season</p></ErrorBoundary>);
    expect(screen.getByText("the season")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
