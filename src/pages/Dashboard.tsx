import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck, Circle, Plus, MapPin, X, List, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { loadWizardData } from "@/pages/Onboarding";
import { AppLayout } from "@/components/AppLayout";
import { CreateCampaignModal } from "@/components/CreateCampaignModal";
import { CreateSpaceModal } from "@/components/CreateSpaceModal";
import { BusinessProfileModal } from "@/components/BusinessProfileModal";
import { CreateBookingModal, type SpaceInfo } from "@/components/CreateBookingModal";
import { SpaceMap, type MapSpace } from "@/components/SpaceMap";

// ─── Types ────────────────────────────────────────────────────────────────────

type Campaign = {
  id: number;
  name: string;
  status: string;
  total_budget: number | null;
  start_date: string | null;
  end_date: string | null;
};

type MySpace = {
  id: number;
  name: string;
  description: string | null;
  space_type: string;
  city: string | null;
  country: string | null;
  cpm: number | null;
  est_daily_impressions: number | null;
  is_active: boolean;
  geo_lat: number | null;
  geo_lng: number | null;
};

type BrowseSpace = {
  id: number;
  name: string;
  description: string | null;
  space_type: string;
  city: string | null;
  country: string | null;
  cpm: number;
  est_daily_impressions: number | null;
  is_active: boolean;
  geo_lat: number | null;
  geo_lng: number | null;
};

type BroadcasterBooking = {
  id: number;
  space_id: number;
  campaign_id: number;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number | null;
  space_name?: string;
  campaign_name?: string;
};

type AdvertiserBooking = {
  id: number;
  campaign_id: number;
  space_id: number;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number | null;
};

type MyOffer = {
  id: number;
  campaign_id: number;
  campaign_name?: string;
  status: string;
  created_at: string;
  spaces: { space_id: number; proposed_price: number; space_name?: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  accepted:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-blue-100 text-blue-700",
};

const OFFER_COLORS: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  cancelled:"bg-muted text-muted-foreground",
};

const fmt = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

// ─── Detail panel (map click) ─────────────────────────────────────────────────

