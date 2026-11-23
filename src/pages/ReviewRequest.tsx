import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { spotsFor } from "@/lib/creative";
import { AppLayout } from "@/components/AppLayout";
import { campaignMoney, type Booking, type Campaign } from "@/components/campaigns/campaignData";
import { CreativePicker, type Creative } from "@/components/booking/CreativePicker";
import { useWalletAvailable } from "@/components/booking/useWalletAvailable";
import {
  addDays, clearDraft, daysIn, fmtDay, fmtDayLong, fmtSpan, groupAmount, groupDayPrice, groupSchedule, groupSlots,
  isoOf, readCapacityIssues, readDraft, saveDraft, slotsBody, useBookingQuote,
  type BookingDraft, type Screen, type Slot,
} from "@/components/booking/bookingFlow";
import { Badge, Callout, Crumbs, KeyValues, ScreenCell, cardCn, hrCn } from "@/components/booking/bookingUi";
import { screenTitle, spaceLede, type DetailSpace } from "@/components/booking/ScreenDetail";
import { fmtPrice } from "@/components/browse/browseData";
import { Btn } from "@/components/browse/primitives";

type SpaceImage = { url: string; is_primary: boolean };
type Created = { id: number; total_price: number | string; created_at?: string; price_adjusted?: boolean; measured_duration_seconds?: number };

const fmtLen = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

