import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Ellipsis, Globe, Lock, Pause, Pencil, Play, Rocket, Search, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, Breadcrumb, CampaignButton, CampaignStatusText, RowStatusText } from "@/components/campaigns/CampaignBits";
import { campaignToast } from "@/components/campaigns/campaignToast";
import {
  campaignMoney, campaignRows, fmtCampaignMoney, fmtRange, scheduleNote, spotsPerDay,
  type Booking, type Campaign, type CampaignRow, type CampaignStatus, type Money, type Offer,
} from "@/components/campaigns/campaignData";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import CampaignDetail from "@/pages/CampaignDetail";
import { OfferDialog } from "@/components/campaigns/OfferDialog";
import { useBookingPlaces } from "@/components/campaigns/useBookingPlaces";

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
        <p className="py-40 text-center text-sm text-text-tertiary">Loading campaign…</p>
      </AppLayout>
    );
  }
  if (campaign && user && campaign.advertiser_id === user.id) return <CampaignPage campaign={campaign} />;
  return <CampaignDetail />;
}

function Amount({ value }: { value: number }) {
  const [whole, cents] = fmtCampaignMoney(value).split(".");
  return (
    <span className="tabular-nums">
      {whole}<span className="align-top text-base leading-6">.{cents}</span>
    </span>
  );
}

