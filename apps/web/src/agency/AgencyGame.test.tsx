import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, it, expect } from "vitest";
import { AgencyGame } from "./AgencyGame.js";
import { SAVE_KEY, startAgency, decideAgency } from "./model.js";
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
it("shows football context and persists the return decision from the existing client file", () => {
  const s = decideAgency(startAgency(42), {
    type: "pitch",
    id: "2027-0",
    promise: "Development",
    fee: 15,
  });
  s.week = 12;
  s.players[0]!.eligibility = 2;
  s.players[0]!.schoolYear = 4;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<AgencyGame />);
  fireEvent.click(screen.getByRole("button", { name: "Clients" }));
  expect(screen.getByText("D-I FCS · Founders Conference")).toBeInTheDocument();
  expect(screen.getByText(/Year 4 · 2 seasons/)).toBeInTheDocument();
  expect(screen.getByText("Rotation · QB2")).toBeInTheDocument();
  expect(screen.getByText("Available")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Return for another season" }),
  );
  expect(screen.getByText("Plan: return to school")).toBeInTheDocument();
  expect(
    JSON.parse(localStorage.getItem(SAVE_KEY)!).players[0].careerPlan,
  ).toBe("Return");
  fireEvent.click(
    screen.getByRole("button", { name: "Pro Preparation" }),
  );
  expect(
    screen.getByRole("button", { name: "Returning to school" }),
  ).toBeDisabled();
});
