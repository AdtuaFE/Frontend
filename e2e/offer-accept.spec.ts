/**
 * Campaign-offer accept flow — reworked in issue #31.
 *
 * A broadcaster's offer now reserves real capacity immediately on submission
 * (src/components/SubmitOfferModal.tsx), and accepting it is no longer a one-click status flip:
 * the advertiser picks an ad and a per-slot play count (bounded by the offer's held ceiling),
 * previews the real price via a mandatory `simulate-accept` dry run, then commits with the real,
 * multipart accept (src/components/campaigns/OfferDialog.tsx). This walks that whole path:
 * broadcaster submits an offer against their own space's slot, advertiser previews and accepts it
 * with a creative attached, and the resulting booking reflects the real play count and price.
 *
 * Run with: npx playwright test offer-accept --headed  (to watch)
 */
import { test, expect } from "@playwright/test";
import { loginAs, BROADCASTER, ADVERTISER } from "./helpers/auth";
import { seedSpace, seedScreen, seedSlot, seedCampaign, activateCampaign } from "./helpers/seed";
import * as path from "path";

const API = process.env.E2E_API_URL ?? "http://localhost:3000";

const state = { campaignId: 0, campaignName: "", spaceName: "", offerCeiling: 50, proposedPrice: 80 };

test.describe.serial("Campaign offer accept flow", () => {

  test("1. Advertiser has an active public campaign", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    const campaign = await seedCampaign(page, { name: `E2E Offer Campaign ${Date.now()}` });
    await activateCampaign(page, campaign.id);
    state.campaignId = campaign.id;
    state.campaignName = campaign.name;
  });

  test("2. Broadcaster submits an offer against their own space's slot", async ({ page }) => {
    await loginAs(page, BROADCASTER.email, BROADCASTER.password);
    const space = await seedSpace(page, { name: `E2E Offer Space ${Date.now()}` });
    const screen = await seedScreen(page, space.id);
    await seedSlot(page, space.id, screen.id, 1, { daily_capacity_playbacks: 100, total_price: 80 });
    state.spaceName = space.name;

    await page.goto(`/campaigns/${state.campaignId}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /submit offer/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(state.spaceName, { exact: true }).check();

    // A single-slot space auto-checks that slot — just fill its ceiling and the asking price.
    await dialog.getByPlaceholder(/e\.g\./i).fill(String(state.offerCeiling));
    await dialog.getByPlaceholder("Price").fill(String(state.proposedPrice));

    await dialog.getByRole("button", { name: /^submit offer$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
  });

  test("3. Advertiser previews then accepts the offer with a creative", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    await page.goto(`/campaigns/${state.campaignId}`);
    await page.waitForLoadState("networkidle");

    await page.getByText(/offer from a broadcaster/i).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Defaults to the offer's full held ceiling until changed — confirm that preview step
    // actually prices it (the mandatory simulate-accept dry run) before any file is attached.
    await expect(dialog.getByText(new RegExp(`of ${state.offerCeiling} plays a day`, "i"))).toBeVisible();
    await expect(dialog.getByText(/working out the price|you pay/i)).toBeVisible({ timeout: 10_000 });

    await dialog.locator('input[type="file"]').setInputFiles(path.join(import.meta.dirname, "fixtures", "test-creative.jpg"));
    await expect(dialog.getByText(/you pay/i)).toBeVisible({ timeout: 10_000 });

    const acceptBtn = dialog.getByRole("button", { name: /^accept for \$/i });
    await expect(acceptBtn).toBeEnabled({ timeout: 10_000 });
    await acceptBtn.click();

    await expect(page.getByText(/offer accepted for/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("4. The resulting booking reflects the real play count and price", async ({ page }) => {
    await loginAs(page, ADVERTISER.email, ADVERTISER.password);
    const res = await page.request.get(`${API}/api/bookings`);
    const bookings: { id: number; campaign_id: number; status: string; total_price: number; booking_slots?: { daily_playbacks_allocated: number }[] }[] =
      (await res.json()).data;
    const booking = bookings.find(b => b.campaign_id === state.campaignId && b.status === "accepted");
    expect(booking).toBeTruthy();
    expect(Number(booking!.total_price)).toBeGreaterThan(0);
    expect(booking!.booking_slots?.[0]?.daily_playbacks_allocated).toBe(state.offerCeiling);
  });

});
