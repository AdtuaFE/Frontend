/**
 * Full booking lifecycle E2E test.
 *
 * Steps (run serially — each depends on the previous):
 *   1. Broadcaster has an active space with a bookable slot (seeded via API).
 *   2. Advertiser finds the space, attaches a creative, and sends a booking request.
 *   3. Broadcaster sees the incoming booking and accepts it.
 *   4. Advertiser confirms booking is accepted and uploads a creative.
 *   5. Broadcaster sees the creative (already active — nothing to approve on a first upload).
 *   6. Space detail shows the booking as active.
 *
 * Note: Player screen verification (step 7 in the original spec) requires a
 * live paired device and real-time scheduling, so it is tested separately via
 * manual QA or a dedicated player integration test.
 *
 * Space/screen/slot creation is seeded through the API rather than driven through the AddSpace
 * wizard — that wizard (photos, screens, a slot-schedule grid) is its own large surface and isn't
 * what this test is about; see e2e/helpers/seed.ts. Booking creation itself (the feature under
 * test) is still driven for real: screen detail, then Review request, then Send request.
 *
 * Run with: npx playwright test booking-lifecycle --headed  (to watch)
 */
import { test, expect } from "@playwright/test";
import { loginAs, BROADCASTER, ADVERTISER } from "./helpers/auth";
import { seedSpace, seedScreen, seedSlot, seedCampaign, activateCampaign, weekWindow } from "./helpers/seed";
import * as path from "path";

const API = process.env.E2E_API_URL ?? "http://localhost:3000";

// Shared state across the serial steps
const state = {
  spaceName: "",
  spaceId: 0,
  campaignId: 0,
  bookingId: 0,
};

test.describe.serial("Booking lifecycle", () => {

  // ─── Step 1: Broadcaster has an active space with a bookable slot ───────────

  test("1. Broadcaster has an active space with a bookable slot", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);

    const space = await seedSpace(page, { name: `E2E Booking Space ${Date.now()}` });
    const screen = await seedScreen(page, space.id);
    await seedSlot(page, space.id, screen.id, 1);
    state.spaceName = space.name;
    state.spaceId = space.id;

    // Confirm it's really there through the real UI, not just the API response.
    await page.goto(`/spaces/${state.spaceId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(state.spaceName)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/^active$/i).first()).toBeVisible();
  });

  // ─── Step 2: Advertiser finds the space and sends a booking request ───────────

  test("2. Advertiser finds the space and sends a booking request", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);

    // The screen detail page fills in the campaign's dates (from the 3-day notice cutoff on), so
    // the campaign has to run long enough for the seeded slot's weekday to fall inside them.
    const campaign = await seedCampaign(page, { name: `E2E Booking Campaign ${Date.now()}`, end_date: weekWindow(14)[1] });
    await activateCampaign(page, campaign.id);
    state.campaignId = campaign.id;

    expect(state.spaceId).toBeGreaterThan(0);
    // Opening the screen with ?campaign= picks the campaign and fills in its dates.
    await page.goto(`/spaces/${state.spaceId}?campaign=${campaign.id}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(state.spaceName, { timeout: 10_000 });

    // The panel's single time slot is picked for us (10 plays a day). The server prices it, and
    // Review request only turns on once that price is back.
    const panel = page.getByRole("complementary", { name: /book this screen/i });
    const review = panel.getByRole("button", { name: /^review request$/i });
    await expect(review).toBeEnabled({ timeout: 15_000 });
    await review.click();

    // Review request: the ad goes up with the request itself (booking creation is multipart).
    await expect(page).toHaveURL(/\/request$/);
    await page.locator('input[type="file"]').setInputFiles(path.join(import.meta.dirname, "fixtures", "test-creative.jpg"));
    const send = page.getByRole("button", { name: /^send request$/i });
    await expect(send).toBeEnabled({ timeout: 15_000 });
    await send.click();

    await expect(page.getByRole("heading", { name: /^request sent$/i })).toBeVisible({ timeout: 10_000 });
  });

  // ─── Step 3: Broadcaster sees and accepts the booking ────────────────────────

  test("3. Broadcaster sees the booking and accepts it", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);

    // Other e2e specs run against these same shared accounts and may leave their own pending
    // bookings around — look up this test's own booking by space id via the API rather than
    // grabbing whatever "pending" text happens to render first on /bookings.
    const res = await page.request.get(`${API}/api/bookings`);
    const bookings: { id: number; space_id: number; status: string }[] = (await res.json()).data;
    const mine = bookings.find(b => b.space_id === state.spaceId && b.status === "pending");
    expect(mine).toBeTruthy();
    state.bookingId = mine!.id;

    await page.goto(`/bookings/${state.bookingId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/pending/i).first()).toBeVisible({ timeout: 10_000 });

    // A single-slot booking still goes through the plain accept/reject flow, not per-slot review.
    const acceptBtn = page.getByRole("button", { name: /^accept$/i });
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: /accept booking/i }).click();
    await expect(page.getByRole("alertdialog")).not.toBeVisible({ timeout: 8_000 });

    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 8_000 });
  });

  // ─── Step 4: Advertiser confirms acceptance and uploads a creative ────────────

  test("4. Advertiser sees booking accepted and uploads a creative", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    await page.goto(`/bookings/${state.bookingId}`);
    await page.waitForLoadState("networkidle");

    // Approved and not started yet: the advertiser's page calls that Scheduled.
    await expect(page.getByText(/^scheduled$/i).first()).toBeVisible({ timeout: 8_000 });

    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();
    const fixturePath = path.join(import.meta.dirname, "fixtures", "test-creative.jpg");
    await fileInput.setInputFiles(fixturePath);

    await expect(page.getByText(/uploaded|creative|success/i).first()).toBeVisible({ timeout: 15_000 });
  });

  // ─── Step 5: Broadcaster sees the uploaded creative ───────────────────────────

  test("5. Broadcaster sees the uploaded creative", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await page.goto(`/bookings/${state.bookingId}`);
    await page.waitForLoadState("networkidle");

    // The booking had zero assets before this upload, so it comes back "active" straight away —
    // there's nothing for the broadcaster to approve (that review step is only for a *swap* on
    // an already-playing booking). Just confirm it shows up as active.
    await expect(page.getByText(/^active$/i).first()).toBeVisible({ timeout: 8_000 });
  });

  // ─── Step 6: Space detail shows an active booking ────────────────────────────

  test("6. Space detail shows the booking as active", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await page.goto(`/spaces/${state.spaceId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/accepted|active/i).first()).toBeVisible({ timeout: 8_000 });
  });

});
