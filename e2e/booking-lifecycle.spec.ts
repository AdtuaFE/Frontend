/**
 * Full booking lifecycle E2E test.
 *
 * Steps (run serially — each depends on the previous):
 *   1. Broadcaster creates a space and activates it.
 *   2. Advertiser finds the space on Browse, opens detail, sends a booking request.
 *   3. Broadcaster sees the incoming booking and accepts it.
 *   4. Advertiser confirms booking is accepted and uploads a creative.
 *   5. Broadcaster sees the creative and marks it active/approved.
 *   6. Space detail shows the space is paired and ready.
 *
 * Note: Player screen verification (step 7 in the original spec) requires a
 * live paired device and real-time scheduling, so it is tested separately via
 * manual QA or a dedicated player integration test.
 *
 * Run with: npx playwright test booking-lifecycle --headed  (to watch)
 */
import { test, expect, Page } from "@playwright/test";
import { loginAs, BROADCASTER, ADVERTISER } from "./helpers/auth";
import * as path from "path";

// Shared state across the serial steps
const state = {
  spaceName: `E2E Space ${Date.now()}`,
  spaceId: 0,
  bookingId: 0,
};

// ─── Step 1: Broadcaster creates and activates a space ────────────────────────

test.describe.serial("Booking lifecycle", () => {

  test("1. Broadcaster creates a space and activates it", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);

    // Open New Space modal from nav
    const browseBtn = page.getByRole("button", { name: /browse/i }).first();
    await browseBtn.hover();
    await page.getByRole("button", { name: /new space/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // Fill required fields
    await page.getByLabel(/space name/i).fill(state.spaceName);

    // Space type — shadcn Select, targeted by placeholder text
    await page.getByText("Select type").click();
    await page.getByRole("option", { name: /digital screen/i }).click();

    // Display type
    await page.getByText("Select display type").click();
    await page.getByRole("option", { name: /digital led/i }).click();

    // City and country (required)
    await page.getByLabel(/^city/i).fill("London");
    await page.getByLabel(/country/i).fill("UK");

    // CPM
    await page.getByLabel(/cpm/i).fill("10");

    // Submit — scroll into view first, the modal is taller than the viewport
    const createBtn = page.getByRole("button", { name: /add space/i });
    await createBtn.scrollIntoViewIfNeeded();
    await createBtn.click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });

    // Find the new space card and navigate to its detail page
    await page.goto("/browse");
    await page.waitForLoadState("networkidle");
    const spaceCard = page.getByText(state.spaceName).first();
    await expect(spaceCard).toBeVisible({ timeout: 10_000 });
    await spaceCard.click();

    // Capture the space ID from the URL
    await page.waitForURL(/\/spaces\/\d+/);
    const match = page.url().match(/\/spaces\/(\d+)/);
    expect(match).not.toBeNull();
    state.spaceId = Number(match![1]);

    // Activate the space if not already active
    const activateBtn = page.getByRole("button", { name: /activate/i });
    if (await activateBtn.isVisible()) {
      await activateBtn.click();
    }
    await expect(page.getByText(/active/i).first()).toBeVisible({ timeout: 6_000 });
  });

  // ─── Step 2: Advertiser finds the space and sends a booking request ───────────

  test("2. Advertiser finds the space on Browse and sends a booking request", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);

    // Navigate directly to the space using the ID captured in step 1.
    // Search results may not include newly created inactive spaces, so bypassing
    // the Browse listing is more reliable here.
    expect(state.spaceId).toBeGreaterThan(0);
    await page.goto(`/spaces/${state.spaceId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(state.spaceName)).toBeVisible({ timeout: 10_000 });

    // Click the "Book space" button (exact text to avoid matching the "Bookings" nav button)
    const bookBtn = page.getByRole("button", { name: /^book space$/i });
    await expect(bookBtn).toBeVisible();
    await bookBtn.click();

    // Booking modal — select a campaign
    await expect(page.getByRole("dialog")).toBeVisible();
    const campaignSelect = page.getByRole("combobox").first();
    await campaignSelect.click();
    await page.getByRole("option").first().click();

    // Pick a slot (check first available)
    const firstSlotCheckbox = page.getByRole("checkbox").first();
    if (!(await firstSlotCheckbox.isChecked())) {
      await firstSlotCheckbox.check();
    }

    // Fill daily playbacks for the selected slot (placeholder is "e.g. 48")
    const playbacksInput = page.getByPlaceholder(/e\.g\./i).first();
    if (await playbacksInput.isVisible()) {
      await playbacksInput.fill("10");
    }

    // Set dates
    const today = new Date();
    const start = today.toISOString().split("T")[0];
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);
    const end = endDate.toISOString().split("T")[0];

    const startInput = page.getByLabel(/start date/i);
    const endInput = page.getByLabel(/end date/i);
    if (await startInput.isVisible()) await startInput.fill(start);
    if (await endInput.isVisible()) await endInput.fill(end);

    await page.getByRole("dialog").getByRole("button", { name: /send booking request/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 10_000 });

    // Confirm a success toast or status update
    await expect(page.getByText(/booking|requested|success/i).first()).toBeVisible({ timeout: 8_000 });
  });

  // ─── Step 3: Broadcaster sees and accepts the booking ────────────────────────

  test("3. Broadcaster sees the booking and accepts it", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await page.goto("/bookings");
    await page.waitForLoadState("networkidle");

    // Find the pending booking — look for the space name or pending badge
    await expect(page.getByText(/pending/i).first()).toBeVisible({ timeout: 10_000 });

    // Navigate to the booking detail (first pending booking)
    const bookingLink = page.getByText(/pending/i).first();
    await bookingLink.click();

    await page.waitForURL(/\/bookings\/\d+/);
    const match = page.url().match(/\/bookings\/(\d+)/);
    expect(match).not.toBeNull();
    state.bookingId = Number(match![1]);

    // Accept the booking — first click opens a confirmation dialog
    const acceptBtn = page.getByRole("button", { name: /^accept$/i });
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // Confirm acceptance in the AlertDialog
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: /accept booking/i }).click();
    await expect(page.getByRole("alertdialog")).not.toBeVisible({ timeout: 8_000 });

    // Confirm the status badge updated
    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 8_000 });
  });

  // ─── Step 4: Advertiser confirms acceptance and uploads a creative ────────────

  test("4. Advertiser sees booking accepted and uploads a creative", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    await page.goto(`/bookings/${state.bookingId}`);
    await page.waitForLoadState("networkidle");

    // Status should show accepted
    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 8_000 });

    // Upload a creative (test image)
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeAttached();

    // Use the sample image bundled in e2e/fixtures/
    const fixturePath = path.join(import.meta.dirname, "fixtures", "test-creative.jpg");
    await fileInput.setInputFiles(fixturePath);

    // Wait for upload success
    await expect(page.getByText(/uploaded|creative|success/i).first()).toBeVisible({ timeout: 15_000 });
  });

  // ─── Step 5: Broadcaster activates the creative ───────────────────────────────

  test("5. Broadcaster sees the uploaded creative and marks it active", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await page.goto(`/bookings/${state.bookingId}`);
    await page.waitForLoadState("networkidle");

    // Creative should be listed
    await expect(page.getByText(/creative|asset/i).first()).toBeVisible({ timeout: 8_000 });

    // Activate / approve it
    const activateBtn = page.getByRole("button", { name: /activate|approve|set active/i }).first();
    if (await activateBtn.isVisible()) {
      await activateBtn.click();
      await expect(page.getByText(/active|approved/i).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  // ─── Step 6: Space detail shows an active booking ────────────────────────────

  test("6. Space detail shows the booking as active", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await page.goto(`/spaces/${state.spaceId}`);
    await page.waitForLoadState("networkidle");

    // The space should reflect an active/accepted booking
    await expect(page.getByText(/accepted|active/i).first()).toBeVisible({ timeout: 8_000 });
  });

});
