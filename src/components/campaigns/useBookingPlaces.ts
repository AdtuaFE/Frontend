import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Booking } from "./campaignData";

type Space = { id: number; name: string };
type Screen = { id: number; label: string };
export type SlotInfo = { id: number; screen_id: number; label: string; day_of_week: number; start_time: string; end_time: string };

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "Lunch · Mon 11:00–14:00 UTC" */
export const slotLabel = (s: SlotInfo) =>
  `${s.label} · ${DAYS[s.day_of_week] ?? ""} ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)} UTC`;

/** Space names, screen labels and slot details for bookings, looked up through each space's screens. */
export function useBookingPlaces(bookings: Booking[]) {
  const spaceIds = [...new Set(bookings.map(b => b.space_id))];
  const spaces = useQueries({
    queries: spaceIds.map(id => ({ queryKey: ["space", id], queryFn: () => api.get<Space>(`/api/spaces/${id}`) })),
  });
  const screens = useQueries({
    queries: spaceIds.map(id => ({ queryKey: ["space-screens", id], queryFn: () => api.get<Screen[]>(`/api/spaces/${id}/screens`) })),
  });
  const screenList = spaceIds.flatMap((spaceId, i) => (screens[i]?.data ?? []).map(s => ({ spaceId, screen: s })));
  const slots = useQueries({
    queries: screenList.map(({ spaceId, screen }) => ({
      queryKey: ["screen-slots", spaceId, screen.id],
      queryFn: () => api.get<SlotInfo[]>(`/api/spaces/${spaceId}/screens/${screen.id}/slots`),
    })),
  });
  const spaceName = new Map(spaceIds.map((id, i) => [id, spaces[i]?.data?.name]));
  const slotById = new Map<number, SlotInfo & { screen: string }>();
  screenList.forEach(({ screen }, i) => (slots[i]?.data ?? []).forEach(sl => slotById.set(sl.id, { ...sl, screen: screen.label })));
  return {
    place: (b: Booking) => ({
      name: spaceName.get(b.space_id) ?? `Space ${b.space_id}`,
      screen: [...new Set((b.booking_slots ?? []).map(s => slotById.get(s.slot_id)?.screen).filter(Boolean))].join(", "),
    }),
    slot: (slotId: number) => slotById.get(slotId),
  };
}
