import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, it, expect } from "vitest";
import { AgencyGame } from "./AgencyGame.js";
import { SAVE_KEY, startAgency } from "./model.js";
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(SAVE_KEY, JSON.stringify(startAgency(42)));
});
it("connects first client, deal, weekly recap and client box statistics", () => {
  render(<AgencyGame />);
  expect(
    screen.getByRole("button", { name: "Advance to Week 1 →" }),
  ).toBeDisabled();
  fireEvent.click(
    screen.getByRole("button", { name: "Meet the prospects ↗" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Pitch Miles Ellis" }));
  expect(
    screen.getByRole("button", { name: "Advance to Week 1 →" }),
  ).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Deals" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Negotiate local endorsement" }),
  );
  expect(
    screen.getByText("Contract signed. Commission arrives after delivery."),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Advance to Week 1 →" }));
  expect(
    screen.getByRole("heading", { name: "Your clients on Saturday" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Career box statistics ↗" }),
  );
  expect(
    screen.getByRole("heading", { name: "Weekly box statistics" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Advance to Week 2 →" }));
  expect(screen.getByText(/client keeps/)).toBeInTheDocument();
});
it("requires an explicit second click before replacing a saved agency", () => {
  render(<AgencyGame />);
  fireEvent.click(screen.getByRole("button", { name: "Start a new agency" }));
  expect(
    screen.getByRole("button", { name: "Confirm new agency" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Keep this agency" }));
  expect(
    screen.queryByRole("button", { name: "Confirm new agency" }),
  ).not.toBeInTheDocument();
});
