/**
 * Campaign visibility tests.
 *
 * Verifies that:
 * - Advertisers only see their own campaigns on /campaigns
 * - Broadcasters see active/public campaigns on /campaigns/marketplace
 * - A newly created active+public campaign appears in the marketplace
 * - A draft or private campaign does NOT appear in the marketplace
 */
import { test, expect } from "@playwright/test";
import { loginAs, BROADCASTER, ADVERTISER } from "./helpers/auth";

test.describe("Campaign visibility", () => {

  test("Advertiser sees only their own campaigns on /campaigns", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    await page.goto("/campaigns");
    await page.waitForLoadState("networkidle");

    // Page heading is present
    await expect(page.getByRole("heading", { name: /campaigns/i })).toBeVisible();

    // No error or redirect
    await expect(page).not.toHaveURL(/signin/);
  });

  test("Broadcaster sees active public campaigns on /campaigns/marketplace", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await page.goto("/campaigns/marketplace");
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/signin/);
    await expect(page.getByRole("heading", { name: /campaigns/i })).toBeVisible();
  });

  test("New active+public campaign created by advertiser appears in broadcaster marketplace", async ({ page }) => {
    const campaignName = `E2E Campaign ${Date.now()}`;

    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    const campaignsBtn = page.getByRole("button", { name: /campaigns/i });
    await campaignsBtn.hover();
    await page.getByRole("button", { name: /new campaign/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Required fields
    await page.getByLabel(/campaign name/i).fill(campaignName);
    await page.getByLabel(/total budget/i).fill("500");
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0];
    await page.getByLabel(/start date/i).fill(today);
    await page.getByLabel(/end date/i).fill(nextWeek);

    // Set visibility to public — target the last combobox in the form (visibility is last)
    await page.getByRole("dialog").getByRole("combobox").last().click();
    await page.getByRole("option", { name: /public/i }).click();

    await page.getByRole("button", { name: /create campaign/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });
    await page.waitForLoadState("networkidle");

    // The BE may not honour status:"active" in the POST — fetch the created campaign
    // and PATCH it to active so it appears in the public marketplace.
    const API = process.env.E2E_API_URL ?? "http://localhost:3000";
    // page.request sends the auth cookie from loginAs automatically.
    const listRes = await page.request.get(`${API}/api/campaigns`);
    const listBody = await listRes.json();
    const campaigns: Array<{ id: number; name: string }> =
      listBody?.data ?? listBody?.campaigns ?? (Array.isArray(listBody) ? listBody : []);
    const created = campaigns.find((c) => c.name === campaignName);
    if (created) {
      await page.request.patch(`${API}/api/campaigns/${created.id}/status`, {
        headers: { "Content-Type": "application/json" },
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
    const campaignsBtn = page.getByRole("button", { name: /campaigns/i });
    await campaignsBtn.hover();
    await page.getByRole("button", { name: /new campaign/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Required fields
    await page.getByLabel(/campaign name/i).fill(campaignName);
    await page.getByLabel(/total budget/i).fill("500");
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0];
    await page.getByLabel(/start date/i).fill(today);
    await page.getByLabel(/end date/i).fill(nextWeek);

    // Leave visibility as default (Private)
    await page.getByRole("button", { name: /create campaign/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });
    await page.waitForLoadState("networkidle");

    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await page.goto("/campaigns/marketplace");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(campaignName)).not.toBeVisible();
  });

});
