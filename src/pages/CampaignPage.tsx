import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Ellipsis, Globe, Lock, Pause, Pencil, Play, Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, Breadcrumb, CampaignButton, CampaignStatusBadge, RowStatusBadge } from "@/components/campaigns/CampaignBits";
import { campaignToast } from "@/components/campaigns/campaignToast";
import {
  campaignMoney, campaignRows, fmtMoney, fmtRange, playsPerDay, scheduleNote,
  type Booking, type Campaign, type CampaignRow, type CampaignStatus, type Money, type Offer,
} from "@/components/campaigns/campaignData";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import CampaignDetail from "@/pages/CampaignDetail";

type Space = { id: number; name: string };
type Screen = { id: number; label: string };
type Slot = { id: number; screen_id: number };

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

/** Space names and screen labels for the bookings in the table, looked up through their slots. */
function useBookingPlaces(bookings: Booking[]) {
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
      queryFn: () => api.get<Slot[]>(`/api/spaces/${spaceId}/screens/${screen.id}/slots`),
    })),
  });
  const spaceName = new Map(spaceIds.map((id, i) => [id, spaces[i]?.data?.name]));
  const screenOfSlot = new Map<number, string>();
  screenList.forEach(({ screen }, i) => (slots[i]?.data ?? []).forEach(sl => screenOfSlot.set(sl.id, screen.label)));
  return (b: Booking) => ({
    name: spaceName.get(b.space_id) ?? `Space ${b.space_id}`,
    screen: [...new Set((b.booking_slots ?? []).map(s => screenOfSlot.get(s.slot_id)).filter(Boolean))].join(", "),
  });
}

