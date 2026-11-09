import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Info, Plus, Search, WalletCards } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Badge, CampaignButton, CampaignStatusBadge } from "@/components/campaigns/CampaignBits";
import {
  campaignMoney, fmtMoney, fmtRange, liveBookings,
  type Booking, type Campaign, type CampaignStatus, type Offer,
} from "@/components/campaigns/campaignData";
import { api } from "@/lib/api";
import emptyArt from "@/assets/campaigns/plan-first-campaign.png";

const TABS: { key: "all" | CampaignStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Drafts" },
  { key: "paused", label: "Paused" },
  { key: "completed", label: "Completed" },
];

const COLS = "grid-cols-[minmax(0,1fr)_200px_192.75px_110.79px_106.47px_106.53px]";
const headCn = "flex items-center bg-[#f8faff] px-4 py-2.5 text-[13px] font-medium leading-[18px] text-[#656972]";
const cellCn = "flex items-center px-4 py-3.5 text-sm leading-5 text-[#1a1d25]";

export default function Campaigns() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [query, setQuery] = useState("");

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => api.get<Campaign[]>("/api/campaigns"),
  });
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["bookings"],
    queryFn: () => api.get<Booking[]>("/api/bookings"),
  });
  const { data: wallet, error: walletError } = useQuery<{ available: number | string }>({
    queryKey: ["wallet"],
    queryFn: () => api.get<{ available: number | string }>("/api/wallet"),
    retry: false,
  });
  // The API creates a wallet on first top-up, so "not found" just means nothing in it yet.
  const walletAmount = wallet ? Number(wallet.available) : walletError?.message === "Wallet not found" ? 0 : null;

  // Archived campaigns are gone from the advertiser's point of view.
  const visible = useMemo(() => campaigns.filter(c => c.status !== "archived"), [campaigns]);

  // Offers can only arrive while a campaign is live, so only those ask for them.
  const offerable = visible.filter(c => c.status === "active" || c.status === "paused");
  const offerQueries = useQueries({
    queries: offerable.map(c => ({
      queryKey: ["campaign-offers", c.id],
      queryFn: () => api.get<Offer[]>(`/api/campaigns/${c.id}/offers`),
    })),
  });
  const toReview = new Map(offerable.map((c, i) => [c.id, (offerQueries[i]?.data ?? []).filter(o => o.status === "pending").length]));

  const counts = Object.fromEntries(TABS.map(t => [t.key, t.key === "all" ? visible.length : visible.filter(c => c.status === t.key).length]));
  const q = query.trim().toLowerCase();
  const rows = visible
    .filter(c => tab === "all" || c.status === tab)
    .filter(c => !q || c.name.toLowerCase().includes(q))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (!isLoading && visible.length === 0) {
    return (
      <AppLayout activeNav="campaigns">
        <div className="flex min-h-full flex-col items-center justify-center gap-6 px-10 py-14 text-center">
          <div className="flex flex-col items-center gap-6">
            <h1 className="w-full max-w-[600px] text-[32px] font-semibold leading-[42px] text-[#4a4d56]">Plan your first campaign</h1>
            <img src={emptyArt} alt="" className="h-[270px] w-[400px] object-cover object-[50%_46%]" />
            <p className="max-w-[500px] text-base leading-[26px] text-[#656972]">
              A campaign holds your budget and dates. Once it's set up, you pick screens around town for your ad and broadcasters can offer you theirs.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <CampaignButton variant="primary" className="h-12 px-[16.8px] text-base" onClick={() => navigate("/campaigns/new")}>
              Create your first campaign
            </CampaignButton>
            <p className="flex items-center gap-2 text-xs text-[#9c9c9c]">
              Free plan includes one space each month.
              <Link to="/settings?tab=plans" className="text-[13px] font-medium leading-5 text-[#3a47c2] hover:underline">See plans</Link>
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeNav="campaigns">
      <div className="mx-auto flex w-full max-w-[1164px] flex-col gap-8">
        <div className="flex min-h-10 items-center gap-4">
          <h1 className="flex-1 text-2xl font-semibold text-[#1a1d25]">Campaigns</h1>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm leading-5">
              <span className="flex items-center gap-1 text-[#4a4d56]"><WalletCards className="size-4" aria-hidden="true" />Wallet</span>
              <span className="font-medium text-[#1a1d25]">{walletAmount === null ? "—" : fmtMoney(walletAmount)}</span>
            </span>
            <CampaignButton variant="primary" onClick={() => navigate("/campaigns/new")}>
              <Plus aria-hidden="true" />New campaign
            </CampaignButton>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div role="tablist" aria-label="Filter campaigns" className="flex gap-0.5 rounded-lg border-[0.8px] border-[#f1f2f7] bg-[#f8faff] p-1">
            {TABS.map(t => {
              const on = tab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(t.key)}
                  className={`flex h-8 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium leading-5 transition-colors ${
                    on ? "bg-white text-[#1a1d25] drop-shadow-[0_1px_1px_rgba(26,29,37,0.12)]" : "text-[#4a4d56] hover:text-[#1a1d25]"
                  }`}>
                  {t.label}
                  <span className="text-xs leading-4 text-[#656972]">{counts[t.key]}</span>
                </button>
              );
            })}
          </div>
          <label className="flex w-[300px] items-center gap-2 rounded-lg border border-[#e3e5ea] bg-white p-3 focus-within:border-[#3a47c2]">
            <Search className="size-4 shrink-0 text-[#656972]" aria-hidden="true" />
            <span className="sr-only">Search campaigns</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search campaigns"
              className="min-w-0 flex-1 bg-transparent text-sm text-[#1a1d25] outline-none placeholder:text-[#656972]"
            />
          </label>
        </div>

        <div className="w-full overflow-x-auto rounded-xl border-[0.8px] border-[#e3e5ea] bg-white">
          <div role="table" aria-label="Campaigns" className="min-w-[900px]">
            <div role="row" className={`grid ${COLS} border-b-[0.8px] border-[#e3e5ea]`}>
              {["Campaign", "Status", "Dates"].map(h => <div key={h} role="columnheader" className={headCn}>{h}</div>)}
              {["Screens", "Spent", "Budget"].map(h => <div key={h} role="columnheader" className={`${headCn} justify-end`}>{h}</div>)}
            </div>
            {isLoading ? (
              <p className="px-4 py-10 text-center text-sm text-[#656972]">Loading campaigns…</p>
            ) : rows.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#656972]">No campaigns match.</p>
            ) : rows.map((c, i) => {
              const mine = bookings.filter(b => b.campaign_id === c.id);
              const screens = liveBookings(mine).length;
              const spent = campaignMoney(Number(c.total_budget), mine).spent;
              const review = toReview.get(c.id) ?? 0;
              const muted = (n: number) => (n === 0 ? "text-[#656972]" : "");
              return (
                <div
                  key={c.id}
                  role="row"
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                  className={`grid ${COLS} cursor-pointer transition-colors hover:bg-[#f8faff] ${i < rows.length - 1 ? "border-b-[0.8px] border-[#f1f2f7]" : ""}`}>
                  <div role="cell" className={`${cellCn} gap-3`}>
                    <Link to={`/campaigns/${c.id}`} onClick={e => e.stopPropagation()} className="truncate font-medium hover:text-[#3a47c2]">{c.name}</Link>
                    {review > 0 && <Badge tone="amber" icon={Info}>{review} to review</Badge>}
                  </div>
                  <div role="cell" className={cellCn}><CampaignStatusBadge status={c.status} /></div>
                  <div role="cell" className={cellCn}>{fmtRange(c.start_date, c.end_date)}</div>
                  <div role="cell" className={`${cellCn} justify-end ${muted(screens)}`}>{screens}</div>
                  <div role="cell" className={`${cellCn} justify-end ${muted(spent)}`}>{fmtMoney(Math.round(spent))}</div>
                  <div role="cell" className={`${cellCn} justify-end`}>{fmtMoney(Number(c.total_budget))}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