/** A preview of the picked ad, with its length on top. */
function AdThumb({ creative }: { creative: Creative }) {
  const url = useMemo(() => URL.createObjectURL(creative.file), [creative.file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-[#1a1d25]">
      {creative.video
        ? <video src={url} muted playsInline className="h-full w-full object-cover" />
        : <img src={url} alt="" className="h-full w-full object-cover" />}
      <span className="absolute bottom-2 right-2 grid h-5 place-items-center rounded bg-[rgba(26,29,37,0.72)] px-1.5 text-xs font-medium text-white">
        {fmtLen(creative.seconds)}
      </span>
    </div>
  );
}

const ReviewRequest = () => {
  const { id } = useParams();
  const spaceId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<BookingDraft | null>(() => readDraft(spaceId));
  const [creative, setCreative] = useState<Creative | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ booking: Created; total: number; walletAfter: number | null } | null>(null);
  const [topping, setTopping] = useState(false);

  const { data: space } = useQuery<DetailSpace>({ queryKey: ["space", spaceId], queryFn: () => api.get(`/api/spaces/${spaceId}`), enabled: !!draft });
  const { data: images = [] } = useQuery<SpaceImage[]>({ queryKey: ["space-images", spaceId], queryFn: () => api.get(`/api/spaces/${spaceId}/images`), enabled: !!draft });
  const { data: screens = [] } = useQuery<Screen[]>({ queryKey: ["space-screens", spaceId], queryFn: () => api.get(`/api/spaces/${spaceId}/screens`), enabled: !!draft });
  const { data: screenSlots } = useQuery<Slot[]>({
    queryKey: ["screen-slots", spaceId, draft?.screenId],
    queryFn: () => api.get<Slot[]>(`/api/spaces/${spaceId}/screens/${draft!.screenId}/slots`),
    enabled: !!draft,
  });
  const { data: campaigns = [] } = useQuery<Campaign[]>({ queryKey: ["campaigns"], queryFn: () => api.get<Campaign[]>("/api/campaigns"), enabled: !!draft });
  const { data: bookings = [] } = useQuery<Booking[]>({ queryKey: ["bookings"], queryFn: () => api.get<Booking[]>("/api/bookings"), enabled: !!draft });
  const wallet = useWalletAvailable(!!draft);

  const groups = useMemo(() => groupSlots(screenSlots ?? []), [screenSlots]);
  const screen = screens.find(s => s.id === draft?.screenId) ?? null;
  const campaign = campaigns.find(c => c.id === draft?.campaignId) ?? null;
  const adSeconds = creative?.seconds ?? 15;

  const body = draft && groups.length
    ? { campaign_id: draft.campaignId, space_id: spaceId, start_date: draft.start, end_date: draft.end, asset_duration_seconds: adSeconds, slots: slotsBody(groups, draft.picks, draft.start, draft.end) }
    : null;
  const quote = useBookingQuote(sent ? null : body);
  const issues = readCapacityIssues(sendError ?? quote.error, adSeconds);

  if (!draft) return <Navigate to={`/spaces/${spaceId}`} replace />;

  const title = space ? screenTitle(space, screen) : "";
  const detailHref = `/spaces/${spaceId}?screen=${draft.screenId}&campaign=${draft.campaignId}&start=${draft.start}&end=${draft.end}`;
  const image = images.find(i => i.is_primary)?.url ?? images[0]?.url ?? null;
  const total = quote.total;
  const allDays = daysIn(draft.start, draft.end, [1, 2, 3, 4, 5, 6, 7]);
  const left = campaign ? campaignMoney(Number(campaign.total_budget) || 0, bookings.filter(b => b.campaign_id === campaign.id)).left : null;
  const short = total != null && wallet != null && total > wallet ? Math.ceil((total - wallet) * 100) / 100 : null;
  const overBudget = total != null && left != null && total > left;
  const pickedLabels = draft.picks.map(p => groups.find(g => g.key === p.key)?.label).filter(Boolean) as string[];
  const otherError = (sendError ?? quote.error) && !issues.length ? (sendError ?? quote.error) : null;

  const removePick = (label: string) => {
    const next = { ...draft, picks: draft.picks.filter(p => groups.find(g => g.key === p.key)?.label !== label) };
    if (!next.picks.length) { navigate(detailHref); return; }
    saveDraft(next);
    setDraft(next);
    setSendError(null);
  };

  const topUp = async () => {
    if (!short) return;
    setTopping(true);
    try {
      await api.post("/api/wallet/topup", { amount: short });
      await queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success(`Added ${fmtPrice(short)} to your wallet`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add money to your wallet");
    } finally {
      setTopping(false);
    }
  };

  const send = async () => {
    if (!creative || !body || total == null) return;
    setSending(true);
    setSendError(null);
    try {
      const form = new FormData();
      form.append("campaign_id", String(draft.campaignId));
      form.append("space_id", String(spaceId));
      form.append("start_date", draft.start);
      form.append("end_date", draft.end);
      form.append("slots", JSON.stringify(body.slots));
      form.append("asset", creative.file);
      if (creative.video) form.append("asset_duration_seconds", String(creative.seconds));
      const booking = await api.postMultipart<Created>("/api/bookings", form);
      const finalTotal = Number(booking.total_price) || total;
      clearDraft(spaceId);
      setSent({ booking, total: finalTotal, walletAfter: wallet != null ? wallet - finalTotal : null });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      if (booking.price_adjusted) {
        toast.info(`The price changed to ${fmtPrice(finalTotal)} because your video measured ${booking.measured_duration_seconds} seconds.`, { duration: 10_000 });
      }
      window.scrollTo({ top: 0 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (/insufficient wallet balance/i.test(msg)) void queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  /* ---------- request sent ---------- */

  if (sent) {
    const createdDay = sent.booking.created_at?.slice(0, 10) ?? isoOf(new Date());
    const deadline = addDays(createdDay, 2);
    return (
      <AppLayout activeNav="browse">
        <div className="flex min-w-0 flex-col gap-6 pb-14 pt-2 text-[#1a1d25]">
          <Crumbs items={[{ label: "Browse spaces", to: `/browse?campaign=${draft.campaignId}` }, { label: title, to: detailHref }, { label: "Request sent" }]} />
          <div className="mx-auto mt-6 flex w-full max-w-[640px] flex-col gap-8">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-[#edfaf0] text-[#016d36]"><Check aria-hidden className="h-7 w-7" strokeWidth={2.5} /></span>
              <h1 className="m-0 text-2xl font-semibold leading-8 tracking-[-0.01em]">Request sent</h1>
              <p className="m-0 max-w-[440px] text-sm leading-5 text-[#4a4d56]">
                {space?.name ?? "The broadcaster"} has until the end of {fmtDay(deadline)} to answer. If they don't answer, {fmtPrice(sent.total)} goes back to your balance.
              </p>
            </div>
            <section className={cn(cardCn, "overflow-hidden")}>
              <div className="flex items-center justify-between gap-4 border-b border-[#e3e5ea] px-6 py-4">
                <h2 className="m-0 text-base font-semibold leading-6">{campaign?.name}</h2>
                <span className="text-sm leading-5 text-[#656972]">{fmtSpan(draft.start, draft.end)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <ScreenCell image={image} name={title} sub={pickedLabels.join(" and ")} />
                <div className="flex items-center gap-6">
                  <span className="inline-flex items-center gap-1 text-xs font-medium leading-4 text-[#7c5003]"><Clock aria-hidden className="h-4 w-4" />Waiting</span>
                  <span className="min-w-[72px] text-right text-sm font-medium tabular-nums">{fmtPrice(sent.total)}</span>
                </div>
              </div>
              <div className="border-t border-[#e3e5ea] bg-[#f8faff] px-6 py-4">
                <KeyValues rows={[
                  ["On hold from your wallet", fmtPrice(sent.total)],
                  ...(sent.walletAfter != null ? [["Available balance", fmtPrice(Math.max(0, sent.walletAfter))] as [string, string]] : []),
                ]} />
              </div>
            </section>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to={`/browse?campaign=${draft.campaignId}`} className="inline-flex h-10 items-center rounded-lg border border-[#d2d4d9] bg-white px-4 text-sm font-medium hover:bg-[#f8faff]">Find more screens</Link>
              <Link to={`/campaigns/${draft.campaignId}`} className="inline-flex h-10 items-center rounded-lg bg-[#3a47c2] px-4 text-sm font-medium text-white hover:bg-[#2e399f]">View campaign</Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  /* ---------- review ---------- */

  const canSend = !!creative && total != null && !quote.pending && !quote.error && !sendError && short == null && !overBudget && !sending;

  return (
    <AppLayout activeNav="browse">
      <div className="flex min-w-0 flex-col gap-6 pb-14 pt-2 text-[#1a1d25]">
        <Crumbs items={[{ label: "Browse spaces", to: `/browse?campaign=${draft.campaignId}` }, { label: title || "Screen", to: detailHref }, { label: "Review request" }]} />
        <h1 className="m-0 text-2xl font-semibold leading-8 tracking-[-0.01em]">Review request</h1>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex min-w-0 flex-col gap-6">
            <section className={cn(cardCn, "flex flex-col gap-4 p-6")}>
              <div className="flex items-center justify-between gap-4">
                <h2 className="m-0 text-base font-semibold leading-6">{campaign?.name ?? "Campaign"}</h2>
                <Link to={`/campaigns/${draft.campaignId}`} className="text-sm font-medium text-[#3a47c2] hover:text-[#2e399f] hover:underline hover:underline-offset-[3px]">View campaign</Link>
              </div>
              {creative ? (
                <div className="flex flex-wrap items-center gap-6">
                  <AdThumb creative={creative} />
                  <div className="flex flex-wrap gap-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs leading-4 text-[#656972]">Ad</span>
                      <b className="flex items-center gap-2 text-sm font-medium leading-5">
                        <span className="max-w-[220px] truncate">{creative.file.name}</span>
                        <button type="button" aria-label="Remove ad" onClick={() => setCreative(null)} className="grid h-6 w-6 place-items-center rounded-full text-[#656972] hover:bg-[#f1f2f7] hover:text-[#1a1d25]">
                          <X className="h-4 w-4" />
                        </button>
                      </b>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs leading-4 text-[#656972]">Dates</span>
                      <b className="text-sm font-medium leading-5">{fmtSpan(draft.start, draft.end)}</b>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium leading-5">Ad for this request</span>
                  <CreativePicker id="rq-ad" value={creative} onChange={setCreative} />
                  <span className="text-xs leading-4 text-[#656972]">Dates: {fmtSpan(draft.start, draft.end)}</span>
                </div>
              )}
            </section>

            <section className={cn(cardCn, "overflow-hidden")}>
              <div className="flex items-center justify-between gap-4 py-4 pl-6 pr-4">
                <ScreenCell image={image} name={title} sub={space ? spaceLede(space) : undefined} />
                <Link to={detailHref} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[#d2d4d9] bg-white pl-2 pr-3 text-xs font-medium hover:bg-[#f8faff]">
                  <Pencil aria-hidden className="h-4 w-4" />Edit
                </Link>
              </div>
              <div className="overflow-x-auto border-t border-[#e3e5ea]">
                <table className="w-full border-collapse text-sm leading-5 text-[#4a4d56]">
                  <thead>
                    <tr className="bg-[#f8faff] text-xs font-medium leading-4 text-[#656972]">
                      <th className="whitespace-nowrap border-b border-[#e3e5ea] py-3 pl-6 pr-4 text-left font-medium">Time slot</th>
                      <th className="whitespace-nowrap border-b border-[#e3e5ea] px-4 py-3 text-right font-medium">Plays a day</th>
                      <th className="whitespace-nowrap border-b border-[#e3e5ea] px-4 py-3 text-right font-medium">Days</th>
                      <th className="whitespace-nowrap border-b border-[#e3e5ea] px-4 py-3 text-right font-medium">Price a day</th>
                      <th className="whitespace-nowrap border-b border-[#e3e5ea] py-3 pl-4 pr-6 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.picks.map(p => {
                      const g = groups.find(x => x.key === p.key);
                      if (!g) return null;
                      const a = groupAmount(g, p.plays, adSeconds, draft.start, draft.end);
                      const full = issues.filter(i => i.label === g.label);
                      return (
                        <tr key={p.key} className="border-b border-[#f1f2f7] last:border-0">
                          <td className="py-4 pl-6 pr-4">
                            <b className="block font-medium text-[#1a1d25]">{g.label}</b>
                            <span className="mt-1 block text-xs leading-4 text-[#656972]">{groupSchedule(g)}</span>
                            {full.length > 0 && <span className="mt-2 inline-flex"><Badge tone="warning">Full on {full.length} day{full.length === 1 ? "" : "s"}</Badge></span>}
                          </td>
                          <td className="px-4 py-4 text-right tabular-nums">{p.plays}</td>
                          <td className="px-4 py-4 text-right tabular-nums">{a.days}</td>
                          <td className="px-4 py-4 text-right tabular-nums">{fmtPrice(groupDayPrice(g, p.plays, adSeconds))}</td>
                          <td className="py-4 pl-4 pr-6 text-right font-medium tabular-nums text-[#1a1d25]">{fmtPrice(a.amount)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            {creative && creative.seconds > 15 && (
              <p className="m-0 text-xs leading-4 text-[#656972]">
                Your ad runs {Math.round(creative.seconds)} seconds, so each play uses {spotsFor(creative.seconds)} of the screen's 15-second spots and is priced that way.
              </p>
            )}
          </div>

          <aside className={cn(cardCn, "flex w-full flex-col gap-6 p-6 lg:sticky lg:top-0")}>
            <h2 className="m-0 text-base font-semibold leading-6">Summary</h2>
            <KeyValues total rows={[[`Total for ${allDays} day${allDays === 1 ? "" : "s"}`, total == null ? "…" : fmtPrice(total)]]} />
            <hr className={hrCn} />
            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-sm font-medium leading-5">Wallet</h3>
              <KeyValues rows={[
                ["Available balance", wallet == null ? "…" : fmtPrice(wallet)],
                ...(short == null && wallet != null && total != null ? [["After this request", fmtPrice(wallet - total)] as [string, string]] : []),
              ]} />
            </div>
            {left != null && (
              <div className="flex flex-col gap-2">
                <h3 className="m-0 text-sm font-medium leading-5">Campaign budget</h3>
                <KeyValues rows={[
                  ["Left to spend", fmtPrice(left)],
                  ...(total != null ? [["After this request", fmtPrice(left - total), overBudget ? "text-[#aa0f16]" : undefined] as [string, string, string?]] : []),
                ]} />
              </div>
            )}

            {issues.length > 0 && (
              <Callout tone="warn"
                title={sendError ? `${issues[0].label} just filled up on ${issues.length} day${issues.length === 1 ? "" : "s"}` : `${issues.length} day${issues.length === 1 ? "" : "s"} don't have room`}
                actions={<>
                  <Link to={detailHref} className="inline-flex h-8 items-center rounded-lg border border-[#d2d4d9] bg-white px-3 text-xs font-medium hover:bg-[#f8faff]">Change dates</Link>
                  {[...new Set(issues.map(i => i.label))].map(l => (
                    <Btn key={l} size="sm" onClick={() => removePick(l)}>Remove {l}</Btn>
                  ))}
                </>}>
                {sendError && <p>Someone else booked these days after you checked. Nothing was sent and no money was held.</p>}
                <div className="mt-2"><KeyValues rows={issues.map(i => [fmtDayLong(i.date), `${i.playsLeft} play${i.playsLeft === 1 ? "" : "s"} left`])} /></div>
              </Callout>
            )}
            {overBudget && left != null && total != null && (
              <Callout tone="crit" title={`${fmtPrice(total - left)} over Left to spend`}
                actions={<Link to={`/campaigns/${draft.campaignId}/edit`} className="inline-flex h-8 items-center rounded-lg border border-[#d2d4d9] bg-white px-3 text-xs font-medium hover:bg-[#f8faff]">Edit budget</Link>}>
                <p>Edit the screen's time slots or the campaign budget to fit.</p>
              </Callout>
            )}
            {short != null && (
              <Callout tone="warn" title={`You need ${fmtPrice(short)} more`}>
                <p>Add funds to send this request. Your picks stay saved here.</p>
              </Callout>
            )}
            {otherError && <Callout tone="crit" title="This request can't be sent yet"><p className="whitespace-pre-line">{otherError}</p></Callout>}

            {short != null ? (
              <Btn variant="primary" className="w-full pl-3" disabled={topping} onClick={topUp}>
                <Plus aria-hidden />{topping ? "Adding…" : `Add ${fmtPrice(short)}`}
              </Btn>
            ) : (
              <Btn variant="primary" className="w-full" disabled={!canSend} onClick={send}>
                {sending ? "Sending…" : "Send request"}
              </Btn>
            )}
            {!creative && <p className="-mt-3 m-0 text-xs leading-4 text-[#656972]">Add the ad to send this request.</p>}
            <p className="m-0 text-xs leading-4 text-[#656972]">
              On hold until {space?.name ?? "the broadcaster"} answers. It comes back to your balance if you withdraw the request or they don't answer within 48 hours.
            </p>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
};

export default ReviewRequest;
