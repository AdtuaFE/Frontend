import { Page } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:3000";

/**
 * Space/screen/slot/campaign creation drives real UI elsewhere in the suite, but building that
 * graph from scratch through the AddSpace wizard or CampaignForm for every test that merely
 * *needs* a space or campaign to exist would make this setup both slow and fragile (file uploads,
 * a slot grid, a date-picker calendar). These helpers create that fixture data directly through
 * the API instead — the same backend the UI calls, just skipping the UI for pure setup.
 *
 * Call these only while `page`'s browser context already holds a valid signin cookie for the
 * right role (i.e. after `loginAs`) — they reuse that cookie jar via `page.request`, and read the
 * CSRF cookie it leaves behind the same way `src/lib/api.ts` does for its own double-submit check.
 */
async function csrfHeaders(page: Page): Promise<Record<string, string>> {
  const csrf = (await page.context().cookies()).find(c => c.name === "csrf")?.value ?? "";
  return { "Content-Type": "application/json", "X-CSRF-Token": csrf };
}

/**
 * Mirrors src/lib/api.ts's own `parseResponse` unwrapping: `{success, data: {...}}` returns
 * `data`; a single-resource endpoint's `{success, campaign: {...}}` (or any other one-key name)
 * returns that key's value instead — there's no single fixed envelope shape across endpoints.
 */
function unwrap<T>(body: Record<string, unknown>): T {
  if (body["data"] !== undefined) return body["data"] as T;
  const { success: _s, ...rest } = body;
  const keys = Object.keys(rest);
  if (keys.length === 1) {
    const val = rest[keys[0]];
    if (val !== null && typeof val === "object") return val as T;
  }
  return rest as T;
}

async function postJson<T>(page: Page, path: string, data: unknown): Promise<T> {
  const res = await page.request.post(`${API}${path}`, { headers: await csrfHeaders(page), data: JSON.stringify(data) });
  const body = await res.json();
  if (!res.ok()) throw new Error(`POST ${path} failed: ${res.status()} ${JSON.stringify(body)}`);
  return unwrap<T>(body);
}

async function patchJson<T>(page: Page, path: string, data: unknown): Promise<T> {
  const res = await page.request.patch(`${API}${path}`, { headers: await csrfHeaders(page), data: JSON.stringify(data) });
  const body = await res.json();
  if (!res.ok()) throw new Error(`PATCH ${path} failed: ${res.status()} ${JSON.stringify(body)}`);
  return unwrap<T>(body);
}

export type SeededSpace = { id: number; name: string };
export type SeededScreen = { id: number; space_id: number; label: string };
export type SeededSlot = { id: number; screen_id: number; day_of_week: number };

/** Caller must already be signed in as a broadcaster (via `loginAs`). */
export async function seedSpace(page: Page, overrides: Partial<Record<string, unknown>> = {}): Promise<SeededSpace> {
  return postJson<SeededSpace>(page, "/api/spaces", {
    name: `E2E Space ${Date.now()}`,
    space_type: "digital_screen",
    display_type: "digital_led",
    city: "Bloomington",
    country: "US",
    cpm: 10,
    ...overrides,
  });
}

export async function seedScreen(page: Page, spaceId: number, label = "Screen 1"): Promise<SeededScreen> {
  return postJson<SeededScreen>(page, `/api/spaces/${spaceId}/screens`, { label });
}

/**
 * `dayOfWeek`: 1 = Monday .. 7 = Sunday. Defaults price/capacity low and round so a booked play
 * count stays easy to reason about in assertions ($0.50/play at 10 plays/day = $5/matching day).
 */
export async function seedSlot(
  page: Page,
  spaceId: number,
  screenId: number,
  dayOfWeek: number,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<SeededSlot> {
  return postJson<SeededSlot>(page, `/api/spaces/${spaceId}/screens/${screenId}/slots`, {
    day_of_week: dayOfWeek,
    label: `Slot day ${dayOfWeek}`,
    start_time: "08:00:00",
    end_time: "10:00:00",
    est_impressions_per_playback: 100,
    daily_capacity_playbacks: 100,
    total_price: 50,
    ...overrides,
  });
}

/** A `[startDate, endDate]` pair (ISO, inclusive) spanning 7 full days from `daysFromNow`, so
 * every day-of-week value occurs at least once — callers don't need to compute a matching weekday. */
export function weekWindow(daysFromNow = 3): [string, string] {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + daysFromNow);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const iso = (d: Date) => d.toISOString().split("T")[0];
  return [iso(start), iso(end)];
}

export type SeededCampaign = { id: number; name: string };

/** Caller must already be signed in as an advertiser (via `loginAs`). */
export async function seedCampaign(page: Page, overrides: Partial<Record<string, unknown>> = {}): Promise<SeededCampaign> {
  const [start, end] = weekWindow(0);
  return postJson<SeededCampaign>(page, "/api/campaigns", {
    name: `E2E Campaign ${Date.now()}`,
    total_budget: 5000,
    start_date: start,
    end_date: end,
    visibility: "public",
    ad_type: "image",
    ...overrides,
  });
}

/** The create endpoint doesn't honour `status` on the way in — flip it after, same as campaign-visibility.spec.ts already does. */
export async function activateCampaign(page: Page, id: number): Promise<void> {
  await patchJson(page, `/api/campaigns/${id}/status`, { status: "active" });
}
