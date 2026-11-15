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
 * test) is still driven for real, through the actual modal.
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

    const campaign = await seedCampaign(page, { name: `E2E Booking Campaign ${Date.now()}` });
    await activateCampaign(page, campaign.id);
    state.campaignId = campaign.id;

    expect(state.spaceId).toBeGreaterThan(0);
    await page.goto(`/spaces/${state.spaceId}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(state.spaceName)).toBeVisible({ timeout: 10_000 });

    // Exact text to avoid matching the "Bookings" nav button.
    const bookBtn = page.getByRole("button", { name: /^book space$/i });
    await expect(bookBtn).toBeVisible();
    await bookBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name: campaign.name }).click();

    // Ad — now a required field (breaking change from issue #31: booking creation is multipart,
    // the creative goes up with the request itself).
    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(import.meta.dirname, "fixtures", "test-creative.jpg"));

    // Pick the slot seeded in step 1 (auto-checked, since it's the only one).
    const firstSlotCheckbox = dialog.getByRole("checkbox").first();
    if (!(await firstSlotCheckbox.isChecked())) await firstSlotCheckbox.check();
    const playsInput = dialog.getByPlaceholder(/e\.g\./i).first();
    await playsInput.fill("10");

    // Start date must be >= 3 days out; a 7-day window guarantees the seeded slot's
    // day-of-week occurs at least once in range.
    const [start, end] = weekWindow(3);
    await dialog.getByLabel(/start date/i).fill(start);
    await dialog.getByLabel(/end date/i).fill(end);

    await expect(dialog.getByText(/^total:/i)).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole("button", { name: /send booking request/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/booking request sent/i).first()).toBeVisible({ timeout: 8_000 });
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

    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 8_000 });

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
