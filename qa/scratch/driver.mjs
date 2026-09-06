// Long-lived Playwright driver fed a command DSL through a watched directory.
// Write cmds/NNN.txt, poll for out/NNN.json. One browser for the whole run.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] ?? "/tmp/cl-driver";
const CMDS = path.join(ROOT, "cmds");
const OUT = path.join(ROOT, "out");
const SHOTS = path.join(ROOT, "shots");
for (const dir of [ROOT, CMDS, OUT, SHOTS]) fs.mkdirSync(dir, { recursive: true });

const errors = [];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
page.on("pageerror", (e) => errors.push({ kind: "pageerror", text: String(e), at: new Date().toISOString() }));
page.on("console", (m) => { if (m.type() === "error") errors.push({ kind: "console", text: m.text(), at: new Date().toISOString() }); });
page.on("crash", () => errors.push({ kind: "crash", text: "page crashed" }));

const narration = fs.createWriteStream(path.join(ROOT, "narration.log"), { flags: "a" });
const say = (s) => { narration.write(`${new Date().toISOString()} ${s}\n`); };

function trim(s, n = 4000) { return s && s.length > n ? `${s.slice(0, n)}\n…[${s.length} chars]` : s; }

async function findByText(selector, needle) {
  const handles = await page.$$(selector);
  for (const h of handles) {
    const t = (await h.innerText().catch(() => "")) || "";
    if (t.toLowerCase().includes(needle.toLowerCase())) return h;
  }
  return null;
}

async function describe(h) {
  if (!h) return null;
  return await h.evaluate((el) => ({
    tag: el.tagName,
    disabled: el.disabled ?? null,
    ariaDisabled: el.getAttribute("aria-disabled"),
    text: (el.innerText || el.value || "").slice(0, 200),
    cls: el.className
  }));
}

