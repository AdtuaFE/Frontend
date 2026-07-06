import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleCheck, Circle, Plus } from "lucide-react";
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

type Campaign = {
  id: number;
  name: string;
  objective: string | null;
  status: string;
  total_budget: number | null;
  start_date: string | null;
  end_date: string | null;
};

type Space = {
  id: number;
  name: string;
  space_type: string;
  city: string | null;
  country: string | null;
  cpm: number | null;
  is_active: boolean;
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

type BroadcasterBooking = {
  id: number;
  campaign_id: number;
  space_id: number;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number | null;
  space_name?: string;
  campaign_name?: string;
};

type OfferSpace = {
  space_id: number;
  proposed_price: number;
  space_name?: string;
};

type MyOffer = {
  id: number;
  campaign_id: number;
  campaign_name?: string;
  status: string;
  created_at: string;
  spaces: OfferSpace[];
};


const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  accepted:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-blue-100 text-blue-700",
};

const OFFER_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  accepted:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
};

function SectionHeading({ title, role }: { title: string; role?: "advertiser" | "broadcaster" }) {
  return (
    <div className="flex items-baseline gap-3 mb-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      {role && (
        <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${
          role === "advertiser" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
        }`}>
          {role}
        </span>
      )}
    </div>
  );
}

const Dashboard = () => {
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [bizModalOpen, setBizModalOpen] = useState(false);
  const [bizComplete, setBizComplete] = useState(() => loadWizardData().accountType !== null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;
  const isDualRole = isAdvertiser && isBroadcaster;

  // ── Advertiser data ───────────────────────────────────────────────────────
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

  // ── Broadcaster data ──────────────────────────────────────────────────────
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

  const { data: spaces = [] } = useQuery<Space[]>({
    queryKey: ["spaces-mine"],
    queryFn: () => api.get<Space[]>("/api/spaces/mine"),
    enabled: isBroadcaster,
  });

  const checklistItems = [
    {
      title: "Complete sign up",
      subtitle: "Account created",
      completed: true,
      onClick: undefined,
    },
    {
      title: "Tell us about your business",
      subtitle: bizComplete ? "Done" : "Helps us personalise your experience",
      completed: bizComplete,
      onClick: bizComplete ? undefined : () => setBizModalOpen(true),
    },
    ...(isAdvertiser ? [{
      title: "Create a campaign",
      subtitle: campaigns.length > 0
        ? `${campaigns.length} campaign${campaigns.length > 1 ? "s" : ""}`
        : "Launch your first campaign",
      completed: campaigns.length > 0,
      onClick: campaigns.length > 0 ? undefined : () => setCampaignModalOpen(true),
    }] : []),
    ...(isBroadcaster ? [{
      title: "Add a broadcast space",
      subtitle: spaces.length > 0
        ? `${spaces.length} space${spaces.length > 1 ? "s" : ""}`
        : "List your first space",
      completed: spaces.length > 0,
      onClick: spaces.length > 0 ? undefined : () => setSpaceModalOpen(true),
    }] : []),
  ];

  const allChecklistDone = checklistItems.every(item => item.completed);

  return (
    <AppLayout activeNav="home">
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Onboarding checklist — hidden once all items complete */}
        {!allChecklistDone && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Onboarding checklist</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {checklistItems.map((item, index) => (
                <Card
                  key={index}
                  className={`relative transition-colors ${item.onClick ? "cursor-pointer hover:border-[#ff8a00]" : ""}`}
                  onClick={item.onClick}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {item.completed
                          ? <CircleCheck className="h-6 w-6 text-green-600" />
                          : <Circle className="h-6 w-6 text-muted-foreground" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── ADVERTISER: Bookings ─────────────────────────────────────────── */}
        {isAdvertiser && (
          <div>
            <SectionHeading title="My bookings" role={isDualRole ? "advertiser" : undefined} />
            {advertiserBookings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {advertiserBookings.map(b => {
                  const campaign = campaigns.find(c => c.id === b.campaign_id);
                  return (
                    <Card key={b.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                      onClick={() => navigate(`/bookings/${b.id}`)}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Booking #{b.id}</p>
                            {campaign && <h3 className="font-semibold mt-0.5">{campaign.name}</h3>}
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[b.status] ?? "bg-muted text-muted-foreground"}`}>
                            {b.status}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {b.start_date} – {b.end_date}
                        </p>
                        {b.total_price != null && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Total: <span className="font-medium text-foreground">${b.total_price.toLocaleString()}</span>
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No bookings yet. Browse spaces to book your first ad slot.</p>
              </div>
            )}
          </div>
        )}

        {/* ── ADVERTISER: Campaigns ────────────────────────────────────────── */}
        {isAdvertiser && (
          <div>
            <SectionHeading title="Campaigns" role={isDualRole ? "advertiser" : undefined} />
            {campaigns.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map(c => (
                  <Card key={c.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                    onClick={() => navigate(`/campaigns/${c.id}`)}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{c.name}</h3>
                          {c.objective && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{c.objective}</p>
                          )}
                        </div>
                        <span className="ml-2 shrink-0 rounded-full bg-[#FFE5CC] px-2 py-0.5 text-xs font-medium capitalize text-[#9a4f00]">
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
                <button
                  onClick={() => setCampaignModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d7dce3] p-6 text-sm text-muted-foreground transition hover:border-[#ff8a00] hover:text-[#ff8a00]">
                  <Plus className="h-5 w-5" />
                  New campaign
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-muted-foreground text-lg mb-6">No campaigns yet.</p>
                <Button onClick={() => setCampaignModalOpen(true)}
                  className="h-12 px-8 text-base font-medium rounded-lg bg-[#FF8A00] hover:bg-[#e77700] text-white">
                  Create a campaign
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── BROADCASTER: Incoming bookings ───────────────────────────────── */}
        {isBroadcaster && (
          <div>
            <SectionHeading title="Incoming bookings" role={isDualRole ? "broadcaster" : undefined} />
            {broadcasterBookings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {broadcasterBookings.map(b => (
                  <Card key={b.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                    onClick={() => navigate(`/bookings/${b.id}`)}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Booking #{b.id}</p>
                          <h3 className="font-semibold mt-0.5">
                            {b.space_name ?? `Space #${b.space_id}`}
                          </h3>
                          {b.campaign_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">{b.campaign_name}</p>
                          )}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[b.status] ?? "bg-muted text-muted-foreground"}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {b.start_date} – {b.end_date}
                      </p>
                      {b.total_price != null && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Total: <span className="font-medium text-foreground">${b.total_price.toLocaleString()}</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No incoming bookings yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── BROADCASTER: My offers ───────────────────────────────────────── */}
        {isBroadcaster && (
          <div>
            <SectionHeading title="My offers" role={isDualRole ? "broadcaster" : undefined} />
            {myOffers.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myOffers.map(o => {
                  const totalProposed = o.spaces?.reduce((sum, s) => sum + s.proposed_price, 0) ?? 0;
                  return (
                    <Card key={o.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                      onClick={() => navigate(`/campaigns/${o.campaign_id}`)}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Offer #{o.id}</p>
                            <h3 className="font-semibold mt-0.5 truncate">
                              {o.campaign_name ?? `Campaign #${o.campaign_id}`}
                            </h3>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${OFFER_COLORS[o.status] ?? "bg-muted text-muted-foreground"}`}>
                            {o.status}
                          </span>
                        </div>
                        {o.spaces?.length > 0 && (
                          <p className="mt-3 text-sm text-muted-foreground">
                            {o.spaces.length} space{o.spaces.length > 1 ? "s" : ""}
                            {" · "}
                            <span className="font-medium text-foreground">${totalProposed.toLocaleString()}</span>
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p>No offers submitted yet. Browse campaigns to find opportunities.</p>
              </div>
            )}
          </div>
        )}

        {/* ── BROADCASTER: Spaces ──────────────────────────────────────────── */}
        {isBroadcaster && (
          <div>
            <SectionHeading title="My spaces" role={isDualRole ? "broadcaster" : undefined} />
            {spaces.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {spaces.map(s => (
                  <Card key={s.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                    onClick={() => navigate(`/spaces/${s.id}`)}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{s.name}</h3>
                          <p className="mt-1 text-sm text-muted-foreground capitalize">
                            {s.space_type.replace(/_/g, " ")}
                            {s.city ? ` · ${s.city}` : ""}
                            {s.country ? `, ${s.country}` : ""}
                          </p>
                        </div>
                        <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                        }`}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {s.cpm != null && (
                        <p className="mt-3 text-sm text-muted-foreground">
                          CPM: <span className="font-medium text-foreground">${s.cpm}</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
                <button
                  onClick={() => setSpaceModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d7dce3] p-6 text-sm text-muted-foreground transition hover:border-[#ff8a00] hover:text-[#ff8a00]">
                  <Plus className="h-5 w-5" />
                  New space
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-muted-foreground text-lg mb-6">No spaces yet.</p>
                <Button onClick={() => setSpaceModalOpen(true)}
                  className="h-12 px-8 text-base font-medium rounded-lg bg-[#FF8A00] hover:bg-[#e77700] text-white">
                  Add a space
                </Button>
              </div>
            )}
          </div>
        )}

      </div>

      <CreateCampaignModal open={campaignModalOpen} onOpenChange={setCampaignModalOpen} />
      <CreateSpaceModal open={spaceModalOpen} onOpenChange={setSpaceModalOpen} />
      <BusinessProfileModal
        open={bizModalOpen}
        onOpenChange={setBizModalOpen}
        onComplete={() => setBizComplete(true)}
      />
    </AppLayout>
  );
};

export default Dashboard;
