import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreativePicker, type Creative } from "@/components/booking/CreativePicker";
import { WalletShortfall } from "@/components/booking/WalletShortfall";
import { useWalletAvailable } from "@/components/booking/useWalletAvailable";
import { CampaignButton } from "./CampaignBits";
import { campaignToast } from "./campaignToast";
import { fmtMoney, fmtRange, offerHolds, type Booking, type Campaign, type Offer } from "./campaignData";
import { slotLabel, useBookingPlaces } from "./useBookingPlaces";
import { useDebounced } from "@/hooks/use-debounced";
import { spotsFor } from "@/lib/creative";
import { api } from "@/lib/api";

type AcceptPreview = {
  spots_consumed: number;
  spaces: { space_id: number; total_price: number | string }[];
};
type AcceptResult = AcceptPreview & { offer: Offer; measured_duration_seconds?: number };

const playsInputCn =
  "h-8 w-20 rounded-md border-[0.8px] border-[#d7dce3] bg-white px-2.5 text-sm text-[#1a1d25] outline-none focus-visible:ring-2 focus-visible:ring-[#3a47c2]";

/**
 * Answering a broadcaster's offer. The offer already holds slots up to a daily ceiling of 15-second
 * spots; accepting needs the ad and how many plays a day to use in each slot. The server prices it
 * (simulate-accept) before anything is committed, and the real accept books it and takes the money
 * from the wallet in one step.
 */
