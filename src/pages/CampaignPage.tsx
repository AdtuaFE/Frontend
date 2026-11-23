import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarCheck, ChevronRight, CircleCheck, CirclePlay, CircleX, Clock, Ellipsis, Inbox, Pause, Pencil, Play, Search, TriangleAlert,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, Breadcrumb, CampaignButton, CampaignStatusBadge } from "@/components/campaigns/CampaignBits";
import { campaignToast } from "@/components/campaigns/campaignToast";
import {
  campaignMoney, campaignRows, fmtRange,
  type Booking, type Campaign, type CampaignRow, type CampaignStatus, type Money, type Offer,
} from "@/components/campaigns/campaignData";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import CampaignDetail from "@/pages/CampaignDetail";
import { OfferDialog } from "@/components/campaigns/OfferDialog";
import { useBookingPlaces } from "@/components/campaigns/useBookingPlaces";
import { KeyValues, ScreenCell, TonePill, cardCn } from "@/components/booking/bookingUi";
import { hoursLeftLabel } from "@/components/booking/bookingStatus";
import { fmtPrice } from "@/components/browse/browseData";

/** Owners get the campaign page; broadcasters looking at a public campaign keep the offer view. */
export default function CampaignRoute() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ["campaign", Number(id)],
    queryFn: () => api.get<Campaign>(`/api/campaigns/${id}`),
    enabled: !!id,
  });
  if (isLoading) {
    return (
      <AppLayout activeNav="campaigns">
        <p className="py-40 text-center text-sm text-[#656972]">Loading campaign…</p>
      </AppLayout>
    );
  }
  if (campaign && user && campaign.advertiser_id === user.id) return <CampaignPage campaign={campaign} />;
  return <CampaignDetail />;
}