function SpaceDetailPanel({ space, isOwn, isAdvertiser, onClose, onBook }: {
  space: BrowseSpace;
  isOwn: boolean;
  isAdvertiser: boolean;
  onClose: () => void;
  onBook: (info: SpaceInfo) => void;
}) {
  const navigate = useNavigate();
  return (
    <>
      <div className="px-4 py-3.5 border-b flex items-start justify-between shrink-0">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm leading-snug truncate">{space.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{fmt(space.space_type)}</p>
        </div>
        <button onClick={onClose} className="ml-2 shrink-0 p-1 rounded hover:bg-accent transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {(space.city || space.country) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{[space.city, space.country].filter(Boolean).join(', ')}</span>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
            space.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
          }`}>
            {space.is_active ? 'Active' : 'Inactive'}
          </span>
          {isOwn && (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-[#FFE5CC] text-[#9a4f00]">
              Your space
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">CPM</p>
            <p className="text-xl font-bold mt-0.5">${space.cpm}</p>
          </div>
          {space.est_daily_impressions != null && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Daily impr.</p>
              <p className="text-xl font-bold mt-0.5">
                {space.est_daily_impressions >= 1000
                  ? `${(space.est_daily_impressions / 1000).toFixed(1)}k`
                  : space.est_daily_impressions.toLocaleString()}
              </p>
            </div>
          )}
        </div>
        {space.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{space.description}</p>
        )}
      </div>
      <div className="shrink-0 p-4 border-t flex flex-col gap-2">
        {isOwn && (
          <Button className="w-full bg-[#ff8a00] hover:bg-[#e77700] text-white"
            onClick={() => navigate(`/spaces/${space.id}`)}>
            Manage space
          </Button>
        )}
        {!isOwn && isAdvertiser && (
          <Button className="w-full bg-[#ff8a00] hover:bg-[#e77700] text-white"
            onClick={() => onBook({ id: space.id, name: space.name, cpm: space.cpm, est_daily_impressions: space.est_daily_impressions })}>
            Book this space
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={() => navigate(`/spaces/${space.id}`)}>
          View details
        </Button>
      </div>
    </>
  );
}

// ─── Map view ─────────────────────────────────────────────────────────────────

function MapView({ allSpaces, mySpaces, isAdvertiser, isBroadcaster, selectedId, onSelect, onBook }: {
  allSpaces: BrowseSpace[];
  mySpaces: MySpace[];
  isAdvertiser: boolean;
  isBroadcaster: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onBook: (info: SpaceInfo) => void;
}) {
  const mySpaceIds = isBroadcaster ? new Set(mySpaces.map(s => s.id)) : new Set<number>();

  const mapSpaces: MapSpace[] = allSpaces
    .filter((s): s is BrowseSpace & { geo_lat: number; geo_lng: number } =>
      s.geo_lat != null && s.geo_lng != null
    )
    .map(s => ({
      id: s.id,
      geo_lat: s.geo_lat,
      geo_lng: s.geo_lng,
      is_active: s.is_active,
      is_own: mySpaceIds.has(s.id),
    }));

  const selectedSpace = allSpaces.find(s => s.id === selectedId) ?? null;

  return (
    <div className="h-full flex">
      {/* Full-width map */}
      <div className="flex-1 relative isolate min-w-0">
        {mapSpaces.length > 0 ? (
          <SpaceMap spaces={mapSpaces} selectedId={selectedId} onSelect={onSelect} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <div className="text-center space-y-2">
              <MapPin className="h-12 w-12 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">No spaces with location data yet</p>
            </div>
          </div>
        )}

        {/* Legend */}
        {mapSpaces.length > 0 && (
          <div className="absolute bottom-8 left-3 z-[1000] bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-2 text-xs space-y-1.5 shadow-sm pointer-events-none">
            {isBroadcaster && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ff8a00] border border-white shadow-sm" />
                <span className="text-muted-foreground">Your spaces</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#3b82f6] border border-white shadow-sm" />
              <span className="text-muted-foreground">{isBroadcaster ? "Other spaces" : "Available spaces"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#94a3b8] border border-white shadow-sm" />
              <span className="text-muted-foreground">Inactive</span>
            </div>
          </div>
        )}
      </div>

      {/* Detail panel slides in from right */}
      {selectedSpace && (
        <div className="w-80 shrink-0 border-l flex flex-col bg-background overflow-hidden">
          <SpaceDetailPanel
            space={selectedSpace}
            isOwn={mySpaceIds.has(selectedSpace.id)}
            isAdvertiser={isAdvertiser}
            onClose={() => onSelect(selectedId!)}
            onBook={onBook}
          />
        </div>
      )}
    </div>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListSection({ title, count, action }: { title: string; count: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 mb-5">
      <h2 className="text-xl font-bold">{title}</h2>
      <span className="text-sm text-muted-foreground">{count}</span>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function ListView({
  mySpaces, campaigns, advertiserBookings, broadcasterBookings, myOffers,
  isBroadcaster, isAdvertiser, checklistItems, allChecklistDone,
  onAddSpace, onAddCampaign,
}: {
  mySpaces: MySpace[];
  campaigns: Campaign[];
  advertiserBookings: AdvertiserBooking[];
  broadcasterBookings: BroadcasterBooking[];
  myOffers: MyOffer[];
  isBroadcaster: boolean;
  isAdvertiser: boolean;
  checklistItems: { title: string; completed: boolean; onClick?: () => void }[];
  allChecklistDone: boolean;
  onAddSpace: () => void;
  onAddCampaign: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {/* Onboarding checklist */}
      {!allChecklistDone && (
        <div>
          <h2 className="text-xl font-bold mb-4">Setup checklist</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {checklistItems.map((item, i) => (
              <Card key={i}
                className={`transition-colors ${item.onClick ? "cursor-pointer hover:border-[#ff8a00]" : ""}`}
                onClick={item.onClick}>
                <CardContent className="pt-5 flex items-start gap-3">
                  {item.completed
                    ? <CircleCheck className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    : <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />}
                  <p className={`text-sm font-medium ${item.completed ? 'text-muted-foreground line-through' : ''}`}>
                    {item.title}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* BROADCASTER: My spaces */}
      {isBroadcaster && (
        <div>
          <ListSection
            title="My spaces"
            count={mySpaces.length}
            action={
              <Button size="sm" className="bg-[#ff8a00] hover:bg-[#e77700] text-white h-8 text-xs" onClick={onAddSpace}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add space
              </Button>
            }
          />
          {mySpaces.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mySpaces.map(s => (
                <Card key={s.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                  onClick={() => navigate(`/spaces/${s.id}`)}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">{s.name}</h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                      }`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fmt(s.space_type)}{s.city ? ` · ${s.city}` : ''}
                    </p>
                    {s.cpm != null && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        CPM: <span className="font-medium text-foreground">${s.cpm}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              <button onClick={onAddSpace}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d7dce3] p-6 text-sm text-muted-foreground transition hover:border-[#ff8a00] hover:text-[#ff8a00]">
                <Plus className="h-5 w-5" />New space
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
              <p>No spaces yet.</p>
              <Button onClick={onAddSpace} className="bg-[#FF8A00] hover:bg-[#e77700] text-white">
                Add a space
              </Button>
            </div>
          )}
        </div>
      )}

      {/* BROADCASTER: Incoming bookings */}
      {isBroadcaster && broadcasterBookings.length > 0 && (
        <div>
          <ListSection title="Incoming bookings" count={broadcasterBookings.length} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {broadcasterBookings.map(b => (
              <Card key={b.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                onClick={() => navigate(`/bookings/${b.id}`)}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Booking #{b.id}</p>
                      <h3 className="font-semibold text-sm mt-0.5">{b.space_name ?? `Space #${b.space_id}`}</h3>
                      {b.campaign_name && <p className="text-xs text-muted-foreground mt-0.5">{b.campaign_name}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[b.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {b.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{b.start_date} – {b.end_date}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* BROADCASTER: Offers */}
      {isBroadcaster && myOffers.length > 0 && (
        <div>
          <ListSection title="My offers" count={myOffers.length} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myOffers.map(o => {
              const total = o.spaces?.reduce((s, sp) => s + sp.proposed_price, 0) ?? 0;
              return (
                <Card key={o.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                  onClick={() => navigate(`/campaigns/${o.campaign_id}`)}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Offer #{o.id}</p>
                        <h3 className="font-semibold text-sm mt-0.5 truncate">{o.campaign_name ?? `Campaign #${o.campaign_id}`}</h3>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${OFFER_COLORS[o.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {o.status}
                      </span>
                    </div>
                    {o.spaces?.length > 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {o.spaces.length} space{o.spaces.length !== 1 ? 's' : ''} ·{' '}
                        <span className="font-medium text-foreground">${total.toLocaleString()}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ADVERTISER: Campaigns */}
      {isAdvertiser && (
        <div>
          <ListSection
            title="Campaigns"
            count={campaigns.length}
            action={
              <Button size="sm" className="bg-[#ff8a00] hover:bg-[#e77700] text-white h-8 text-xs" onClick={onAddCampaign}>
                <Plus className="h-3.5 w-3.5 mr-1" />New campaign
              </Button>
            }
          />
          {campaigns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map(c => (
                <Card key={c.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                  onClick={() => navigate(`/campaigns/${c.id}`)}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm">{c.name}</h3>
                      <span className="shrink-0 rounded-full bg-[#FFE5CC] px-2 py-0.5 text-xs font-medium capitalize text-[#9a4f00]">
                        {c.status}
                      </span>
                    </div>
                    {c.total_budget != null && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Budget: <span className="font-medium text-foreground">${c.total_budget.toLocaleString()}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              <button onClick={onAddCampaign}
                className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d7dce3] p-6 text-sm text-muted-foreground transition hover:border-[#ff8a00] hover:text-[#ff8a00]">
                <Plus className="h-5 w-5" />New campaign
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
              <p>No campaigns yet.</p>
              <Button onClick={onAddCampaign} className="bg-[#FF8A00] hover:bg-[#e77700] text-white">
                Create a campaign
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ADVERTISER: Bookings */}
      {isAdvertiser && advertiserBookings.length > 0 && (
        <div>
          <ListSection title="My bookings" count={advertiserBookings.length} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {advertiserBookings.map(b => {
              const campaign = campaigns.find(c => c.id === b.campaign_id);
              return (
                <Card key={b.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                  onClick={() => navigate(`/bookings/${b.id}`)}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Booking #{b.id}</p>
                        {campaign && <h3 className="font-semibold text-sm mt-0.5">{campaign.name}</h3>}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[b.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{b.start_date} – {b.end_date}</p>
                    {b.total_price != null && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Total: <span className="font-medium text-foreground">${b.total_price.toLocaleString()}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [bizModalOpen, setBizModalOpen] = useState(false);
  const [bizComplete, setBizComplete] = useState(() => loadWizardData().accountType !== null);
  const [bookingSpace, setBookingSpace] = useState<SpaceInfo | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { user } = useAuth();
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;

  const handleSelect = (id: number) => setSelectedId(prev => prev === id ? null : id);

  const { data: allSpaces = [] } = useQuery<BrowseSpace[]>({
    queryKey: ["spaces-search-all"],
    queryFn: () => api.get<BrowseSpace[]>("/api/spaces/search"),
  });

  const { data: mySpaces = [] } = useQuery<MySpace[]>({
    queryKey: ["spaces-mine"],
    queryFn: () => api.get<MySpace[]>("/api/spaces/mine"),
    enabled: isBroadcaster,
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => api.get<Campaign[]>("/api/campaigns"),
    enabled: isAdvertiser,
  });

  const { data: advertiserBookings = [] } = useQuery<AdvertiserBooking[]>({
    queryKey: ["bookings-advertiser"],
    queryFn: () => api.get<AdvertiserBooking[]>("/api/bookings"),
    enabled: isAdvertiser,
  });

  const { data: broadcasterBookings = [] } = useQuery<BroadcasterBooking[]>({
    queryKey: ["broadcaster-bookings"],
    queryFn: () => api.get<BroadcasterBooking[]>("/api/broadcaster/bookings/incoming"),
    enabled: isBroadcaster,
  });

  const { data: myOffers = [] } = useQuery<MyOffer[]>({
    queryKey: ["broadcaster-offers"],
    queryFn: () => api.get<MyOffer[]>("/api/broadcaster/offers"),
    enabled: isBroadcaster,
  });

  const checklistItems = [
    { title: "Complete sign up", completed: true },
    { title: "Tell us about your business", completed: bizComplete, onClick: bizComplete ? undefined : () => setBizModalOpen(true) },
    ...(isAdvertiser ? [{ title: "Create a campaign", completed: campaigns.length > 0, onClick: campaigns.length > 0 ? undefined : () => setCampaignModalOpen(true) }] : []),
    ...(isBroadcaster ? [{ title: "Add a broadcast space", completed: mySpaces.length > 0, onClick: mySpaces.length > 0 ? undefined : () => setSpaceModalOpen(true) }] : []),
  ];
  const allChecklistDone = checklistItems.every(i => i.completed);

  const toggle = (
    <button
      onClick={() => setViewMode(v => v === 'map' ? 'list' : 'map')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-accent transition-colors">
      {viewMode === 'map'
        ? <><List className="h-4 w-4" /><span>List</span></>
        : <><Map className="h-4 w-4" /><span>Map</span></>}
    </button>
  );

  return (
    <AppLayout
      activeNav="home"
      noPadding={viewMode === 'map'}
      rightSlot={toggle}
>

      {viewMode === 'map' ? (
        <MapView
          allSpaces={allSpaces}
          mySpaces={mySpaces}
          isAdvertiser={isAdvertiser}
          isBroadcaster={isBroadcaster}
          selectedId={selectedId}
          onSelect={handleSelect}
          onBook={setBookingSpace}
        />
      ) : (
        <ListView
          mySpaces={mySpaces}
          campaigns={campaigns}
          advertiserBookings={advertiserBookings}
          broadcasterBookings={broadcasterBookings}
          myOffers={myOffers}
          isBroadcaster={isBroadcaster}
          isAdvertiser={isAdvertiser}
          checklistItems={checklistItems}
          allChecklistDone={allChecklistDone}
          onAddSpace={() => setSpaceModalOpen(true)}
          onAddCampaign={() => setCampaignModalOpen(true)}
        />
      )}

      <CreateCampaignModal open={campaignModalOpen} onOpenChange={setCampaignModalOpen} />
      <CreateSpaceModal open={spaceModalOpen} onOpenChange={setSpaceModalOpen} />
      <BusinessProfileModal open={bizModalOpen} onOpenChange={setBizModalOpen} onComplete={() => setBizComplete(true)} />
      <CreateBookingModal open={!!bookingSpace} onOpenChange={open => { if (!open) setBookingSpace(null); }} space={bookingSpace} />
    </AppLayout>
  );
};

export default Dashboard;
