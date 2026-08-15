import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { beginSeason, createFictionalLeague } from "@college-legends/simulation";
import { Recruiting, type RecruitingGameView } from "./Recruiting.js";

function fixture(seed = "war-room-component"): RecruitingGameView {
  const state = beginSeason(createFictionalLeague(seed, 12));
  return { state, playerProgramId: Object.keys(state.programs)[0]!, events: [] };
}

describe("Recruiting War Room", () => {
  it("renders truthful copy and weekly resource units", async () => {
    const game = fixture();
    render(<Recruiting game={game} locked={false} pending={[]} onQueue={() => undefined} />);
    expect(await screen.findByRole("heading", { name: "The War Room" })).toBeInTheDocument();
    expect(screen.getByText("NIL capacity / week")).toBeInTheDocument();
    expect(screen.getByText("NIL committed / week")).toBeInTheDocument();
    const copy = document.body.textContent ?? "";
    expect(copy).not.toContain("To Sign");
    expect(copy).not.toContain("/ yr");
    expect(copy).not.toContain("Class Rank");
    expect(copy).not.toContain("Air Raid fit");
    expect(copy).not.toContain("Also Bidding");
  });

  it("supports arrow-key selection and exposes a single selected detail panel", async () => {
    const user = userEvent.setup();
    const game = fixture("war-room-keyboard");
    render(<Recruiting game={game} locked={false} pending={[]} onQueue={() => undefined} />);
    const list = await screen.findByRole("list", { name: "Recruiting targets" });
    const selectors = within(list).getAllByRole("button");
    expect(selectors.length).toBeGreaterThan(1);
    selectors[0]!.focus();
    await user.keyboard("{ArrowDown}");
    expect(selectors[1]).toHaveFocus();
    expect(selectors[1]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 2, name: selectors[1]!.querySelector("strong")!.textContent! })).toBeInTheDocument();
  });

  it("preserves the scholarship command payload in the selected detail", async () => {
    const user = userEvent.setup();
    const game = fixture("war-room-command");
    const onQueue = vi.fn();
    render(<Recruiting game={game} locked={false} pending={[]} onQueue={onQueue} />);
    const list = await screen.findByRole("list", { name: "Recruiting targets" });
    const selectedName = within(list).getAllByRole("button")[0]!.querySelector("strong")!.textContent!;
    const selected = Object.values(game.state.prospects).find((prospect) => prospect.name === selectedName)!.id;
    const offer = await screen.findByRole("button", { name: "Offer scholarship" });
    await user.click(offer);
    expect(onQueue).toHaveBeenCalledWith({
      type: "OFFER_PROSPECT",
      programId: game.playerProgramId,
      prospectId: selected,
      extend: true
    });
  });

  it("moves the detail panel to a visible prospect when filters hide the selection", async () => {
    const user = userEvent.setup();
    const game = fixture("war-room-filter-selection");
    render(<Recruiting game={game} locked={false} pending={[]} onQueue={() => undefined} />);
    const list = await screen.findByRole("list", { name: "Recruiting targets" });
    const first = within(list).getAllByRole("button")[0]!;
    await user.click(first);
    const otherPosition = Object.values(game.state.prospects).find((prospect) => prospect.position !== first.textContent?.match(/\b(QB|RB|WR|TE|OL|DL|LB|DB|K|P)\b/)?.[1])!.position;
    await user.selectOptions(screen.getByRole("combobox", { name: "Position" }), otherPosition);
    const filteredFirst = within(screen.getByRole("list", { name: "Recruiting targets" })).getAllByRole("button")[0]!;
    expect(filteredFirst).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("heading", { level: 2, name: filteredFirst.querySelector("strong")!.textContent! })).toBeInTheDocument();
  });

  it("can offer every visible eligible target without exceeding projected openings", async () => {
    const user = userEvent.setup();
    const game = fixture("war-room-bulk-offer");
    const onQueue = vi.fn();
    render(<Recruiting game={game} locked={false} pending={[]} onQueue={onQueue} />);
    const button = await screen.findByRole("button", { name: /Offer visible targets/ });
    const count = Number(button.textContent?.match(/\((\d+)\)/)?.[1]);
    expect(count).toBeGreaterThan(0);
    await user.click(button);
    expect(onQueue).toHaveBeenCalledTimes(count);
    expect(new Set(onQueue.mock.calls.map(([command]) => command.prospectId)).size).toBe(count);
    expect(onQueue.mock.calls.every(([command]) => command.type === "OFFER_PROSPECT" && command.extend)).toBe(true);
  });
});
