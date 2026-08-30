/**
 * Role-visibility tests.
 *
 * Verifies that each role sees the correct nav items, pages, and content
 * — and cannot access what belongs to the other role.
 */
import { test, expect } from "@playwright/test";
import { loginAs, logout, BROADCASTER, ADVERTISER, DUAL_ROLE } from "./helpers/auth";

// ─── Broadcaster visibility ───────────────────────────────────────────────────

test.describe("Broadcaster", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
  });

  test("sees Browse with dropdown containing New Space option", async ({ page }) => {
    const browseBtn = page.getByRole("button", { name: /browse/i }).first();
    await expect(browseBtn).toBeVisible();
    await browseBtn.hover();
    await expect(page.getByRole("button", { name: /browse spaces/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new space/i })).toBeVisible();
  });

  test("sees Campaigns nav with Browse marketplace option", async ({ page }) => {
    const campaignsBtn = page.getByRole("button", { name: /campaigns/i });
    await campaignsBtn.hover();
    await expect(page.getByRole("button", { name: /browse marketplace/i })).toBeVisible();
  });

  test("does NOT see All Campaigns or New Campaign in nav", async ({ page }) => {
    const campaignsBtn = page.getByRole("button", { name: /campaigns/i });
    await campaignsBtn.hover();
    await expect(page.getByRole("button", { name: /all campaigns/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /new campaign/i })).not.toBeVisible();
  });

  test("can reach /browse and sees My Spaces section", async ({ page }) => {
    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: /my spaces/i })).toBeVisible();
  });

  test("can reach /campaigns/marketplace", async ({ page }) => {
    await page.goto("/campaigns/marketplace");
    await expect(page).not.toHaveURL(/signin/);
    await expect(page.getByRole("heading", { name: /campaigns/i })).toBeVisible();
  });

  test("cannot reach /campaigns (advertiser-only) — redirected away", async ({ page }) => {
    await page.goto("/campaigns");
    // Should be redirected — not stay on /campaigns serving private data
    await expect(page).not.toHaveURL("/campaigns");
  });
});

// ─── Advertiser visibility ────────────────────────────────────────────────────

test.describe("Advertiser", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
  });

  test("sees Browse as a plain button (no dropdown)", async ({ page }) => {
    // Advertiser Browse has no dropdown — hover should show no sub-menu
    const browseBtn = page.getByRole("button", { name: /^browse$/i });
    await expect(browseBtn).toBeVisible();
    await browseBtn.hover();
    await expect(page.getByRole("button", { name: /new space/i })).not.toBeVisible();
  });

  test("sees All Campaigns and New Campaign in Campaigns dropdown", async ({ page }) => {
    const campaignsBtn = page.getByRole("button", { name: /campaigns/i });
    await campaignsBtn.hover();
    await expect(page.getByRole("button", { name: /all campaigns/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new campaign/i })).toBeVisible();
  });

  test("does NOT see Browse marketplace in nav", async ({ page }) => {
    const campaignsBtn = page.getByRole("button", { name: /campaigns/i });
    await campaignsBtn.hover();
    await expect(page.getByRole("button", { name: /browse marketplace/i })).not.toBeVisible();
  });

  test("can reach /campaigns and sees their own campaigns", async ({ page }) => {
    await page.goto("/campaigns");
    await expect(page).not.toHaveURL(/signin/);
    await expect(page.getByRole("heading", { name: /campaigns/i })).toBeVisible();
  });

  test("can reach /browse and sees spaces (no My Spaces section)", async ({ page }) => {
    await page.goto("/browse");
    // Advertiser has no own spaces — My Spaces heading should not appear
    await expect(page.getByRole("heading", { name: /my spaces/i })).not.toBeVisible();
  });
});

// ─── Dual-role visibility ─────────────────────────────────────────────────────

const hasDualCreds = !!DUAL_ROLE.email && !DUAL_ROLE.email.includes("example.com");

test.describe("Dual-role user", () => {
  test.beforeEach(async ({ page }) => {
    if (!hasDualCreds) test.skip(true, "E2E_DUAL_EMAIL not configured — skipping dual-role tests");
    await loginAs(page, DUAL_ROLE.email, DUAL_ROLE.password);
  });

  test("sees both All Campaigns and Browse marketplace in Campaigns dropdown", async ({ page }) => {
    const campaignsBtn = page.getByRole("button", { name: /campaigns/i });
    await campaignsBtn.hover();
    await expect(page.getByRole("button", { name: /all campaigns/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /browse marketplace/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /new campaign/i })).toBeVisible();
  });

  test("sees Browse dropdown with New Space option", async ({ page }) => {
    const browseBtn = page.getByRole("button", { name: /browse/i }).first();
    await browseBtn.hover();
    await expect(page.getByRole("button", { name: /new space/i })).toBeVisible();
  });

  test("sees My Spaces section on Browse page after creating a space", async ({ page }) => {
    // My Spaces only renders when the broadcaster has at least one space.
    // Create one via the nav dropdown first.
    const browseBtn = page.getByRole("button", { name: /browse/i }).first();
    await browseBtn.hover();
    await page.getByRole("button", { name: /new space/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel(/space name/i).fill(`Dual E2E Space ${Date.now()}`);
    await page.getByText("Select type").click();
    await page.getByRole("option", { name: /digital screen/i }).click();
    await page.getByText("Select display type").click();
    await page.getByRole("option", { name: /digital led/i }).click();
    await page.getByLabel(/^city/i).fill("London");
    await page.getByLabel(/country/i).fill("UK");
    await page.getByLabel(/cpm/i).fill("10");
    const createBtn = page.getByRole("button", { name: /add space/i });
    await createBtn.scrollIntoViewIfNeeded();
    await createBtn.click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });

    await page.goto("/browse");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /my spaces/i })).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Unauthenticated access ───────────────────────────────────────────────────

test.describe("Unauthenticated", () => {
  test("protected routes redirect to /signin", async ({ page }) => {
    for (const route of ["/dashboard", "/browse", "/campaigns", "/bookings"]) {
      await page.goto(route);
      await expect(page).toHaveURL(/signin/);
    }
  });
});
