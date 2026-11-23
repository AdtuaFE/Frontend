/**
 * Per-slot booking review/resolve — new in issue #31.
 *
 * A booking spanning more than one slot no longer gets a single accept/reject: the broadcaster
 * reviews each slot independently (src/pages/BookingDetail.tsx, "Review each time slot"), and if
 * any slot gets turned down while the rest are approved, the booking enters `needs_resolution`
 * until the advertiser drops or reschedules the turned-down slot(s) (src/pages/BookingDetail.tsx,
 * `handleDropSlot`/`handleMoveSlot`). This test walks: a 2-slot booking → broadcaster approves
 * one slot and turns the other down → advertiser drops the turned-down slot → the booking
 * activates on the remaining approved slot, at a lower total price.
 *
 * Run with: npx playwright test booking-slot-review --headed  (to watch)
 */
import { test, expect } from "@playwright/test";
import { loginAs, BROADCASTER, ADVERTISER } from "./helpers/auth";
import { seedSpace, seedScreen, seedSlot, seedCampaign, activateCampaign, weekWindow } from "./helpers/seed";
import * as path from "path";

const API = process.env.E2E_API_URL ?? "http://localhost:3000";

const state = { spaceId: 0, spaceName: "", bookingId: 0, priceBeforeDrop: 0 };

test.describe.serial("Per-slot booking review and resolve", () => {

  test("1. Broadcaster has a space with two bookable slots", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);

    const space = await seedSpace(page, { name: `E2E Slot Review Space ${Date.now()}` });
    const screen = await seedScreen(page, space.id);
    // Two different days so both are independently selectable in CreateBookingModal and both
    // occur at least once inside any 7-day booking window.
    await seedSlot(page, space.id, screen.id, 1, { label: "Monday slot" });
    await seedSlot(page, space.id, screen.id, 2, { label: "Tuesday slot" });
    state.spaceId = space.id;
    state.spaceName = space.name;
  });

  test("2. Advertiser books both slots in one request", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    // Long enough that both seeded weekdays fall inside the dates the page fills in from the campaign.
    const campaign = await seedCampaign(page, { name: `E2E Slot Review Campaign ${Date.now()}`, end_date: weekWindow(14)[1] });
    await activateCampaign(page, campaign.id);

    await page.goto(`/spaces/${state.spaceId}?campaign=${campaign.id}`);
    await page.waitForLoadState("networkidle");

    // Two time slots on this screen (one per weekday): pick both, 10 plays a day each by default.
    const panel = page.getByRole("complementary", { name: /book this screen/i });
    await expect(panel.getByRole("checkbox")).toHaveCount(2, { timeout: 10_000 });
    for (const label of ["Monday slot", "Tuesday slot"]) await panel.getByRole("checkbox", { name: label }).check({ force: true });

    const review = panel.getByRole("button", { name: /^review request$/i });
    await expect(review).toBeEnabled({ timeout: 15_000 });
    await review.click();

    await expect(page).toHaveURL(/\/request$/);
    await page.locator('input[type="file"]').setInputFiles(path.join(import.meta.dirname, "fixtures", "test-creative.jpg"));
    const send = page.getByRole("button", { name: /^send request$/i });
    await expect(send).toBeEnabled({ timeout: 15_000 });
    await send.click();
    await expect(page.getByRole("heading", { name: /^request sent$/i })).toBeVisible({ timeout: 10_000 });

    const res = await page.request.get(`${API}/api/bookings`);
    const bookings: { id: number; space_id: number; status: string; total_price: number }[] = (await res.json()).data;
    const created = bookings.find(b => b.space_id === state.spaceId && b.status === "pending");
    expect(created).toBeTruthy();
    state.bookingId = created!.id;
    state.priceBeforeDrop = Number(created!.total_price);
    expect(state.priceBeforeDrop).toBeGreaterThan(0);
  });

  test("3. Broadcaster approves one slot and turns the other down", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    await page.goto(`/bookings/${state.bookingId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: /review each time slot/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("button", { name: /^approve$/i })).toHaveCount(2);

    await page.getByRole("button", { name: /^approve$/i }).first().click();
    await expect(page.getByRole("button", { name: /^approve$/i })).toHaveCount(1, { timeout: 8_000 });
    await page.getByRole("button", { name: /^turn down$/i }).first().click();

    // No slots left pending, one rejected → the booking needs the advertiser's input.
    await expect(page.getByText(/needs a decision/i).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/waiting for the advertiser/i)).toBeVisible();
  });

  test("4. Advertiser drops the turned-down slot and the booking activates at a lower price", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    await page.goto(`/bookings/${state.bookingId}`);
    await page.waitForLoadState("networkidle");

    // The banner names the one time slot that wasn't approved.
    await expect(page.getByText(/didn't approve a time slot/i)).toBeVisible({ timeout: 8_000 });
    await page.getByRole("button", { name: /^drop time slot$/i }).click();

    // What's left is approved and starts at least 3 days out, so the advertiser's page says Scheduled.
    await expect(page.getByText(/^scheduled$/i).first()).toBeVisible({ timeout: 8_000 });

    const res = await page.request.get(`${API}/api/bookings/${state.bookingId}`);
    const booking: { status: string; total_price: number } = (await res.json()).data;
    expect(booking.status).toBe("accepted");
    expect(Number(booking.total_price)).toBeLessThan(state.priceBeforeDrop);
  });

});
