import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { GameCommand } from "@college-legends/model";
import { beginSeason, createFictionalLeague } from "@college-legends/simulation";
import { Finances } from "./App.js";

function fixture() {
  const state = beginSeason(createFictionalLeague("finance-sponsor-recovery", 12));
  const playerProgramId = Object.keys(state.programs)[0]!;
  return { state, playerProgramId, events: [] };
}

describe("sponsor control recovery", () => {
  it("lets the player replace an unavailable queued offer, then shows the valid choice as pending", async () => {
    const user = userEvent.setup();
    const game = fixture();
    const offer = game.state.sponsorships[game.playerProgramId]!.offers[0]!;
    const onQueue = vi.fn();
    const pending: GameCommand[] = [{ type: "ACCEPT_SPONSORSHIP", programId: game.playerProgramId, offerId: "expired" }];
    const view = render(<Finances game={game} pending={pending} onQueue={onQueue} />);
    expect(screen.getByRole("status")).toHaveTextContent("Blocked");
    const button = screen.getByRole("button", { name: `Sign with ${offer.sponsorName}` });
    expect(button).toBeEnabled();
    await user.click(button);
    const replacement: GameCommand = { type: "ACCEPT_SPONSORSHIP", programId: game.playerProgramId, offerId: offer.id };
    expect(onQueue).toHaveBeenCalledWith(replacement);
    // App's existing sponsorship command key replaces the old queued command.
    view.rerender(<Finances game={game} pending={[replacement]} onQueue={onQueue} />);
    expect(screen.getByRole("status")).toHaveTextContent("Queued for advance");
    expect(screen.getByRole("button", { name: "Contract queued" })).toBeDisabled();
    expect(game.state.sponsorships[game.playerProgramId]!.activeContractId).toBeNull();
  });

  it("does not disable this program's choices for another program's queued contract", () => {
    const game = fixture();
    const other = Object.keys(game.state.programs).find((id) => id !== game.playerProgramId)!;
    const offer = game.state.sponsorships[game.playerProgramId]!.offers[0]!;
    render(<Finances game={game} pending={[{ type: "ACCEPT_SPONSORSHIP", programId: other, offerId: "another" }]} onQueue={() => undefined} />);
    expect(screen.getByRole("button", { name: `Sign with ${offer.sponsorName}` })).toBeEnabled();
  });

  it("shows a blocked stale market without offering contracts the engine will reject", () => {
    const game = fixture();
    const offer = game.state.sponsorships[game.playerProgramId]!.offers[0]!;
    game.state.sponsorships[game.playerProgramId]!.season -= 1;
    render(<Finances game={game} pending={[{ type: "ACCEPT_SPONSORSHIP", programId: game.playerProgramId, offerId: offer.id }]} onQueue={() => undefined} />);
    expect(screen.getByRole("status")).toHaveTextContent("There are no current contracts");
    expect(screen.queryByRole("button", { name: /^Sign with/ })).not.toBeInTheDocument();
  });
});
