import { render, screen, fireEvent, within } from "@testing-library/react";
import { beforeEach, it, expect } from "vitest";
import { AgencyGame } from "./AgencyGame.js";
import { SAVE_KEY, startAgency, decideAgency, advanceAgency } from "./model.js";
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(SAVE_KEY, JSON.stringify(startAgency(42)));
});
it("carries a renewed client's negotiated school agreement through payout and the new season", () => {
  let s = decideAgency(startAgency(42), { type: 'pitch', id: '2027-5', promise: 'Security', fee: 15 });
  s.players[5]!.ability = 78;
  s.players[5]!.delivered = true;
  s.players[5]!.trust = 100;
  while (s.week < 12) s = advanceAgency(s);
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<AgencyGame />);
  fireEvent.click(screen.getByRole('button', { name: 'Offseason' }));
  fireEvent.click(screen.getByRole('button', { name: /^Renew current terms/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Explore another college season' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open transfer market & play semifinals →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Seek school offers · no cost' }));
  const offer = screen.getByRole('article', { name: 'Mountain Tech school offer' });
  fireEvent.click(within(offer).getByRole('button', { name: /^Ask for/ }));
  expect(screen.queryByRole('button', { name: /^Ask for/ })).not.toBeInTheDocument();
  expect(screen.getAllByText('Counter used · choose from the remaining offers.')).toHaveLength(3);
  // The seeded counter can lose; sign a surviving offer through the actual UI.
  const available = screen.getAllByRole('button', { name: /^Sign .* agreement$/ }).find(button => !button.hasAttribute('disabled'))!;
  fireEvent.click(available);
  expect(screen.getByRole('button', { name: 'Choose the draft path' })).toBeDisabled();
  expect(screen.getByText(/Pays this offseason \(2027\)/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Enter final commitments & championship →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close school offers & run Pro Days →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Enter draft weekend →' }));
  expect(screen.getByText(/will play at .* under the signed .* school agreement/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Offseason' }));
  expect(screen.getByText('PAYMENT RECEIVED')).toBeInTheDocument();
  expect(screen.getByText('Paid during the 2027 offseason, before the 2028 season.')).toBeInTheDocument();
  const paid = JSON.parse(localStorage.getItem(SAVE_KEY)!);
  const agreement = paid.offseason.agreements[0];
  fireEvent.click(screen.getByRole('button', { name: 'Resolve undrafted offers →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Resolve roster decisions →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Start next agency year →' }));
  const next = JSON.parse(localStorage.getItem(SAVE_KEY)!);
  expect(next.players[5]).toMatchObject({ school: agreement.school, season: 2028, owner: 'you', fee: 15 });
  expect(next.offseason.agreements[0].status).toBe('Paid');
});
it("keeps live money and prestige visible through development, navigation, and dialogs", () => {
  const s = decideAgency(startAgency(42), {
    type: "pitch",
    id: "2027-0",
    fee: 15,
    promise: "Development",
  });
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<AgencyGame />);
  fireEvent.click(
    screen.getByRole("button", { name: "Development" }),
  );
  const goals = within(
    screen.getByRole("region", { name: "Money and prestige" }),
  );
  expect(goals.getByText("$98,000")).toBeInTheDocument();
  expect(
    goals.getByRole("progressbar", { name: "Prestige goal" }),
  ).toHaveAttribute("value", "10");
  fireEvent.change(screen.getByLabelText("Development specialist"), {
    target: { value: "1" },
  });
  expect(
    screen.getByRole("button", { name: "Book development · $4,500" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Development specialist"), {
    target: { value: "0" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Book development · $1,500" }),
  );
  expect(goals.getByText("$96,500")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Advance to Week 1 →" }));
  fireEvent.click(screen.getByRole("button", { name: "Advance to Week 2 →" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Development" }),
  );
  expect(screen.getByText(/training added/)).toBeInTheDocument();
  expect(
    JSON.parse(localStorage.getItem(SAVE_KEY)!).growth.records[0].status,
  ).toBe("Complete");
  fireEvent.click(
    screen.getByRole("button", { name: "View agency goals and unlocks" }),
  );
  const dialog = within(
    screen.getByRole("dialog", { name: "Agency goals and unlocks" }),
  );
  expect(
    dialog.getByRole("region", { name: "Money and prestige" }),
  ).toHaveTextContent("$93,500");
  expect(dialog.getByText(/Locked · 18 prestige/)).toBeInTheDocument();
});
it("lets a player finish a rival negotiation in the pitch dialog and persists the result", () => {
  render(<AgencyGame />);
  fireEvent.click(
    screen.getByRole("button", { name: "Meet the prospects ↗" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Pitch Owen Hill" }));
  const dialog = within(
    screen.getByRole("dialog", { name: "Owen Hill · Final offer requested" }),
  );
  expect(dialog.getByText(/reserved \$4,000/)).toBeInTheDocument();
  fireEvent.change(dialog.getByRole("combobox", { name: "Final commission" }), {
    target: { value: "10" },
  });
  fireEvent.change(
    dialog.getByRole("combobox", { name: "Final service plan" }),
    { target: { value: "Security" } },
  );
  fireEvent.click(dialog.getByRole("checkbox"));
  fireEvent.click(
    dialog.getByRole("button", { name: "Submit final offer for Owen Hill" }),
  );
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!);
  expect(saved.gameplay.negotiations[0].status).not.toBe("Open");
  expect(screen.getByRole("dialog")).toHaveTextContent(saved.lastPitch.message);
  expect(
    screen.queryByRole("button", { name: "Submit final offer for Owen Hill" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText("Recruiting results")).toBeInTheDocument();
});
it("exposes client decisions and season ambitions, and shows the response after a choice", () => {
  let s = decideAgency(startAgency(42), {
    type: "pitch",
    id: "2027-0",
    fee: 15,
    promise: "Development",
  });
  s = advanceAgency(advanceAgency(s));
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<AgencyGame />);
  fireEvent.click(
    screen.getByRole("button", { name: /1 client request · earliest/ }),
  );
  expect(
    screen.getByRole("progressbar", { name: "Miles Ellis season ambition" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: /Book position coaching/ }),
  );
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!);
  expect(saved.money).toBe(s.money - 2000);
  expect(saved.gameplay.requests[0].status).toBe("Answered");
  expect(screen.getByText(/Client conversations · 1/)).toBeInTheDocument();
});
it("researches a senior without adding a college client or enabling early follow-ups", () => {
  render(<AgencyGame />);
  fireEvent.click(
    screen.getByRole("button", { name: "Meet the prospects ↗" }),
  );
  fireEvent.click(screen.getByText(/Next year's prospects/));
  fireEvent.click(
    screen.getAllByRole("button", { name: "Film report · $500" })[0]!,
  );
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY)!);
  expect(saved.money).toBe(99500);
  expect(saved.gameplay.seniors[0]).toMatchObject({
    research: 1,
    watched: true,
  });
  expect(
    saved.players.filter((p: { owner: string }) => p.owner === "you"),
  ).toHaveLength(0);
  expect(
    screen.getByRole("button", { name: "Follow-up · $1,500" }),
  ).toBeDisabled();
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
    screen.getByRole("dialog", { name: "Miles Ellis signed" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Agency spent \$2,000/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
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
it("shows understandable stars and reveals research only after purchase", () => {
  render(<AgencyGame />);
  fireEvent.click(
    screen.getByRole("button", { name: "Meet the prospects ↗" }),
  );
  expect(screen.queryByText("Undrafted / fringe")).not.toBeInTheDocument();
  expect(
    screen.getAllByRole("img", { name: "Conference: 3 out of 5 stars" }).length,
  ).toBeGreaterThan(0);
  expect(
    screen.getAllByText("Career assessment not yet researched").length,
  ).toBeGreaterThan(0);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Scout · $1,000" })[0]!,
  );
  expect(
    screen.getByRole("dialog", { name: "Miles Ellis · Scouting report" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Career & commercial assessment" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByLabelText("Scouting depth"), {
    target: { value: "2" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Upgrade · $4,000" }));
  expect(
    screen.getByRole("heading", { name: "Career & commercial assessment" }),
  ).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).money).toBe(95000);
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
  s.players[0]!.delivered = true;
  s.players[0]!.trust = 95;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<AgencyGame />);
  fireEvent.click(screen.getByRole('button', {name:'Offseason'}));
  fireEvent.click(screen.getByRole('button', {name:/Renew current terms/}));
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
  fireEvent.click(screen.getByRole("button", { name: "Pro Preparation" }));
  expect(
    screen.getByRole("button", { name: "Returning to school" }),
  ).toBeDisabled();
});