async function run(line) {
  const m = line.match(/^(\S+)\s*(.*)$/s);
  if (!m) return { ok: true, skip: true };
  const verb = m[1];
  const rest = m[2] ?? "";
  const [a, b] = rest.split(" :: ");
  switch (verb) {
    case "goto": await page.goto(rest.trim(), { waitUntil: "domcontentloaded" }); return { ok: true, url: page.url() };
    case "reload": await page.reload({ waitUntil: "domcontentloaded" }); return { ok: true, url: page.url() };
    case "wait": await page.waitForTimeout(Number(rest.trim())); return { ok: true };
    case "waitFor": await page.waitForSelector(rest.trim(), { timeout: 60000 }); return { ok: true };
    case "waitText": {
      const t0 = Date.now();
      while (Date.now() - t0 < 120000) {
        const h = await findByText(a.trim(), b.trim());
        if (h) return { ok: true, ms: Date.now() - t0 };
        await page.waitForTimeout(200);
      }
      return { ok: false, error: `timeout waiting for text ${b} in ${a}` };
    }
    case "click": {
      const h = await page.$(rest.trim());
      if (!h) return { ok: false, error: `no element ${rest.trim()}` };
      const d = await describe(h);
      if (d.disabled) return { ok: false, error: "element is DISABLED — not clicking", element: d };
      await h.click();
      return { ok: true, element: d };
    }
    case "clickText": {
      const h = await findByText(a.trim(), b.trim());
      if (!h) return { ok: false, error: `no ${a.trim()} containing "${b.trim()}"` };
      const d = await describe(h);
      if (d.disabled) return { ok: false, error: "element is DISABLED — not clicking", element: d };
      await h.click();
      return { ok: true, element: d };
    }
    case "probe": {
      const h = a && b ? await findByText(a.trim(), b.trim()) : await page.$(rest.trim());
      return { ok: true, element: await describe(h) };
    }
    case "fill": { await page.fill(a.trim(), b); return { ok: true }; }
    case "select": { const v = await page.selectOption(a.trim(), b.trim()); return { ok: true, selected: v }; }
    case "text": {
      const h = await page.$(rest.trim());
      if (!h) return { ok: false, error: `no element ${rest.trim()}` };
      return { ok: true, text: trim(await h.innerText()) };
    }
    case "textAll": {
      const hs = await page.$$(a.trim());
      const limit = b ? Number(b) : 30;
      const out = [];
      for (const h of hs.slice(0, limit)) out.push(trim((await h.innerText()).replace(/\n+/g, " | "), 400));
      return { ok: true, count: hs.length, items: out };
    }
    case "count": { const hs = await page.$$(rest.trim()); return { ok: true, count: hs.length }; }
    case "shot": { await page.screenshot({ path: path.join(SHOTS, `${rest.trim()}.png`), fullPage: false }); return { ok: true, file: `${rest.trim()}.png` }; }
    case "shotFull": { await page.screenshot({ path: path.join(SHOTS, `${rest.trim()}.png`), fullPage: true }); return { ok: true, file: `${rest.trim()}.png` }; }
    case "eval": { return { ok: true, value: await page.evaluate(rest) }; }
    case "errors": { const e = errors.slice(); return { ok: true, count: e.length, errors: e.slice(-20) }; }
    case "clearErrors": { const n = errors.length; errors.length = 0; return { ok: true, cleared: n }; }
    case "narrate": { say(rest); return { ok: true }; }
    case "advance": {
      // Real click on the Advance week button; time the round trip.
      const h = await findByText(".week-action button", "Advance week");
      if (!h) return { ok: false, error: "no Advance week button", header: trim(await page.$eval(".week-action", (e) => e.innerText).catch(() => "?")) };
      const d = await describe(h);
      if (d.disabled) return { ok: false, error: "Advance week DISABLED", element: d };
      const t0 = Date.now();
      await h.click();
      // wait until any "Simulating…"/"Working…" state clears
      await page.waitForTimeout(120);
      const t1 = Date.now();
      while (Date.now() - t1 < 180000) {
        const busy = await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll("button"));
          return b.some((x) => /Simulating|Working…|Starting…/.test(x.textContent || ""));
        });
        if (!busy) break;
        await page.waitForTimeout(100);
      }
      const ms = Date.now() - t0;
      const head = await page.$eval(".dashboard-header", (e) => e.innerText).catch(() => "");
      return { ok: true, ms, header: trim(head, 500) };
    }
    case "offseasonContinue": {
      const h = await page.$(".offseason-screen .job-actions button, .job-actions button");
      if (!h) return { ok: false, error: "no offseason continue button" };
      const d = await describe(h);
      if (d.disabled) return { ok: false, error: "continue DISABLED", element: d };
      const t0 = Date.now();
      await h.click();
      await page.waitForTimeout(150);
      while (Date.now() - t0 < 180000) {
        const busy = await page.evaluate(() => Array.from(document.querySelectorAll("button")).some((x) => /Working…|Simulating/.test(x.textContent || "")));
        if (!busy) break;
        await page.waitForTimeout(100);
      }
      const head = await page.$eval(".masthead, .dashboard-header", (e) => e.innerText).catch(() => "");
      return { ok: true, ms: Date.now() - t0, header: trim(head, 600) };
    }
    case "nav": {
      // nav SCREEN_LABEL — click the primary nav or open More and click there
      const label = rest.trim();
      let h = await findByText("nav.game-nav button", label);
      if (h) { const d = await describe(h); if (d.disabled) return { ok: false, error: "nav DISABLED", element: d }; await h.click(); return { ok: true, via: "primary", element: d }; }
      const toggle = await page.$(".nav-more-toggle");
      if (!toggle) return { ok: false, error: "no More toggle" };
      await toggle.click();
      await page.waitForTimeout(120);
      h = await findByText(".nav-more-menu button", label);
      if (!h) { const items = await page.$$eval(".nav-more-menu button", (bs) => bs.map((b) => b.innerText)); return { ok: false, error: `no menu item ${label}`, items }; }
      const d = await describe(h);
      if (d.disabled) { await toggle.click(); return { ok: false, error: "menu item DISABLED", element: d }; }
      await h.click();
      return { ok: true, via: "more", element: d };
    }
    case "slider": {
      // slider <selector> :: <value>  — moves a range input by keyboard/fill only if enabled
      const h = await page.$(a.trim());
      if (!h) return { ok: false, error: `no slider ${a.trim()}` };
      const d = await describe(h);
      const disabled = await h.evaluate((el) => el.disabled);
      if (disabled) return { ok: false, error: "slider is DISABLED — not moving", element: d };
      await h.evaluate((el, v) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        setter.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }, b.trim());
      return { ok: true, note: "moved via input event on an ENABLED control", element: await describe(h) };
    }
    case "sliderKeys": {
      // sliderKeys <selector> :: <n presses of ArrowRight>  — genuine keyboard input
      const h = await page.$(a.trim());
      if (!h) return { ok: false, error: `no slider ${a.trim()}` };
      const disabled = await h.evaluate((el) => el.disabled);
      if (disabled) return { ok: false, error: "slider is DISABLED", element: await describe(h) };
      const before = await h.evaluate((el) => el.value);
      await h.focus();
      const n = Number(b.trim());
      for (let i = 0; i < Math.abs(n); i += 1) await page.keyboard.press(n > 0 ? "ArrowRight" : "ArrowLeft");
      const after = await h.evaluate((el) => el.value);
      return { ok: true, before, after, note: "real keyboard input on an enabled control" };
    }
    default: return { ok: false, error: `unknown verb ${verb}` };
  }
}

say("driver ready");
fs.writeFileSync(path.join(ROOT, "READY"), "1");

let stop = false;
while (!stop) {
  const files = fs.readdirSync(CMDS).filter((f) => f.endsWith(".txt")).sort();
  for (const f of files) {
    const id = f.replace(/\.txt$/, "");
    const outPath = path.join(OUT, `${id}.json`);
    if (fs.existsSync(outPath)) continue;
    const body = fs.readFileSync(path.join(CMDS, f), "utf8");
    const lines = body.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    const results = [];
    for (const line of lines) {
      if (line === "QUIT") { stop = true; break; }
      say(`> ${line}`);
      let r;
      try { r = await run(line); } catch (e) { r = { ok: false, error: String(e).slice(0, 600) }; }
      say(`< ${JSON.stringify(r).slice(0, 1200)}`);
      results.push({ line, ...r });
      if (!r.ok) break;
    }
    fs.writeFileSync(outPath, JSON.stringify({ results, errorCount: errors.length, newErrors: errors.slice(-5) }, null, 1));
  }
  if (stop) break;
  await new Promise((r) => setTimeout(r, 150));
}

fs.writeFileSync(path.join(ROOT, "errors.json"), JSON.stringify(errors, null, 1));
await browser.close();
