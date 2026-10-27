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
 * Authenticates by hitting the API directly. page.request shares the browser
 * context's cookie jar, so the httpOnly auth cookie from signin is sent by the
 * page too. Much faster than filling the sign-in form for every role switch.
 */
export async function loginAs(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Drop the previous role's cookie before switching users.
  await page.context().clearCookies();

  const res = await page.request.post(`${API}/api/signin`, {
    data: { email, password },
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok()) {
    throw new Error(`Signin failed for ${email}: ${res.status()} ${await res.text()}`);
  }

  await page.goto(`${APP}/dashboard`);
  await page.waitForLoadState("networkidle");
  // Confirm auth succeeded — sign-in page means the profile call rejected the cookie.
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}

export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto(`${APP}/signin`);
}
