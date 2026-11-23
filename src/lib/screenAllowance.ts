import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Mirrors GET /api/broadcaster/screens (backend ticket 7): every screen the broadcaster has,
// across all their spaces, plus how many may run at once and which one is the default.

export type DeactivatedReason = "broadcaster" | "allowance" | "space";

export type BroadcasterScreen = {
  id: number;
  space_id: number;
  label: string;
  is_active: boolean;
  deactivated_reason: DeactivatedReason | null;
  created_at: string;
  is_default: boolean;
  space: { id: number; name: string; is_active: boolean };
};

export type ScreenAllowance = {
  allowance: number;
  active_count: number;
  default_screen_id: number | null;
  screens: BroadcasterScreen[];
};

export const SCREEN_ALLOWANCE_KEY = ["broadcaster-screens"] as const;

export function useScreenAllowance(enabled = true) {
  return useQuery<ScreenAllowance>({
    queryKey: SCREEN_ALLOWANCE_KEY,
    queryFn: () => api.get<ScreenAllowance>("/api/broadcaster/screens"),
    enabled,
  });
}

/** How many more screens can be added before the plan's limit. Never negative. */
export function screensLeft(summary: Pick<ScreenAllowance, "allowance" | "active_count">): number {
  return Math.max(0, summary.allowance - summary.active_count);
}

/** All screens in the broadcaster's spaces are visible. */
export function isVisibleScreen(_screen: BroadcasterScreen): boolean {
  return true;
}

export type ScreenStatus = { label: string; tone: "default" | "running" | "off"; hint?: string };

export function screenStatus(screen: BroadcasterScreen): ScreenStatus {
  if (screen.is_active) {
    return screen.is_default
      ? { label: "Default", tone: "default", hint: "Always keeps running, whatever your plan" }
      : { label: "Running", tone: "running" };
  }
  if (screen.deactivated_reason === "space") {
    return { label: "Off", tone: "off", hint: "This space is deactivated" };
  }
  if (screen.deactivated_reason === "allowance") {
    return { label: "Off", tone: "off", hint: "Over your plan's screen limit. Upgrade to run it" };
  }
  return { label: "Inactive", tone: "off", hint: "Inactive · Activate to put it on air" };
}

export function limitMessage(allowance: number): string {
  return `Your plan allows ${allowance} running screen${allowance === 1 ? "" : "s"} across all your spaces.`;
}
