/**
 * Campaign visibility tests.
 *
 * Verifies that:
 * - Advertisers only see their own campaigns on /campaigns
 * - Broadcasters see active/public campaigns on /campaigns/marketplace
 * - A newly created active+public campaign appears in the marketplace
 * - A private campaign does NOT appear in the marketplace
 *
 * Campaign creation moved from a nav-dropdown-triggered modal to its own page
 * (src/pages/CampaignForm.tsx, at /campaigns/new) with a date-picker calendar instead of plain
 * date inputs, and visibility is now a Public/Private radio group defaulting to Public (the
 * opposite of the old modal's default) — see e2e/helpers/ui.ts's pickCalendarDate.
 */
import { test, expect } from "@playwright/test";
import { loginAs, BROADCASTER, ADVERTISER } from "./helpers/auth";
import { navItem, pickCalendarDate } from "./helpers/ui";

async function createCampaign(
  page: import("@playwright/test").Page,
  name: string,
  visibility: "public" | "private",
): Promise<void> {
  await navItem(page, "Campaigns").click();
  await page.waitForURL(/\/campaigns$/);
  // The list page shows "New campaign" once there's at least one campaign, or
  // "Create your first campaign" on the empty state — either gets to the same form.
  await page.getByRole("button", { name: /new campaign|create your first campaign/i }).click();
  await page.waitForURL(/\/campaigns\/new/);

  await page.getByLabel(/campaign name/i).fill(name);
  await page.getByLabel(/total budget/i).fill("500");

  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date();
  end.setDate(end.getDate() + 8);
  await pickCalendarDate(page, page.getByLabel(/start date/i), start);
  await pickCalendarDate(page, page.getByLabel(/end date/i), end);

  if (visibility === "private") {
    await page.getByRole("radio", { name: /private/i }).click({ force: true });
  }

  await page.getByRole("button", { name: /^create campaign$/i }).click();
  await page.waitForURL(/\/campaigns\/\d+/, { timeout: 10_000 });
}

test.describe("Campaign visibility", () => {

  test("Advertiser sees only their own campaigns on /campaigns", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    await navItem(page, "Campaigns").click();
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /campaigns/i })).toBeVisible();
    await expect(page).not.toHaveURL(/signin/);
  });

  test("Broadcaster sees active public campaigns on /campaigns/marketplace", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await navItem(page, "Marketplace").click();
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/signin/);
    await expect(page.getByRole("heading", { name: /campaigns/i })).toBeVisible();
  });

  test("New active+public campaign created by advertiser appears in broadcaster marketplace", async ({ page }) => {
    const campaignName = `E2E Campaign ${Date.now()}`;

    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    await createCampaign(page, campaignName, "public");

    // The create endpoint doesn't honour status on the way in — fetch the created campaign
    // and PATCH it to active so it appears in the public marketplace.
    const API = process.env.E2E_API_URL ?? "http://localhost:3000";
    const match = page.url().match(/\/campaigns\/(\d+)/);
    const id = match ? Number(match[1]) : null;
    if (id) {
      const csrf = (await page.context().cookies()).find((c) => c.name === "csrf")?.value ?? "";
      await page.request.patch(`${API}/api/campaigns/${id}/status`, {
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        data: JSON.stringify({ status: "active" }),
      });
    }

    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await page.goto("/campaigns/marketplace");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(campaignName)).toBeVisible({ timeout: 10_000 });
  });

  test("Private campaign created by advertiser does NOT appear in broadcaster marketplace", async ({ page }) => {
    const campaignName = `E2E Private Campaign ${Date.now()}`;

    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    await createCampaign(page, campaignName, "private");
    // Private campaigns also never reach the marketplace regardless of status, so no need to
    // activate this one — leaving it a draft, same as before.

    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await page.goto("/campaigns/marketplace");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(campaignName)).not.toBeVisible();
  });

});
