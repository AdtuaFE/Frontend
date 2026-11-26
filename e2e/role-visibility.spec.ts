/**
 * Role-visibility tests.
 *
 * Verifies that each role sees the correct nav items, pages, and content
 * — and cannot access what belongs to the other role.
 *
 * The nav redesign (src/components/AppLayout.tsx) replaced a single "Browse" button with a
 * hover-dropdown for quick actions with separate, always-visible sidebar buttons per role:
 * Broadcaster gets "My Spaces" and "Marketplace"; Advertiser gets "Browse Spaces" and
 * "Campaigns". Both also always see "Dashboard" and "Bookings". A dual-role user sees both
 * roles' items at once, grouped under "Advertiser"/"Broadcaster" headers (open by default —
 * no hover needed). There is no nav-level "New space" or "New campaign" shortcut any more;
 * those actions live on the destination pages themselves.
 */
import { test, expect } from "@playwright/test";
import { loginAs, BROADCASTER, ADVERTISER, DUAL_ROLE } from "./helpers/auth";
import { seedSpace } from "./helpers/seed";
import { sidenav, navItem as nav } from "./helpers/ui";

// ─── Broadcaster visibility ───────────────────────────────────────────────────

test.describe("Broadcaster", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
  });

  test("sees My Spaces and Marketplace in the nav", async ({ page }) => {
    await expect(nav(page, "My Spaces")).toBeVisible();
    await expect(nav(page, "Marketplace")).toBeVisible();
  });

  test("does NOT see Browse Spaces or Campaigns in the nav", async ({ page }) => {
    await expect(nav(page, "Browse Spaces")).not.toBeVisible();
    await expect(nav(page, "Campaigns")).not.toBeVisible();
  });

  test("can reach /spaces (My Spaces)", async ({ page }) => {
    await nav(page, "My Spaces").click();
    await expect(page).toHaveURL(/\/spaces$/);
    await expect(page).not.toHaveURL(/signin/);
  });

  test("can reach /campaigns/marketplace", async ({ page }) => {
    await nav(page, "Marketplace").click();
    await expect(page).toHaveURL(/\/campaigns\/marketplace/);
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

  test("sees Browse Spaces and Campaigns in the nav", async ({ page }) => {
    await expect(nav(page, "Browse Spaces")).toBeVisible();
    await expect(nav(page, "Campaigns")).toBeVisible();
  });

  test("does NOT see My Spaces or Marketplace in the nav", async ({ page }) => {
    await expect(nav(page, "My Spaces")).not.toBeVisible();
    await expect(nav(page, "Marketplace")).not.toBeVisible();
  });

  test("can reach /campaigns and sees their own campaigns", async ({ page }) => {
    await nav(page, "Campaigns").click();
    await expect(page).toHaveURL(/\/campaigns$/);
    await expect(page).not.toHaveURL(/signin/);
    // "Campaigns" once there's at least one, or the empty state's own heading with none yet —
    // either way, confirms the page rendered rather than redirecting or erroring.
    await expect(page.getByRole("heading", { name: /campaigns|plan your first campaign/i })).toBeVisible();
  });

  test("can reach /browse", async ({ page }) => {
    await nav(page, "Browse Spaces").click();
    await expect(page).toHaveURL(/\/browse/);
    await expect(page).not.toHaveURL(/signin/);
  });
});

// ─── Dual-role visibility ─────────────────────────────────────────────────────

const hasDualCreds = !!DUAL_ROLE.email && !DUAL_ROLE.email.includes("example.com");

test.describe("Dual-role user", () => {
  test.beforeEach(async ({ page }) => {
    if (!hasDualCreds) test.skip(true, "E2E_DUAL_EMAIL not configured — skipping dual-role tests");
    await loginAs(page, DUAL_ROLE.email, DUAL_ROLE.password);
  });

  test("sees both roles' nav items at once, grouped by role", async ({ page }) => {
    await expect(sidenav(page).getByText("Advertiser", { exact: true })).toBeVisible();
    await expect(sidenav(page).getByText("Broadcaster", { exact: true })).toBeVisible();
    await expect(nav(page, "Browse Spaces")).toBeVisible();
    await expect(nav(page, "Campaigns")).toBeVisible();
    await expect(nav(page, "My Spaces")).toBeVisible();
    await expect(nav(page, "Marketplace")).toBeVisible();
  });

  test("sees their new space on the My Spaces page (/spaces, not /browse)", async ({ page }) => {
    // My Spaces is its own page now (src/pages/MySpaces.tsx), not a section of Browse —
    // seeded directly through the API, since the space-creation wizard itself isn't this test's
    // concern.
    const space = await seedSpace(page, { name: `E2E Dual Space ${Date.now()}` });
    await nav(page, "My Spaces").click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /my spaces/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(space.name)).toBeVisible({ timeout: 10_000 });
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