export function OfferDialog({ campaign, offer, offers, onClose }: {
  campaign: Campaign;
  offer: Offer | null;
  offers: Offer[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [creative, setCreative] = useState<Creative | null>(null);
  const [creativeError, setCreativeError] = useState("");
  const [plays, setPlays] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [walletShort, setWalletShort] = useState(false);

  useEffect(() => {
    setCreative(null); setCreativeError(""); setPlays({}); setWalletShort(false);
  }, [offer?.id]);

  const { data: held = [], isLoading: holdsLoading } = useQuery<Booking[]>({
    queryKey: ["offer-holds"],
    queryFn: () => api.get<Booking[]>("/api/bookings?status=offer_pending"),
    enabled: !!offer,
  });
  const holds = offer ? offerHolds(offer, offers, held) : [];
  const { place, slot } = useBookingPlaces(holds);
  const walletAvailable = useWalletAvailable(!!offer);

  // A longer ad uses more spots per play, so fewer plays fit under each slot's ceiling.
  const spots = spotsFor(creative?.seconds ?? 15);
  const maxPlays = (ceiling: number) => Math.floor(ceiling / spots);
  const slotRows = holds.flatMap(b => (b.booking_slots ?? []).map(bs => ({ slotId: bs.slot_id, ceiling: bs.daily_playbacks_allocated })));
  // Untouched slots use their whole ceiling, which is what the offered price assumes.
  const playsFor = (slotId: number, ceiling: number) => plays[slotId] ?? String(maxPlays(ceiling));
  const requested = slotRows.map(r => ({ slot_id: r.slotId, play_count: Number(playsFor(r.slotId, r.ceiling)) }));
  const inputsOk = requested.length > 0 && requested.every(r => Number.isInteger(r.play_count) && r.play_count >= 1);

  const previewBody = offer && inputsOk
    ? JSON.stringify({ asset_duration_seconds: creative?.seconds ?? 15, slots: requested })
    : null;
  const debouncedBody = useDebounced(previewBody, 400);
  const preview = useQuery<AcceptPreview>({
    queryKey: ["offer-preview", offer?.id, debouncedBody],
    queryFn: () => api.post<AcceptPreview>(`/api/campaigns/${campaign.id}/offers/${offer!.id}/simulate-accept`, JSON.parse(debouncedBody!)),
    enabled: !!offer && !!debouncedBody && debouncedBody === previewBody,
    retry: false,
  });
  const upToDate = !!previewBody && debouncedBody === previewBody;
  const total = upToDate && preview.data ? preview.data.spaces.reduce((n, s) => n + Number(s.total_price), 0) : null;
  const overBudget = total != null && walletAvailable != null && total > walletAvailable;

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["campaign-offers", campaign.id] }),
    queryClient.invalidateQueries({ queryKey: ["offer-holds"] }),
    queryClient.invalidateQueries({ queryKey: ["bookings"] }),
    queryClient.invalidateQueries({ queryKey: ["wallet"] }),
  ]);

  const accept = async () => {
    if (!offer) return;
    if (!creative) { setCreativeError("Attach the ad you want to show"); return; }
    setBusy(true);
    setWalletShort(false);
    try {
      const form = new FormData();
      form.append("status", "accepted");
      form.append("asset", creative.file);
      if (creative.video) form.append("asset_duration_seconds", String(creative.seconds));
      form.append("slots", JSON.stringify(requested));
      const result = await api.patchMultipart<AcceptResult>(`/api/campaigns/${campaign.id}/offers/${offer.id}`, form);
      await refresh();
      campaignToast(`Offer accepted for ${fmtMoney(result.spaces.reduce((n, s) => n + Number(s.total_price), 0))}`);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't accept the offer";
      if (/insufficient wallet balance/i.test(message)) {
        setWalletShort(true);
        void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      } else toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (!offer) return;
    setBusy(true);
    try {
      await api.patch(`/api/campaigns/${campaign.id}/offers/${offer.id}`, { status: "rejected" });
      await refresh();
      campaignToast("Offer declined");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't decline the offer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!offer} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[520px] overflow-y-auto rounded-xl p-6">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="text-xl font-semibold leading-7 text-[#1a1d25]">Offer from a broadcaster</DialogTitle>
          <DialogDescription className="text-sm leading-5 text-[#4a4d56]">
            It runs {fmtRange(campaign.start_date, campaign.end_date, true)}. Accepting books it straight away and takes the
            money from your wallet.
          </DialogDescription>
        </DialogHeader>
        {offer?.message && <p className="rounded-lg bg-[#f8faff] p-3 text-sm leading-5 text-[#1a1d25]">“{offer.message}”</p>}

        {holdsLoading ? (
          <p className="py-2 text-sm text-[#656972]">Loading the offer…</p>
        ) : holds.length === 0 ? (
          <p className="py-2 text-sm text-[#656972]">We couldn't load which screens this offer is for. You can still decline it.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {holds.map(b => {
              const p = place(b);
              return (
                <section key={b.id} className="flex flex-col gap-3 rounded-xl border-[0.8px] border-[#e3e5ea] p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-5 text-[#1a1d25]">{p.name}</p>
                    <p className="text-[13px] leading-[18px] text-[#656972]">{p.screen || "Screen"}</p>
                  </div>
                  {(b.booking_slots ?? []).map(bs => {
                    const s = slot(bs.slot_id);
                    const max = maxPlays(bs.daily_playbacks_allocated);
                    return (
                      <div key={bs.slot_id} className="flex flex-wrap items-center justify-between gap-2">
                        <label htmlFor={`offer-plays-${bs.slot_id}`} className="text-sm leading-5 text-[#1a1d25]">
                          {s ? slotLabel(s) : `Slot ${bs.slot_id}`}
                        </label>
                        <span className="flex items-center gap-2">
                          <input id={`offer-plays-${bs.slot_id}`} type="number" min={1} max={max} inputMode="numeric"
                            value={playsFor(bs.slot_id, bs.daily_playbacks_allocated)}
                            onChange={e => setPlays(prev => ({ ...prev, [bs.slot_id]: e.target.value }))}
                            className={playsInputCn} />
                          <span className="whitespace-nowrap text-[13px] leading-[18px] text-[#656972]">of {max} plays a day</span>
                        </span>
                      </div>
                    );
                  })}
                </section>
              );
            })}

            <div className="flex flex-col gap-1.5">
              <label htmlFor="offer-ad" className="text-sm font-medium text-[#4a5565]">Your ad</label>
              <CreativePicker id="offer-ad" value={creative} error={creativeError}
                onChange={c => { setCreative(c); setCreativeError(""); }} />
            </div>

            {preview.isError && upToDate ? (
              <p role="alert" className="whitespace-pre-line rounded-lg bg-[#fef3f1] px-4 py-3 text-sm leading-5 text-[#aa0f16]">
                {preview.error instanceof Error ? preview.error.message : "We couldn't price this offer."}
              </p>
            ) : (
              <p className="rounded-lg bg-[#f8faff] px-4 py-3 text-sm leading-5 text-[#1a1d25]" aria-live="polite">
                {total == null
                  ? inputsOk ? "Working out the price…" : "Enter at least 1 play a day for each slot."
                  : <>You pay <strong>{fmtMoney(total)}</strong>{!creative && <span className="text-[#656972]"> for a 15-second ad</span>}</>}
              </p>
            )}

            {(walletShort || overBudget) && (
              <WalletShortfall key={total ?? "unknown"} what="offer" needed={total} available={walletAvailable} />
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <CampaignButton size="md" disabled={busy} onClick={decline}>Decline</CampaignButton>
          <CampaignButton size="md" variant="primary" disabled={busy || total == null} onClick={accept}>
            {busy ? "Working…" : total != null ? `Accept for ${fmtMoney(total)}` : "Accept"}
          </CampaignButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
