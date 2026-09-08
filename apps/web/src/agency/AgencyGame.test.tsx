import { representedAgency } from "./testFixtures.js";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { beforeEach, it, expect } from "vitest";
import { AgencyGame } from "./AgencyGame.js";
import { SAVE_KEY, startAgency, decideAgency, advanceAgency } from "./model.js";
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(SAVE_KEY, JSON.stringify(startAgency(42)));
});
function dismissResult() {
  const dialog=screen.queryByRole('dialog');
  if(dialog) fireEvent.click(within(dialog).getByRole('button',{name:'Continue'}));
}
function sendPitch(name:string, promise?:string,fee?:number) {
  fireEvent.click(screen.getByRole('button',{name:`Pitch ${name}`}));
  if(promise) fireEvent.change(screen.getByLabelText(`Promise to ${name}`),{target:{value:promise}});
  if(fee) fireEvent.change(screen.getByLabelText('Your commercial commission'),{target:{value:fee}});
  fireEvent.click(screen.getByRole('button',{name:`Send pitch to ${name}`}));
}
it('automatically opens draft night and replay never deposits the payout again',()=>{
  const s=representedAgency();s.week=15;
  const p=s.players[0]!;p.schoolYear=4;p.careerPlan='Draft';p.ability=95;p.testing=4;p.interview=4;
  localStorage.setItem(SAVE_KEY,JSON.stringify(s));
  render(<AgencyGame/>);
  fireEvent.click(screen.getByRole('button',{name:'Enter draft weekend →'}));
  expect(screen.getByRole('dialog',{name:'Draft night'})).toBeInTheDocument();
  const paid=JSON.parse(localStorage.getItem(SAVE_KEY)!);
  expect(paid.players[0].status).toBe('Drafted');
  fireEvent.click(screen.getByRole('button',{name:'Reveal Miles’s draft result'}));
  expect(screen.getByText(/overall/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'See the night’s full results'}));
  fireEvent.click(screen.getByRole('button',{name:'Replay draft night'}));
  fireEvent.click(screen.getByRole('button',{name:'Reveal Miles’s draft result'}));
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).money).toBe(paid.money);
});
it('sets promises inside each client pitch and does not charge for opening or cancelling',()=>{
  render(<AgencyGame/>);
  fireEvent.click(screen.getByRole('button',{name:'Meet the prospects ↗'}));
  expect(screen.queryByLabelText('Your service promise')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Pitch Caleb Banks'}));
  expect(screen.getByLabelText('Promise to Caleb Banks')).toHaveValue('Security');
  fireEvent.change(screen.getByLabelText('Promise to Caleb Banks'),{target:{value:'Visibility'}});
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  fireEvent.click(screen.getByRole('button',{name:'Pitch Miles Ellis'}));
  expect(screen.getByLabelText('Promise to Miles Ellis')).toHaveValue('Development');
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).money).toBe(100000);
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
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
  dismissResult();
  fireEvent.click(screen.getByRole('button', { name: /^Compare college offers/ }));
  dismissResult();
  fireEvent.click(screen.getByRole('button', { name: 'Open transfer market & play semifinals →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Seek school offers · no cost' }));
  dismissResult();
  const offer = screen.getByRole('article', { name: 'Mountain Tech school offer' });
  fireEvent.click(within(offer).getByRole('button', { name: /^Ask for/ }));
  dismissResult();
  expect(screen.queryByRole('button', { name: /^Ask for/ })).not.toBeInTheDocument();
  expect(screen.getAllByText('Counter used · choose from the remaining offers.')).toHaveLength(3);
  // The seeded counter can lose; sign a surviving offer through the actual UI.
  const available = screen.getAllByRole('button', { name: /^Sign .* agreement$/ }).find(button => !button.hasAttribute('disabled'))!;
  fireEvent.click(available);
  expect(screen.getByRole('dialog')).toHaveTextContent('Signing closes other school offers');
  fireEvent.click(screen.getByRole('button',{name:'Confirm commitment'}));
  dismissResult();
  expect(screen.queryByRole('button',{name:/^Explore the draft/})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/^Sign .* agreement$/})).not.toBeInTheDocument();
  expect(screen.getByText(/Pays this offseason \(2027\)/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Enter final commitments & championship →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Close school offers & run Pro Days →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Enter draft weekend →' }));
  expect(screen.getByRole('dialog',{name:'Payday'})).toBeInTheDocument();
  dismissResult();
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
it("shows a preparation commitment, the completed deliverable and updated offers", () => {
  localStorage.setItem(SAVE_KEY,JSON.stringify(representedAgency()));
  render(<AgencyGame/>);
  fireEvent.click(screen.getByRole('button',{name:'Brand Studio'}));
  expect(screen.queryByLabelText('Development specialist')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Review hire · $750'}));
  expect(screen.getByRole('dialog')).toHaveTextContent('It does not sign a deal');
  fireEvent.click(screen.getByRole('button',{name:'Confirm commitment'}));
  expect(screen.getByRole('dialog',{name:'Preparation booked'})).toHaveTextContent('Week 1');
  dismissResult();
  expect(screen.getByRole('region',{name:'Money and prestige'})).toHaveTextContent('$97,250');
  fireEvent.click(screen.getByRole('button',{name:'Advance to Week 1 →'}));
  expect(screen.getByRole('dialog',{name:'Preparation delivered'})).toHaveTextContent('Photo portfolio delivered');
  dismissResult();
  fireEvent.click(screen.getByRole('button',{name:'Brand Studio'}));
  expect(screen.getByText('✓ Photo portfolio delivered')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).players[0].brandKit).toEqual(['Styling']);
  fireEvent.click(screen.getByRole('button',{name:'View agency goals and unlocks'}));
  expect(within(screen.getByRole('dialog')).getByRole('region',{name:'Money and prestige'})).toHaveTextContent('$95,750');
});

it("lets a player finish a rival negotiation in the pitch dialog and persists the result", () => {
  render(<AgencyGame />);
  fireEvent.click(
    screen.getByRole("button", { name: "Meet the prospects ↗" }),
  );
  sendPitch("Owen Hill", "Development");
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
  let s = representedAgency();
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
    screen.getByRole("button", { name: /Build a sponsor portfolio/ }),
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
  expect(screen.queryByRole('button',{name:'Advance to Week 1 →'})).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "Meet the prospects ↗" }),
  );
  sendPitch("Miles Ellis",undefined,10);
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
    screen.getByRole("button", { name: "Review local endorsement" }),
  );
  const before=JSON.parse(localStorage.getItem(SAVE_KEY)!).money;
  expect(screen.getByRole('dialog',{name:'Review Hometown Outfitters'})).toHaveTextContent('No signing charge. 2 weeks');
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).money).toBe(before);
  fireEvent.click(screen.getByRole('button',{name:'Confirm commitment'}));
  expect(screen.getByRole('dialog',{name:'Deal signed'})).toHaveTextContent('Advance the week to deliver');
  dismissResult();
  expect(screen.getAllByRole('button',{name:'Campaign in progress'}).every(b=>b.hasAttribute('disabled'))).toBe(true);
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
  expect(screen.getByRole("dialog",{name:"Payday"})).toBeInTheDocument();
  dismissResult();
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
  const s = representedAgency();
  s.week = 12;
  s.players[0]!.eligibility = 2;
  s.players[0]!.schoolYear = 4;
  s.players[0]!.delivered = true;
  s.players[0]!.trust = 95;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<AgencyGame />);
  fireEvent.click(screen.getByRole('button', {name:'Offseason'}));
  fireEvent.click(screen.getByRole('button', {name:/Renew current terms/}));
  dismissResult();
  fireEvent.click(screen.getByRole('button',{name:/^Compare college offers/}));
  dismissResult();
  fireEvent.click(screen.getByRole("button", { name: "Clients" }));
  fireEvent.click(screen.getByText("Player profile & career history"));
  expect(screen.getByText("D-I FCS · Founders Conference")).toBeInTheDocument();
  expect(screen.getByText(/Year 4 · 2 seasons/)).toBeInTheDocument();
  expect(screen.getByText("Rotation · QB2")).toBeInTheDocument();
  expect(screen.getByText("Available")).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Return for another season'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Enter the draft'})).not.toBeInTheDocument();
  expect(
    JSON.parse(localStorage.getItem(SAVE_KEY)!).players[0].careerPlan,
  ).toBe("Return");
  fireEvent.click(screen.getByRole("button", { name: "Pro Preparation" }));
  expect(
    screen.getByRole("button", { name: "Returning to school" }),
  ).toBeDisabled();
});