function SpendCard({ budget, money }: { budget: number; money: Money }) {
  const pct = (n: number) => `${budget > 0 ? Math.min(100, (n / budget) * 100) : 0}%`;
  const legend = [
    { key: "spent", label: "Spent", value: money.spent, dot: "bg-[#232c7b]" },
    { key: "booked", label: "Scheduled", value: money.booked, dot: "bg-[#3a47c2]" },
    { key: "waiting", label: "On hold", value: money.waiting, dot: "bg-[#cad6fe]" },
    { key: "left", label: "Left to spend", value: money.left, dot: "bg-[#f1f2f7] shadow-[inset_0_0_0_1px_#e3e5ea]" },
  ];
  return (
    <section className={`${cardCn} flex flex-col gap-6 p-6`}>
      <div className="flex flex-col gap-1">
        <span className="text-sm leading-5 text-[#4a4d56]">Left to spend</span>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-[32px] font-semibold leading-10 tracking-[-0.01em] tabular-nums text-[#1a1d25]">{fmtPrice(money.left)}</span>
          <span className="text-sm leading-5 text-[#656972]">of {fmtPrice(budget)} budget</span>
        </div>
      </div>
      <div role="img" className="flex h-3 gap-1 overflow-hidden rounded bg-[#f1f2f7]"
        aria-label={`Spent ${fmtPrice(money.spent)}, scheduled ${fmtPrice(money.booked)}, on hold ${fmtPrice(money.waiting)}, left to spend ${fmtPrice(money.left)}`}>
        {money.spent > 0 && <i className="block h-full bg-[#232c7b]" style={{ width: pct(money.spent) }} />}
        {money.booked > 0 && <i className="block h-full bg-[#3a47c2]" style={{ width: pct(money.booked) }} />}
        {money.waiting > 0 && <i className="block h-full bg-[#cad6fe]" style={{ width: pct(money.waiting) }} />}
      </div>
      <dl className="m-0 grid grid-cols-2 gap-4 md:grid-cols-4">
        {legend.map(l => (
          <div key={l.key} className="grid grid-cols-[12px_minmax(0,1fr)] items-center gap-x-2 gap-y-1">
            <i aria-hidden className={`h-3 w-3 rounded-sm ${l.dot}`} />
            <dt className="text-sm leading-5 text-[#4a4d56]">{l.label}</dt>
            <dd className="col-start-2 m-0 text-xl font-semibold leading-7 tabular-nums text-[#1a1d25]">{fmtPrice(l.value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const STEPS = [
  { title: "Find a space that fits", text: "Search the map. Your dates are already filled in." },
  { title: "Pick slots and plays a day", text: "Each slot has a price per day set by the broadcaster." },
  { title: "Add your ad and send the request", text: "Broadcasters have 48 hours to answer. If they don't, the money goes back to your wallet." },
];

function FirstScreen({ onFind }: { onFind: () => void }) {
  return (
    <div className="flex max-w-[620px] flex-col gap-8 pt-2">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold leading-7 text-[#1a1d25]">Book your first screen</h2>
        <p className="text-base leading-6 text-[#4a4d56]">Pick screens and send requests. Nothing plays until a broadcaster has seen your ad and said yes.</p>
      </div>
      <ol className="flex flex-col gap-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
            <span className="mt-0.5 grid size-7 place-items-center rounded-full bg-[#f2f5ff] text-[13px] font-semibold leading-[18px] text-[#3a47c2]">{i + 1}</span>
            <span className="flex flex-col">
              <span className="pt-1 text-sm font-medium leading-5 text-[#1a1d25]">{s.title}</span>
              <span className="pt-0.5 text-[13px] leading-[18px] text-[#656972]">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div>
        <CampaignButton size="md" variant="primary" onClick={onFind}><Search aria-hidden="true" />Find screens</CampaignButton>
      </div>
    </div>
  );
}

const thCn = "whitespace-nowrap border-b border-[#e3e5ea] bg-[#f8faff] px-4 py-3 text-left text-xs font-medium leading-4 text-[#656972]";
const tdCn = "border-b border-[#f1f2f7] px-4 py-4 align-top text-sm leading-5 text-[#4a4d56]";

const ROW_TEXT: Record<CampaignRow["status"], { label: string; cn: string; icon: typeof Clock }> = {
  not_approved: { label: "Not approved", cn: "text-[#7c5003]", icon: TriangleAlert },
  new_offer: { label: "New offer", cn: "text-[#3a47c2]", icon: Inbox },
  pending: { label: "Waiting", cn: "text-[#7c5003]", icon: Clock },
  playing: { label: "Playing", cn: "text-[#016d36]", icon: CirclePlay },
  scheduled: { label: "Scheduled", cn: "text-[#3a47c2]", icon: CalendarCheck },
  done: { label: "Completed", cn: "text-[#4a4d56]", icon: CircleCheck },
  expired: { label: "Expired", cn: "text-[#4a4d56]", icon: CircleX },
  withdrawn: { label: "Withdrawn", cn: "text-[#4a4d56]", icon: CircleX },
};

function RowStatus({ status }: { status: CampaignRow["status"] }) {
  const look = ROW_TEXT[status];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium leading-4 ${look.cn}`}><look.icon aria-hidden className="h-4 w-4" />{look.label}</span>;
}

function RowsTable({ campaign, rows, place, slot, images, onOpen }: {
  campaign: Campaign;
  rows: ReturnType<typeof campaignRows>;
  place: ReturnType<typeof useBookingPlaces>["place"];
  slot: ReturnType<typeof useBookingPlaces>["slot"];
  images: Map<number, string | undefined>;
  onOpen: (row: CampaignRow) => void;
}) {
  const [hideEnded, setHideEnded] = useState(false);
  const groups = [
    { key: "needs", label: "Needs you", rows: rows.needs, loud: true },
    { key: "waiting", label: "Waiting on broadcasters", rows: rows.waiting, loud: false },
    { key: "approved", label: "Approved", rows: rows.approved, loud: false },
    { key: "ended", label: "Ended", rows: rows.ended, loud: false },
  ].filter(g => g.rows.length > 0);

  /** Time slot names with plays a day, one line per slot, from the booking's weekday rows. */
  const slotLines = (b: Booking) => {
    const seen = new Map<string, number>();
    for (const bs of b.booking_slots ?? []) {
      const label = slot(bs.slot_id)?.label ?? `Slot ${bs.slot_id}`;
      if (!seen.has(label)) seen.set(label, bs.play_count ?? bs.daily_playbacks_allocated);
    }
    return [...seen.entries()];
  };

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#e3e5ea] bg-white">
      <table className="w-full min-w-[880px] border-collapse">
        <thead>
          <tr>
            <th className={thCn}>Screen</th>
            <th className={thCn}>Time slots</th>
            <th className={`${thCn} text-right`}>Plays a day</th>
            <th className={thCn}>Status</th>
            <th className={thCn}>Answer due</th>
            <th className={thCn}>Dates</th>
            <th className={`${thCn} text-right`}>Amount</th>
            <th className={thCn}><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        {groups.map(g => (
          <tbody key={g.key}>
            <tr>
              <td colSpan={8} className="border-b border-[#e3e5ea] bg-[#f8faff] px-4 py-2 text-xs font-medium leading-4 text-[#4a4d56]">
                <span className="flex items-center gap-2">
                  {g.label}
                  <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs font-medium tabular-nums ${g.loud ? "bg-[#3a47c2] text-white" : "bg-[#f1f2f7] text-[#4a4d56]"}`}>{g.rows.length}</span>
                  {g.key === "ended" && (
                    <button type="button" onClick={() => setHideEnded(h => !h)} className="text-xs font-medium text-[#3a47c2] hover:text-[#2e399f] hover:underline hover:underline-offset-[3px]">
                      {hideEnded ? "Show" : "Hide"}
                    </button>
                  )}
                </span>
              </td>
            </tr>
            {!(g.key === "ended" && hideEnded) && g.rows.map(row => {
              const isOffer = row.kind === "offer";
              const b = row.kind === "booking" ? row.booking : null;
              const p = b ? place(b) : null;
              const lines = b ? slotLines(b) : [];
              const due = row.status === "pending" && b?.created_at ? hoursLeftLabel(b.created_at) : null;
              const voided = row.status === "expired" || row.status === "withdrawn";
              return (
                <tr key={`${row.kind}-${isOffer ? row.offer.id : b!.id}`} onClick={() => onOpen(row)}
                  className="cursor-pointer transition-colors hover:bg-[#f8faff]">
                  <td className={tdCn}>
                    {isOffer ? (
                      <ScreenCell name="Offer from a broadcaster" sub={row.offer.message || "Open it to accept or decline."} />
                    ) : (
                      <ScreenCell image={images.get(b!.space_id)} name={p!.name} sub={p!.screen || undefined} />
                    )}
                  </td>
                  <td className={tdCn}><span className="flex flex-col gap-2">{lines.length ? lines.map(([l]) => <span key={l}>{l}</span>) : "—"}</span></td>
                  <td className={`${tdCn} text-right tabular-nums`}><span className="flex flex-col gap-2">{lines.length ? lines.map(([l, n]) => <span key={l}>{n}</span>) : "—"}</span></td>
                  <td className={tdCn}><RowStatus status={row.status} /></td>
                  <td className={tdCn}>{due ? <TonePill tone={due.tone}>{due.text}</TonePill> : null}</td>
                  <td className={`${tdCn} whitespace-nowrap`}>{isOffer ? fmtRange(campaign.start_date, campaign.end_date) : fmtRange(b!.start_date, b!.end_date)}</td>
                  <td className={`${tdCn} text-right tabular-nums ${voided ? "text-[#656972] line-through" : "font-medium text-[#1a1d25]"}`}>
                    {isOffer ? "—" : fmtPrice(Number(b!.total_price))}
                  </td>
                  <td className={`${tdCn} w-6 pl-0`}>
                    <button type="button" aria-label={isOffer ? "Open offer" : `Open ${p!.name}`} onClick={e => { e.stopPropagation(); onOpen(row); }}
                      className="grid h-6 w-6 place-items-center rounded text-[#656972] hover:text-[#1a1d25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3a47c2]">
                      <ChevronRight aria-hidden className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function visibilityNote(campaign: Campaign): string {
  if (campaign.visibility === "private") return "Only you can see it. Broadcasters can't find it or send offers. Your bookings keep running.";
  if (campaign.status === "draft") return "Broadcasters can find it once it's live and send you offers.";
  return "Broadcasters can find it and send you offers. Turning this off keeps every booking you already have.";
}

function CampaignPage({ campaign }: { campaign: Campaign }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openOffer, setOpenOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["bookings"],
    queryFn: () => api.get<Booking[]>("/api/bookings"),
  });
  const { data: offers = [] } = useQuery<Offer[]>({
    queryKey: ["campaign-offers", campaign.id],
    queryFn: () => api.get<Offer[]>(`/api/campaigns/${campaign.id}/offers`),
  });

  // Arriving from the form: say what just happened, once.
  useEffect(() => {
    const message = (location.state as { toast?: string } | null)?.toast;
    if (!message) return;
    campaignToast(message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  const bookings = allBookings.filter(b => b.campaign_id === campaign.id);
  const budget = Number(campaign.total_budget);
  const money = campaignMoney(budget, bookings);
  const rows = campaignRows(bookings, offers);
  const bookingCount = rows.needs.filter(r => r.kind === "booking").length + rows.waiting.length + rows.approved.length + rows.ended.length;
  const hasRows = rows.needs.length + bookingCount > 0;
  const { place, slot } = useBookingPlaces(bookings);
  const spaceIds = [...new Set(bookings.map(b => b.space_id))];
  const imageQs = useQueries({
    queries: spaceIds.map(id => ({
      queryKey: ["space-images", id],
      queryFn: () => api.get<{ url: string; is_primary: boolean }[]>(`/api/spaces/${id}/images`),
      staleTime: 60_000,
    })),
  });
  const images = new Map(spaceIds.map((id, i) => {
    const list = imageQs[i]?.data ?? [];
    return [id, (list.find(x => x.is_primary) ?? list[0])?.url] as const;
  }));
  const isPublic = campaign.visibility !== "private";

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["campaign", campaign.id] });
    await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  };

  const setStatus = async (status: CampaignStatus, message: string, undoTo?: CampaignStatus) => {
    setBusy(true);
    try {
      await api.patch(`/api/campaigns/${campaign.id}/status`, { status });
      await refresh();
      campaignToast(message, undoTo ? () => { void setStatus(undoTo, "Change undone"); } : undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't change the campaign");
    } finally {
      setBusy(false);
    }
  };

  const setVisibility = async (visibility: "public" | "private", withUndo = true) => {
    try {
      await api.put(`/api/campaigns/${campaign.id}`, { visibility });
      await refresh();
      campaignToast(
        visibility === "private" ? "Campaign is now private" : "Campaign is now public",
        withUndo ? () => { void setVisibility(visibility === "private" ? "public" : "private", false); } : undefined,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't change who can see it");
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/api/campaigns/${campaign.id}`);
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      campaignToast("Campaign deleted");
      navigate("/campaigns");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete the campaign");
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  const findScreens = () => navigate(`/browse?campaign=${campaign.id}`);
  const editCampaign = () => navigate(`/campaigns/${campaign.id}/edit`);
  const outOfBudget = budget > 0 && money.left <= 0 && (campaign.status === "active" || campaign.status === "paused");

  return (
    <AppLayout activeNav="campaigns">
      <div className="mx-auto flex w-full max-w-[1164px] flex-col gap-6 pb-14 pt-2">
        <Breadcrumb current={campaign.name} />

        <div className="flex min-h-10 flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="truncate text-2xl font-semibold text-[#1a1d25]">{campaign.name}</h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <div className="flex items-center gap-3">
            {campaign.status === "active" && (
              <CampaignButton disabled={busy} onClick={() => setStatus("paused", "Campaign paused", "active")}><Pause aria-hidden="true" />Pause</CampaignButton>
            )}
            {campaign.status !== "completed" && campaign.status !== "archived" && (
              <CampaignButton onClick={editCampaign}><Pencil aria-hidden="true" />Edit</CampaignButton>
            )}
            {campaign.status === "active" && (
              <CampaignButton variant="primary" onClick={findScreens}><Search aria-hidden="true" />Find screens</CampaignButton>
            )}
            {campaign.status === "paused" && (
              <CampaignButton variant="primary" disabled={busy} onClick={() => setStatus("active", "Campaign resumed", "paused")}><Play aria-hidden="true" />Resume</CampaignButton>
            )}
            {campaign.status === "draft" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <CampaignButton aria-label="More actions" className="size-8 px-0"><Ellipsis aria-hidden="true" /></CampaignButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setStatus("active", "Campaign is live")}>Make it live</DropdownMenuItem>
                  <DropdownMenuItem className="text-[#c92324] focus:text-[#c92324]" onSelect={() => setConfirmDelete(true)}>Delete campaign</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {campaign.status === "paused" && (
          <Alert tone="warning" title="This campaign is paused">
            Broadcasters can't find it or send you offers. Bookings you already have keep playing.
          </Alert>
        )}
        {outOfBudget && (
          <Alert tone="warning" title="You've used this campaign's whole budget"
            action={<div><CampaignButton onClick={editCampaign}>Edit budget</CampaignButton></div>}>
            Broadcasters can't send new offers until there's budget left. Raise it to book more screens.
          </Alert>
        )}

        <div className="grid w-full grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <SpendCard budget={budget} money={money} />
          <section className={`${cardCn} flex flex-col gap-4 p-6`}>
            <h2 className="m-0 text-base font-semibold leading-6 text-[#1a1d25]">Details</h2>
            <KeyValues rows={[
              ["Dates", fmtRange(campaign.start_date, campaign.end_date)],
              ["Location", campaign.location || "Anywhere"],
              ["Ad", campaign.ad_type === "video" ? "Video" : "Image"],
            ]} />
            <div className="flex items-center justify-between gap-4 text-sm leading-5">
              <label htmlFor="c-visibility" className="text-[#4a4d56]">Visibility</label>
              <span className="flex items-center gap-3 text-[#1a1d25]">
                {isPublic ? "Public" : "Private"}
                <Switch id="c-visibility" checked={isPublic} onCheckedChange={on => setVisibility(on ? "public" : "private")}
                  className="data-[state=checked]:bg-[#3a47c2]" />
              </span>
            </div>
            <p className="m-0 text-xs leading-4 text-[#656972]">{visibilityNote(campaign)}</p>
            {campaign.objective && <p className="m-0 text-sm leading-5 text-[#4a4d56]">{campaign.objective}</p>}
          </section>
        </div>

        {hasRows ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="m-0 text-base font-semibold leading-6 text-[#1a1d25]">Bookings</h2>
              <span className="text-sm leading-5 text-[#656972]">{bookingCount} booking{bookingCount === 1 ? "" : "s"}</span>
            </div>
            <RowsTable campaign={campaign} rows={rows} place={place} slot={slot} images={images}
              onOpen={row => (row.kind === "offer" ? setOpenOffer(row.offer) : navigate(`/bookings/${row.booking.id}`))} />
          </section>
        ) : (
          <FirstScreen onFind={findScreens} />
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="max-w-[440px] gap-2 rounded-xl p-6">
          <AlertDialogHeader className="space-y-2 text-left">
            <AlertDialogTitle className="text-xl font-semibold leading-7 text-[#1a1d25]">Delete {campaign.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-5 text-[#4a4d56]">
              {bookings.length === 0 ? "This draft has no bookings. You can't undo this." : "You can't undo this."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-8">
            <CampaignButton size="md" onClick={() => setConfirmDelete(false)}>Cancel</CampaignButton>
            <CampaignButton size="md" variant="danger" disabled={busy} onClick={remove}>Delete campaign</CampaignButton>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <OfferDialog campaign={campaign} offer={openOffer} offers={offers} onClose={() => setOpenOffer(null)} />
    </AppLayout>
  );
}
