import { Page } from "@playwright/test";

const API = process.env.E2E_API_URL ?? "http://localhost:3000";
const APP = process.env.E2E_APP_URL ?? "http://localhost:8080";

// Credentials — set in .env.test or as environment variables before running.
export const BROADCASTER = {
  email: process.env.E2E_BROADCASTER_EMAIL ?? "",
  password: process.env.E2E_BROADCASTER_PASSWORD ?? "",
};

export const ADVERTISER = {
  email: process.env.E2E_ADVERTISER_EMAIL ?? "",
  password: process.env.E2E_ADVERTISER_PASSWORD ?? "",
};

export const DUAL_ROLE = {
  email: process.env.E2E_DUAL_EMAIL ?? "",
  password: process.env.E2E_DUAL_PASSWORD ?? "",
};

/**
 * Authenticates by hitting the API directly and injecting the JWT into
 * localStorage. Much faster than filling the sign-in form for every role switch.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Hit the signin endpoint directly — no need to drive the UI form.
  const res = await page.request.post(`${API}/api/signin`, {
    data: { email, password },
    headers: { "Content-Type": "application/json" },
  });

  const body = await res.json();
  // The API wraps in { success, token, user } or { success, data: { token, user } }
  const token: string =
    body?.data?.token ?? body?.token ?? (() => { throw new Error(`Signin failed for ${email}: ${JSON.stringify(body)}`); })();

  // If we're already on the app origin we can set localStorage directly.
  // Otherwise navigate there first to establish the correct storage scope.
  // Navigate to the app origin if we're not already there (includes about:blank).
  const currentUrl = page.url();
  if (!currentUrl.startsWith(APP)) {
    await page.goto(APP);
  }

  await page.evaluate((t) => {
    localStorage.removeItem("adtua_token"); // clear any stale session
    localStorage.setItem("adtua_token", t);
  }, token);

  await page.goto(`${APP}/dashboard`);
  await page.waitForLoadState("networkidle");
  // Confirm auth succeeded — sign-in page means the profile call rejected the token.
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.removeItem("adtua_token"));
  await page.goto(`${APP}/signin`);
}
