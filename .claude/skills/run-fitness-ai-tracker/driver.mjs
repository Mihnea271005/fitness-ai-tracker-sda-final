// Agent driver for the Fitness AI Tracker: drives the running dev server in headless
// Microsoft Edge (playwright-core, channel "msedge" — no browser download needed).
//
// CLI (run from the repo root):
//   node .claude/skills/run-fitness-ai-tracker/driver.mjs smoke
//   node .claude/skills/run-fitness-ai-tracker/driver.mjs shot progress --sample --mobile --dark
// Library (import it in your own script for longer flows):
//   import { open, signup, onboard, addSampleData, deleteAccount } from "./driver.mjs";
//
// Every run signs up its own throwaway @example.com account and deletes it at the end
// (Settings → Delete account cascades to all of its data).

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR ?? join(dirname(fileURLToPath(import.meta.url)), "shots");

/**
 * Opens headless Edge. Options: { mobile } 390×844 touch, { dark }, { reducedMotion }.
 * `errors` collects console errors, page exceptions and 5xx responses.
 */
export async function open(area = "run", opts = {}) {
  const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? "msedge", headless: true });
  const context = await browser.newContext({
    viewport: opts.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    isMobile: !!opts.mobile,
    hasTouch: !!opts.mobile,
    colorScheme: opts.dark ? "dark" : "light",
    reducedMotion: opts.reducedMotion ? "reduce" : "no-preference",
    timezoneId: "Europe/Bucharest",
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(`[console] ${m.text()} @ ${page.url()}`));
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message} @ ${page.url()}`));
  page.on("response", (r) => r.status() >= 500 && errors.push(`[http ${r.status()}] ${r.url()}`));
  const dir = join(SHOTS, area);
  mkdirSync(dir, { recursive: true });
  let n = 0;
  const shot = async (name) => {
    const file = join(dir, `${String(++n).padStart(2, "0")}-${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  };
  return { browser, context, page, shot, errors, close: () => browser.close() };
}

/** Waits until the dev server has finished streaming the page (no "Rendering…" indicator, a heading shown). */
export async function settle(page) {
  await page.getByRole("heading").first().waitFor();
  await page.waitForLoadState("networkidle").catch(() => {});
}

/** Signs up a fresh throwaway account through the real form. Lands on /onboarding. */
export async function signup(page, tag = "run") {
  const email = `e2e-${tag}-${Date.now()}@example.com`;
  const password = "E2e-test-password-123";
  await page.goto(`${BASE}/signup`);
  await page.getByLabel("Name").fill(`E2E ${tag}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/onboarding/);
  return { email, password };
}

/** Completes onboarding with the defaults (3 steps) plus a body weight, and lands on /home. */
export async function onboard(page, { weight = "80", height = "180" } = {}) {
  await page.getByLabel("Height (cm)").fill(height);
  await page.getByLabel(/^Weight/).fill(weight);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Build my plan" }).click();
  await page.waitForURL(/\/home/);
}

/** Adds ~12 weeks of sample workouts (only offered on an empty account). */
export async function addSampleData(page) {
  await page.goto(`${BASE}/home`);
  await page.getByRole("button", { name: "Add 12 weeks of sample workouts" }).click();
  await page.getByRole("heading", { name: "Recent workouts" }).waitFor({ timeout: 60_000 });
}

/** Logs in through the real form. */
export async function login(page, email, password) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /log in|sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

/** Deletes the signed-in account via Settings: removes all of its data. */
export async function deleteAccount(page) {
  await page.goto(`${BASE}/settings`);
  await page.getByText(/delete account/i).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /delete/i }).last().click();
  await page.waitForURL((u) => u.pathname === "/" || u.pathname.startsWith("/login"));
}

/* ------------------------------------------------------------------ CLI */

async function smoke() {
  const t = await open("smoke");
  try {
    await signup(t.page, "smoke");
    await onboard(t.page);
    await settle(t.page);
    console.log("home (empty):", await t.shot("home-empty"));
    await addSampleData(t.page);
    for (const path of ["/home", "/progress", "/history", "/achievements", "/settings"]) {
      await t.page.goto(`${BASE}${path}`);
      await settle(t.page);
      console.log(`${path}:`, await t.shot(path.slice(1)));
    }
    // A workout detail page (opened from History).
    await t.page.goto(`${BASE}/history`);
    await t.page.locator('a[href^="/history/"]').first().click();
    await settle(t.page);
    console.log("workout detail:", await t.shot("workout-detail"));
  } finally {
    await deleteAccount(t.page).catch((e) => console.log("CLEANUP FAILED:", e.message));
    console.log("errors:", t.errors.length ? t.errors : "none");
    await t.close();
    process.exitCode = t.errors.length ? 1 : 0;
  }
}

async function shotOne(path, flags) {
  const t = await open("shot", { mobile: flags.has("--mobile"), dark: flags.has("--dark"), reducedMotion: flags.has("--reduced-motion") });
  try {
    await signup(t.page, "shot");
    await onboard(t.page);
    if (flags.has("--sample")) await addSampleData(t.page);
    await t.page.goto(`${BASE}${path}`);
    await settle(t.page);
    console.log(await t.shot(path.replace(/\W+/g, "_").replace(/^_|_$/g, "") || "root"));
  } finally {
    await deleteAccount(t.page).catch((e) => console.log("CLEANUP FAILED:", e.message));
    console.log("errors:", t.errors.length ? t.errors : "none");
    await t.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [cmd, arg, ...rest] = process.argv.slice(2);
  // App path without the leading slash ("progress", "history/<id>"): Git Bash on Windows
  // rewrites arguments starting with "/" into C:/Program Files/Git/... paths.
  const path = arg && !arg.startsWith("--") ? `/${arg.replace(/^\/+/, "")}` : null;
  if (cmd === "smoke") await smoke();
  else if (cmd === "shot" && path && !/^\/[A-Za-z]:/.test(path)) await shotOne(path, new Set(rest));
  else {
    console.log("usage: driver.mjs smoke | driver.mjs shot <app-path without leading slash, e.g. progress> [--sample] [--mobile] [--dark] [--reduced-motion]");
    process.exitCode = 2;
  }
}