function SpendCard({ budget, money, note, hasActivity }: { budget: number; money: Money; note: string; hasActivity: boolean }) {
  const pct = (n: number) => `${budget > 0 ? Math.min(100, (n / budget) * 100) : 0}%`;
  const legend = [
    { key: "spent", label: "Spent", value: money.spent, sub: "Plays that already ran", dot: "bg-[#232c7b]" },
    { key: "booked", label: "Booked", value: money.booked, sub: "Accepted, still to play", dot: "bg-[#3a47c2]" },
    { key: "waiting", label: "Waiting", value: money.waiting, sub: "Held until broadcasters answer", dot: "bg-[#cad6fe]" },
    { key: "left", label: "Left to spend", value: money.left, sub: "Ready for new bookings", dot: "bg-[#f1f2f7] ring-1 ring-inset ring-[#d2d4d9]" },
  ];
  return (
    <section className="flex w-full flex-col gap-5 rounded-xl border-[0.8px] border-[#e3e5ea] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium leading-[18px] text-[#656972]">Left to spend</p>
          <p className="flex items-end gap-1.5">
            <span className="text-[32px] font-semibold leading-10 tracking-[-0.64px] text-[#1a1d25]">{fmtMoney(Math.round(money.left))}</span>
            <span className="pb-1 text-base leading-6 text-[#656972]">of {fmtMoney(budget)}</span>
          </p>
        </div>
        <p className="max-w-[364px] text-right text-[13px] leading-[18px] text-[#4a4d56]">{note}</p>
      </div>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-[5px] bg-[#f1f2f7]" aria-hidden="true">
        {money.spent > 0 && <div className="h-full bg-[#232c7b]" style={{ width: pct(money.spent) }} />}
        {money.booked > 0 && <div className="h-full bg-[#3a47c2]" style={{ width: pct(money.booked) }} />}
        {money.waiting > 0 && <div className="h-full bg-[#cad6fe]" style={{ width: pct(money.waiting) }} />}
      </div>
      {hasActivity && (
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
          {legend.map(l => (
            <div key={l.key} className="flex flex-col gap-1">
              <dt className="flex items-center gap-2 text-[13px] leading-[18px] text-[#4a4d56]">
                <span className={`size-2.5 rounded-[3px] ${l.dot}`} aria-hidden="true" />{l.label}
              </dt>
              <dd className="pl-[18px] text-base font-semibold leading-6 text-[#1a1d25]">{fmtMoney(Math.round(l.value))}</dd>
              <dd className="pl-[18px] text-[13px] leading-[18px] text-[#656972]">{l.sub}</dd>
            </div>
          ))}
        </dl>
      )}
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

const COLS = "grid-cols-[minmax(0,1fr)_173px_143px_103px_69px_48px]";
const headCn = "flex items-center bg-[#f8faff] px-4 py-2.5 text-[13px] font-medium leading-[18px] text-[#656972]";
const cellCn = "flex items-center px-4 py-3.5 text-sm leading-5 text-[#1a1d25]";

function RowsTable({ campaign, rows, place, onOpen }: {
  campaign: Campaign;
  rows: ReturnType<typeof campaignRows>;
  place: ReturnType<typeof useBookingPlaces>;
  onOpen: (row: CampaignRow) => void;
}) {
  const groups = [
    { key: "needs", label: "Needs you", rows: rows.needs, loud: true },
    { key: "waiting", label: "Waiting on broadcasters", rows: rows.waiting, loud: false },
    { key: "booked", label: "Booked", rows: rows.booked, loud: false },
  ].filter(g => g.rows.length > 0);

  return (
    <div className="w-full self-start overflow-x-auto rounded-xl border-[0.8px] border-[#e3e5ea] bg-white">
      <div role="table" aria-label="Screens in this campaign" className="min-w-[640px]">
        <div role="row" className={`grid ${COLS} border-b-[0.8px] border-[#e3e5ea]`}>
          {["Screen", "Status", "Dates"].map(h => <div key={h} role="columnheader" className={headCn}>{h}</div>)}
          {["Plays a day", "Total"].map(h => <div key={h} role="columnheader" className={`${headCn} justify-end`}>{h}</div>)}
          <div role="columnheader" className={headCn}><span className="sr-only">Open</span></div>
        </div>
        {groups.map(g => (
          <div key={g.key} role="rowgroup">
            <div role="row" className="flex items-center gap-2 border-b-[0.8px] border-[#e3e5ea] bg-[#f8faff] px-4 py-2 text-[13px] leading-[18px]">
              <span role="cell" className="font-medium text-[#4a4d56]">{g.label}</span>
              {g.loud
                ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#3a47c2] px-1.5 text-xs font-medium leading-4 text-white">{g.rows.length}</span>
                : <span className="text-[#656972]">{g.rows.length}</span>}
            </div>
            {g.rows.map(row => {
              const isOffer = row.kind === "offer";
              const p = row.kind === "booking" ? place(row.booking) : null;
              const label = isOffer ? "Offer from a broadcaster" : p!.name;
              const sub = isOffer ? row.offer.message || "Open it to accept or decline." : p!.screen || "Screen";
              return (
                <button
                  key={`${row.kind}-${isOffer ? row.offer.id : row.booking.id}`}
                  type="button"
                  role="row"
                  onClick={() => onOpen(row)}
                  className={`grid w-full ${COLS} border-b-[0.8px] border-[#f1f2f7] text-left transition-colors last:border-b-0 hover:bg-[#f8faff]`}>
                  <span role="cell" className="flex min-w-0 flex-col justify-center px-4 py-3.5">
                    <span className="truncate text-sm font-medium leading-5 text-[#1a1d25]">{label}</span>
                    <span className="truncate pt-0.5 text-[13px] leading-[18px] text-[#656972]">{sub}</span>
                  </span>
                  <span role="cell" className={cellCn}><RowStatusBadge status={row.status} /></span>
                  <span role="cell" className={cellCn}>
                    {isOffer ? fmtRange(campaign.start_date, campaign.end_date) : fmtRange(row.booking.start_date, row.booking.end_date)}
                  </span>
                  <span role="cell" className={`${cellCn} justify-end`}>{isOffer ? "—" : playsPerDay(row.booking) || "—"}</span>
                  <span role="cell" className={`${cellCn} justify-end`}>{isOffer ? "—" : fmtMoney(Number(row.booking.total_price))}</span>
                  <span role="cell" className="flex items-center justify-center"><ChevronRight className="size-4 text-[#656972]" aria-hidden="true" /></span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Detail({ term, children, aside }: { term: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[13px] leading-[18px] text-[#656972]">{term}</dt>
      <dd className="flex items-center justify-between gap-3 text-sm leading-5 text-[#1a1d25]">
        <span>{children}</span>
        {aside && <span className="text-[13px] leading-[18px] text-[#656972]">{aside}</span>}
      </dd>
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
  const hasRows = rows.needs.length + rows.waiting.length + rows.booked.length > 0;
  const place = useBookingPlaces(bookings);
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

  const answerOffer = async (offer: Offer, status: "accepted" | "rejected") => {
    setBusy(true);
    try {
      await api.patch(`/api/campaigns/${campaign.id}/offers/${offer.id}`, { status });
      await queryClient.invalidateQueries({ queryKey: ["campaign-offers", campaign.id] });
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      campaignToast(status === "accepted" ? "Offer accepted" : "Offer declined");
      setOpenOffer(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't answer the offer");
    } finally {
      setBusy(false);
    }
  };

  const findScreens = () => navigate(`/browse?campaign=${campaign.id}`);
  const editCampaign = () => navigate(`/campaigns/${campaign.id}/edit`);
  const note = !hasRows
    ? "Requests hold money from your wallet until the broadcaster answers."
    : isPublic
      ? `Offers from broadcasters can't go over ${fmtMoney(Math.round(money.left))}.`
      : `New requests can't go over ${fmtMoney(Math.round(money.left))}.`;
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

        <SpendCard budget={budget} money={money} note={note} hasActivity={hasRows} />

        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          {hasRows
            ? <RowsTable campaign={campaign} rows={rows} place={place} onOpen={row => (row.kind === "offer" ? setOpenOffer(row.offer) : navigate(`/bookings/${row.booking.id}`))} />
            : <FirstScreen onFind={findScreens} />}

          <aside className="flex flex-col gap-5 self-start rounded-xl bg-[#f8faff] p-5">
            <h2 className="text-base font-semibold leading-6 text-[#1a1d25]">Details</h2>
            <dl className="flex flex-col gap-4">
              <Detail term="Dates" aside={scheduleNote(campaign.start_date, campaign.end_date)}>
                {fmtRange(campaign.start_date, campaign.end_date, true)}
              </Detail>
              <Detail term="Where">{campaign.location || "Anywhere"}</Detail>
              <Detail term="Ad">{campaign.ad_type === "video" ? "Video" : "Image"}</Detail>
              {campaign.objective && <Detail term="Description">{campaign.objective}</Detail>}
            </dl>
            <div className="flex flex-col gap-2.5 border-t-[0.8px] border-[#e3e5ea] pt-4">
              <div className="flex items-center justify-between">
                <label htmlFor="c-visibility" className="flex items-center gap-2 text-sm font-medium leading-5 text-[#1a1d25]">
                  {isPublic ? <Globe className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                  {isPublic ? "Public" : "Private"}
                </label>
                <Switch id="c-visibility" checked={isPublic} onCheckedChange={on => setVisibility(on ? "public" : "private")}
                  className="data-[state=checked]:bg-[#3a47c2]" />
              </div>
              <p className="text-[13px] leading-[18px] text-[#4a4d56]">{visibilityNote(campaign)}</p>
            </div>
          </aside>
        </div>
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

      <Dialog open={!!openOffer} onOpenChange={open => !open && setOpenOffer(null)}>
        <DialogContent className="max-w-[440px] rounded-xl p-6">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl font-semibold leading-7 text-[#1a1d25]">Offer from a broadcaster</DialogTitle>
            <DialogDescription className="text-sm leading-5 text-[#4a4d56]">
              If you accept, it's booked for {fmtRange(campaign.start_date, campaign.end_date, true)} and comes out of this campaign's budget.
            </DialogDescription>
          </DialogHeader>
          {openOffer?.message && <p className="rounded-lg bg-[#f8faff] p-3 text-sm leading-5 text-[#1a1d25]">“{openOffer.message}”</p>}
          <div className="flex justify-end gap-2 pt-4">
            <CampaignButton size="md" disabled={busy} onClick={() => openOffer && answerOffer(openOffer, "rejected")}>Decline</CampaignButton>
            <CampaignButton size="md" variant="primary" disabled={busy} onClick={() => openOffer && answerOffer(openOffer, "accepted")}>Accept</CampaignButton>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