function SpendCard({ budget, money, note, completed }: { budget: number; money: Money; note: string; completed: boolean }) {
  const pct = (n: number) => `${budget > 0 ? Math.min(100, (n / budget) * 100) : 0}%`;
  const legend = [
    { key: "spent", label: "Spent", value: money.spent, sub: "Plays that already ran", dot: "bg-budget-spent" },
    { key: "booked", label: "Booked", value: money.booked, sub: "Accepted, still to play", dot: "bg-budget-booked" },
    { key: "waiting", label: "On hold", value: money.waiting, sub: "Held until broadcasters answer", dot: "bg-budget-hold" },
    { key: "left", label: "Left to spend", value: money.left, sub: "Ready for new bookings", dot: "bg-budget-left ring-1 ring-inset ring-[#d2d4d9]" },
  ];
  return (
    <section className="flex w-full flex-col gap-5 rounded-xl border-[0.8px] border-border-default bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium leading-[18px] text-text-tertiary">{completed ? "Spent" : "Left to spend"}</p>
          <p className="flex items-end gap-1.5">
            <span className="text-[32px] font-semibold leading-10 tracking-[-0.64px] text-text-primary">
              <Amount value={completed ? money.spent : money.left} />
            </span>
            <span className="pb-1 text-base leading-6 tabular-nums text-text-tertiary">of {fmtCampaignMoney(budget)} budget</span>
          </p>
        </div>
        <p className="max-w-[364px] text-right text-[13px] leading-[18px] text-text-secondary">{note}</p>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-md bg-budget-left" aria-hidden="true">
        {money.spent > 0 && <div className="h-full bg-budget-spent" style={{ width: pct(money.spent) }} />}
        {money.booked > 0 && <div className="h-full bg-budget-booked" style={{ width: pct(money.booked) }} />}
        {money.waiting > 0 && <div className="h-full bg-budget-hold" style={{ width: pct(money.waiting) }} />}
      </div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-4 md:grid-cols-4">
        {legend.map(l => (
          <div key={l.key} className="flex flex-col gap-1">
            <dt className="flex items-center gap-2 text-[13px] leading-[18px] text-text-secondary">
              <span className={`size-2.5 rounded-[3px] ${l.dot}`} aria-hidden="true" />{l.label}
            </dt>
            <dd className="pl-[18px] text-base font-semibold leading-6 tabular-nums text-text-primary">{fmtCampaignMoney(l.value)}</dd>
            <dd className="pl-[18px] text-[13px] leading-[18px] text-text-tertiary">{l.sub}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function NoBookings({ onFind }: { onFind: () => void }) {
  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-xl border-[0.8px] border-border-default bg-white px-6 py-12 text-center">
      <div className="flex max-w-[420px] flex-col gap-1">
        <h3 className="text-base font-semibold leading-6 text-text-primary">No bookings yet</h3>
        <p className="text-sm leading-5 text-text-tertiary">Find screens near your location and send your first booking request. You need an ad first.</p>
      </div>
      <CampaignButton onClick={onFind}><Search aria-hidden="true" />Find screens</CampaignButton>
    </div>
  );
}

const COLS = "grid-cols-[minmax(0,1fr)_173px_143px_103px_69px_48px]";
const headCn = "flex items-center bg-surface-subtle px-4 py-2.5 text-xs font-medium leading-[18px] text-text-tertiary";
const cellCn = "flex items-center px-4 py-3.5 text-sm leading-5 text-text-primary";

function RowsTable({ campaign, rows, place, onOpen }: {
  campaign: Campaign;
  rows: ReturnType<typeof campaignRows>;
  place: ReturnType<typeof useBookingPlaces>["place"];
  onOpen: (row: CampaignRow) => void;
}) {
  const groups = [
    { key: "needs", label: "Action required", rows: rows.needs },
    { key: "waiting", label: "Waiting on broadcasters", rows: rows.waiting },
    { key: "booked", label: "Booked", rows: rows.booked },
    { key: "ended", label: "Ended", rows: rows.ended },
  ].filter(g => g.rows.length > 0);

  return (
    <div className="w-full self-start overflow-x-auto rounded-xl border-[0.8px] border-border-default bg-white">
      <div role="table" aria-label="Screens in this campaign" className="min-w-[640px]">
        <div role="row" className={`grid ${COLS} border-b-[0.8px] border-border-default`}>
          {["Screen", "Status", "Dates"].map(h => <div key={h} role="columnheader" className={headCn}>{h}</div>)}
          {["Spots a day", "Amount"].map(h => <div key={h} role="columnheader" className={`${headCn} justify-end`}>{h}</div>)}
          <div role="columnheader" className={headCn}><span className="sr-only">Open</span></div>
        </div>
        {groups.map(g => (
          <div key={g.key} role="rowgroup">
            <div role="row" className="flex items-center gap-2 border-b-[0.8px] border-border-default bg-surface-subtle px-4 py-2 text-[13px] leading-[18px]">
              <span role="cell" className="font-medium text-text-secondary">{g.label}</span>
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-surface-muted px-1.5 text-xs font-medium tabular-nums text-text-secondary">{g.rows.length}</span>
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
                  className={`grid w-full ${COLS} border-b-[0.8px] border-border-subtle text-left transition-colors last:border-b-0 hover:bg-surface-subtle`}>
                  <span role="cell" className="flex min-w-0 flex-col justify-center px-4 py-3.5">
                    <span className="truncate text-sm font-medium leading-5 text-text-primary">{label}</span>
                    <span className="truncate pt-0.5 text-[13px] leading-[18px] text-text-tertiary">{sub}</span>
                  </span>
                  <span role="cell" className={cellCn}><RowStatusText status={row.status} /></span>
                  <span role="cell" className={cellCn}>
                    {isOffer ? fmtRange(campaign.start_date, campaign.end_date) : fmtRange(row.booking.start_date, row.booking.end_date)}
                  </span>
                  <span role="cell" className={`${cellCn} justify-end`}>{isOffer ? "—" : spotsPerDay(row.booking) || "—"}</span>
                  <span role="cell" className={`${cellCn} justify-end tabular-nums`}>{isOffer ? "—" : fmtCampaignMoney(Number(row.booking.total_price))}</span>
                  <span role="cell" className="flex items-center justify-center"><ChevronRight className="size-4 text-text-tertiary" aria-hidden="true" /></span>
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
      <dt className="text-[13px] leading-[18px] text-text-tertiary">{term}</dt>
      <dd className="flex items-center justify-between gap-3 text-sm leading-5 text-text-primary">
        <span>{children}</span>
        {aside && <span className="text-[13px] leading-[18px] text-text-tertiary">{aside}</span>}
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
  const hasRows = rows.needs.length + rows.waiting.length + rows.booked.length + rows.ended.length > 0;
  const { place } = useBookingPlaces(bookings);
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
  const note = !hasRows
    ? "Requests hold money from your wallet until the broadcaster answers."
    : isPublic
      ? `Offers from broadcasters can't go over ${fmtCampaignMoney(money.left)}.`
      : `New requests can't go over ${fmtCampaignMoney(money.left)}.`;
  const outOfBudget = budget > 0 && money.left <= 0 && (campaign.status === "active" || campaign.status === "paused");

  return (
    <AppLayout activeNav="campaigns">
      <div className="mx-auto flex w-full max-w-[1164px] flex-col gap-6 pb-14 pt-2">
        <Breadcrumb current={campaign.name} />

        <div className="flex min-h-10 flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="truncate text-2xl font-semibold text-text-primary">{campaign.name}</h1>
            <CampaignStatusText status={campaign.status} />
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
              <CampaignButton variant="primary" disabled={busy} onClick={() => setStatus("active", "Campaign resumed", "paused")}><Play aria-hidden="true" />Resume campaign</CampaignButton>
            )}
            {campaign.status === "draft" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <CampaignButton aria-label="More actions" className="size-8 px-0"><Ellipsis aria-hidden="true" /></CampaignButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem className="gap-2" onSelect={() => setStatus("active", "Campaign is live")}><Rocket className="size-4" aria-hidden="true" />Make it live</DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-text-danger focus:text-text-danger" onSelect={() => setConfirmDelete(true)}><Trash2 className="size-4" aria-hidden="true" />Delete campaign</DropdownMenuItem>
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

        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold leading-6 text-text-primary">Budget</h2>
          <SpendCard budget={budget} money={money} note={note} completed={campaign.status === "completed"} />
        </section>

        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="flex min-w-0 flex-col gap-3">
            <h2 className="text-base font-semibold leading-6 text-text-primary">Bookings</h2>
            {hasRows
              ? <RowsTable campaign={campaign} rows={rows} place={place} onOpen={row => (row.kind === "offer" ? setOpenOffer(row.offer) : navigate(`/bookings/${row.booking.id}`))} />
              : <NoBookings onFind={findScreens} />}
          </section>

          <aside className="flex flex-col gap-5 self-start rounded-xl bg-surface-subtle p-5">
            <h2 className="text-base font-semibold leading-6 text-text-primary">Details</h2>
            <dl className="flex flex-col gap-4">
              <Detail term="Dates" aside={scheduleNote(campaign.start_date, campaign.end_date)}>
                {fmtRange(campaign.start_date, campaign.end_date, true)}
              </Detail>
              <Detail term="Where">{campaign.location || "Anywhere"}</Detail>
              <Detail term="Ad">{campaign.ad_type === "video" ? "Video" : "Image"}</Detail>
              {campaign.objective && <Detail term="Description">{campaign.objective}</Detail>}
            </dl>
            <div className="flex flex-col gap-2.5 border-t-[0.8px] border-border-default pt-4">
              <div className="flex items-center justify-between">
                <label htmlFor="c-visibility" className="flex items-center gap-2 text-sm font-medium leading-5 text-text-primary">
                  {isPublic ? <Globe className="size-4" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                  {isPublic ? "Public" : "Private"}
                </label>
                <Switch id="c-visibility" checked={isPublic} onCheckedChange={on => setVisibility(on ? "public" : "private")}
                  className="data-[state=checked]:bg-brand" />
              </div>
              <p className="text-[13px] leading-[18px] text-text-secondary">{visibilityNote(campaign)}</p>
            </div>
          </aside>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="max-w-[440px] gap-2 rounded-xl p-6">
          <AlertDialogHeader className="space-y-2 text-left">
            <AlertDialogTitle className="text-xl font-semibold leading-7 text-text-primary">Delete {campaign.name}?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-5 text-text-secondary">
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
