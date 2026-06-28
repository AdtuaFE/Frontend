export type FieldErrors = Partial<Record<string, string>>;

const NAME_RE = /^[a-zA-Z\s\-']+$/;

const SPACE_TYPES = [
  "billboard", "digital_screen", "window_display", "poster",
  "transit_shelter", "vehicle_wrap", "projection", "other",
] as const;

const DISPLAY_TYPES = [
  "static", "digital_led", "backlit", "neon", "projection", "other",
] as const;

type ProfileFields = { firstName: string; lastName: string };
type AdvertiserFields = { campaignName: string; totalBudget: string; startDate: string; endDate: string };
type BroadcasterFields = { spaceName: string; spaceType: string; displayType: string; city: string; country: string; cpm: string };

/** Section 1 — PATCH /api/user/profile */
export function validateProfileSection(fields: ProfileFields): FieldErrors {
  const errors: FieldErrors = {};

  const first = fields.firstName.trim();
  if (!first) {
    errors.firstName = "First name is required";
  } else if (first.length < 2) {
    errors.firstName = "First name must be at least 2 characters";
  } else if (!NAME_RE.test(first)) {
    errors.firstName = "Letters, spaces, hyphens, and apostrophes only";
  }

  const last = fields.lastName.trim();
  if (last) {
    if (last.length < 2) {
      errors.lastName = "Last name must be at least 2 characters";
    } else if (!NAME_RE.test(last)) {
      errors.lastName = "Letters, spaces, hyphens, and apostrophes only";
    }
  }

  return errors;
}

/** Section 2 — POST /api/campaigns (only validates when a campaign name is entered) */
export function validateAdvertiserSection({ campaignName, totalBudget, startDate, endDate }: AdvertiserFields): FieldErrors {
  const errors: FieldErrors = {};
  if (!campaignName.trim()) return errors; // campaign creation is optional

  if (!totalBudget) {
    errors.totalBudget = "Total budget is required";
  } else if (Number(totalBudget) <= 0) {
    errors.totalBudget = "Must be a positive number";
  }

  if (!startDate) {
    errors.startDate = "Start date is required";
  }

  if (!endDate) {
    errors.endDate = "End date is required";
  } else if (startDate && endDate <= startDate) {
    errors.endDate = "End date must be after start date";
  }

  return errors;
}

/** Section 3 — POST /api/spaces (all required; no conditional skip for broadcaster role) */
export function validateBroadcasterSection(fields: BroadcasterFields): FieldErrors {
  const errors: FieldErrors = {};

  if (!fields.spaceName.trim()) errors.spaceName = "Space name is required";

  if (!fields.spaceType.trim()) {
    errors.spaceType = "Space type is required";
  } else if (!(SPACE_TYPES as readonly string[]).includes(fields.spaceType)) {
    errors.spaceType = `Must be one of: ${SPACE_TYPES.join(", ")}`;
  }

  if (!fields.displayType.trim()) {
    errors.displayType = "Display type is required";
  } else if (!(DISPLAY_TYPES as readonly string[]).includes(fields.displayType)) {
    errors.displayType = `Must be one of: ${DISPLAY_TYPES.join(", ")}`;
  }

  if (!fields.city.trim()) errors.city = "City is required";
  if (!fields.country.trim()) errors.country = "Country is required";

  if (!fields.cpm) {
    errors.cpm = "CPM is required";
  } else if (Number(fields.cpm) <= 0) {
    errors.cpm = "Must be a positive number";
  }

  return errors;
}