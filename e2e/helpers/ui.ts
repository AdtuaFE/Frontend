import { Page, Locator } from "@playwright/test";

/** The side nav landmark (`<aside>`, implicit role="complementary") — scope nav-item lookups to
 * it so they never collide with a same-named heading/label elsewhere on the page. */
export const sidenav = (page: Page) => page.getByRole("complementary");

export const navItem = (page: Page, label: string) =>
  sidenav(page).getByRole("button", { name: label, exact: true });

/**
 * Picks a date in a shadcn/react-day-picker `Calendar` popover (used by CampaignForm's date
 * fields). `trigger` is the button that opens the popover. Navigates month-by-month if `date`
 * isn't in the currently-shown month, then clicks the day.
 *
 * react-day-picker (v8, as configured in src/components/ui/calendar.tsx) renders every visible
 * day — including the leading/trailing days of adjacent months — as same-looking numbered
 * buttons, so a given day number can appear twice in one view near a month boundary. This picks
 * the first match after navigating to the right month, which is reliable for any date that
 * isn't within the first/last few days of its month.
 */
export async function pickCalendarDate(page: Page, trigger: Locator, date: Date): Promise<void> {
  await trigger.click();
  // shadcn's Calendar overrides react-day-picker's own classnames, so there's no stable class
  // to find the caption by — just check whether the target month/year text is showing at all.
  const targetMonth = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // A closed popover's previous content can stay mounted (not just hidden) rather than being
  // removed — so a second date field's calendar can leave more than one "<Month> <Year>" or nav
  // button in the DOM at once. The most recently opened one is always last.
  for (let i = 0; i < 3 && !(await page.getByText(targetMonth, { exact: true }).last().isVisible()); i++) {
    const direction = date.getTime() > Date.now() ? "Go to next month" : "Go to previous month";
    await page.getByRole("button", { name: direction }).last().click();
  }

  const day = String(date.getDate());
  await page.getByRole("gridcell", { name: day, exact: true }).last().click();
}
