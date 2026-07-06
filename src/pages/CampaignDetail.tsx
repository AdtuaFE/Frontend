import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Trash2, CheckCircle, XCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/AppLayout";
import { EditCampaignModal, type CampaignFields } from "@/components/EditCampaignModal";
import { SubmitOfferModal } from "@/components/SubmitOfferModal";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Campaign = CampaignFields & {
  advertiser_id: number;
  status: string;
  created_at: string;
};

type OfferSpace = {
  space_id: number;
  proposed_price: number;
  space_name?: string;
};

type Offer = {
  id: number;
  campaign_id: number;
  broadcaster_id: number;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  message: string | null;
  created_at: string;
  spaces: OfferSpace[];
};

const STATUS_BADGE: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600",
  active:    "bg-green-100 text-green-700",
  paused:    "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  archived:  "bg-muted text-muted-foreground",
};

const OFFER_BADGE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  accepted:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
};

const NEXT_STATUSES: Record<string, { value: string; label: string; variant?: "default" | "outline" }[]> = {
  draft:     [{ value: "active",    label: "Activate",      variant: "default" }],
  active:    [{ value: "paused",    label: "Pause",         variant: "outline" },
              { value: "completed", label: "Mark complete", variant: "outline" },
              { value: "archived",  label: "Archive",       variant: "outline" }],
  paused:    [{ value: "active",    label: "Resume",        variant: "default" },
              { value: "archived",  label: "Archive",       variant: "outline" }],
  completed: [{ value: "archived",  label: "Archive",       variant: "outline" }],
  archived:  [],
};

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function OfferSpaceList({ spaces }: { spaces: OfferSpace[] }) {
  if (!spaces?.length) return null;
  const total = spaces.reduce((sum, s) => sum + s.proposed_price, 0);
  return (
    <div className="mt-3 space-y-1.5">
      {spaces.map((s, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <span className="text-foreground">{s.space_name ?? `Space #${s.space_id}`}</span>
          <span className="font-medium">${s.proposed_price.toLocaleString()}</span>
        </div>
      ))}
      {spaces.length > 1 && (
        <div className="flex items-center justify-between text-sm border-t pt-1.5 mt-1.5">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold">${total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [offerActioning, setOfferActioning] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{ id: number; type: "accept" | "reject" } | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null);

  const { data: campaign, isLoading, isError } = useQuery<Campaign>({
    queryKey: ["campaign", Number(id)],
    queryFn: () => api.get<Campaign>(`/api/campaigns/${id}`),
    enabled: !!id,
  });

  const { data: offers = [] } = useQuery<Offer[]>({
    queryKey: ["campaign-offers", Number(id)],
    queryFn: () => api.get<Offer[]>(`/api/campaigns/${id}/offers`),
    enabled: !!id && !!campaign,
  });

  const isOwner = !!user && !!campaign && user.id === campaign.advertiser_id;
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;
  const showAdvertiserView = isOwner;
  const showBroadcasterView = isBroadcaster && !isOwner;

  const invalidateOffers = () =>
    queryClient.invalidateQueries({ queryKey: ["campaign-offers", Number(id)] });

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return;
    setStatusLoading(true);
    try {
      await api.patch(`/api/campaigns/${campaign.id}/status`, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ["campaign", campaign.id] });
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success(`Campaign ${newStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;
    try {
      await api.delete(`/api/campaigns/${campaign.id}`);
      await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  // Advertiser: accept / reject incoming offer
  const handleOfferAction = async () => {
    if (!campaign || !pendingAction) return;
    const { id: offerId, type } = pendingAction;
    setOfferActioning(offerId);
    setPendingAction(null);
    try {
      await api.patch(`/api/campaigns/${campaign.id}/offers/${offerId}`, {
        status: type === "accept" ? "accepted" : "rejected",
      });
      await invalidateOffers();
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success(type === "accept" ? "Offer accepted — bookings created" : "Offer rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setOfferActioning(null);
    }
  };

  // Broadcaster: cancel own pending offer
  const handleCancelOffer = async () => {
    if (!campaign || !pendingCancelId) return;
    try {
      await api.patch(`/api/campaigns/${campaign.id}/offers/${pendingCancelId}`, {
        status: "cancelled",
      });
      await invalidateOffers();
      toast.success("Offer cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setPendingCancelId(null);
    }
  };

  if (isLoading) {
    return (
      <AppLayout activeNav="campaigns">
        <div className="flex items-center justify-center py-40 text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  if (isError || !campaign) {
    return (
      <AppLayout activeNav="campaigns">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <p className="text-muted-foreground">Campaign not found.</p>
        </div>
      </AppLayout>
    );
  }

  const nextStatuses = NEXT_STATUSES[campaign.status] ?? [];
  const pendingOffers = offers.filter(o => o.status === "pending");
  const pastOffers = offers.filter(o => o.status !== "pending");

  return (
    <AppLayout activeNav={showAdvertiserView ? "home" : "campaigns"}>
      <div className="max-w-3xl mx-auto space-y-8">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_BADGE[campaign.status] ?? STATUS_BADGE.draft}`}>
                {campaign.status}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                campaign.visibility === "public"
                  ? "bg-orange-100 text-orange-700"
                  : "bg-muted text-muted-foreground"
              }`}>
                {campaign.visibility ?? "private"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {new Date(campaign.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {showBroadcasterView && (
              <Button
                size="sm"
                className="bg-[#ff8a00] text-white hover:bg-[#e77700] gap-1.5"
                onClick={() => setOfferModalOpen(true)}>
                <Send className="h-4 w-4" /> Submit offer
              </Button>
            )}
            {showAdvertiserView && (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4 mr-1.5" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm"
                      className="text-red-600 hover:text-red-700 hover:border-red-300">
                      <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete <strong>{campaign.name}</strong>. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}
                        className="bg-red-600 text-white hover:bg-red-700">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* Campaign details */}
        <div className="rounded-xl border bg-card p-6 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
          <Field label="Objective" value={campaign.objective} />
          <Field label="Total budget"
            value={campaign.total_budget != null ? `$${campaign.total_budget.toLocaleString()}` : null} />
          <Field label="Budget period" value={campaign.budget_period} />
          <Field label="Start date" value={campaign.start_date} />
          <Field label="End date" value={campaign.end_date} />
          <Field label="Target location" value={campaign.location} />
          <Field label="Ad type" value={campaign.ad_type} />
        </div>

        {/* Advertiser: status lifecycle controls */}
        {showAdvertiserView && nextStatuses.length > 0 && (
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-semibold mb-4">Campaign lifecycle</h2>
            <div className="flex flex-wrap gap-3">
              {nextStatuses.map(s => (
                <Button
                  key={s.value}
                  variant={s.variant ?? "outline"}
                  size="sm"
                  disabled={statusLoading}
                  onClick={() => handleStatusChange(s.value)}
                  className={s.variant === "default" ? "bg-[#ff8a00] text-white hover:bg-[#e77700]" : ""}>
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Advertiser: received offers from broadcasters */}
        {showAdvertiserView && offers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Offers received
              {pendingOffers.length > 0 && (
                <span className="ml-2 rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-medium">
                  {pendingOffers.length} pending
                </span>
              )}
            </h2>
            <div className="space-y-3">
              {[...pendingOffers, ...pastOffers].map(offer => (
                <div key={offer.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${OFFER_BADGE[offer.status] ?? "bg-muted text-muted-foreground"}`}>
                        {offer.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(offer.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {offer.status === "pending" && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" disabled={offerActioning === offer.id}
                          className="text-red-600 hover:text-red-700 hover:border-red-300 gap-1.5"
                          onClick={() => setPendingAction({ id: offer.id, type: "reject" })}>
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                        <Button size="sm" disabled={offerActioning === offer.id}
                          className="bg-[#ff8a00] text-white hover:bg-[#e77700] gap-1.5"
                          onClick={() => setPendingAction({ id: offer.id, type: "accept" })}>
                          <CheckCircle className="h-3.5 w-3.5" /> Accept
                        </Button>
                      </div>
                    )}
                  </div>
                  {offer.message && (
                    <p className="mt-3 text-sm text-muted-foreground italic">"{offer.message}"</p>
                  )}
                  <OfferSpaceList spaces={offer.spaces} />
                </div>
              ))}
            </div>
          </div>
        )}

        {showAdvertiserView && offers.length === 0 && campaign.visibility === "public" && (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            No offers yet. Broadcasters can discover this campaign and propose spaces.
          </div>
        )}

        {/* Broadcaster: own submitted offers */}
        {showBroadcasterView && offers.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your offers</h2>
            <div className="space-y-3">
              {offers.map(offer => (
                <div key={offer.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${OFFER_BADGE[offer.status] ?? "bg-muted text-muted-foreground"}`}>
                        {offer.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(offer.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {offer.status === "pending" && (
                      <Button size="sm" variant="outline"
                        className="text-red-600 hover:text-red-700 hover:border-red-300 shrink-0"
                        onClick={() => setPendingCancelId(offer.id)}>
                        Cancel offer
                      </Button>
                    )}
                  </div>
                  {offer.message && (
                    <p className="mt-3 text-sm text-muted-foreground italic">"{offer.message}"</p>
                  )}
                  <OfferSpaceList spaces={offer.spaces} />
                </div>
              ))}
            </div>
          </div>
        )}

        {showBroadcasterView && offers.length === 0 && (
          <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
            You haven't submitted an offer for this campaign yet.
          </div>
        )}
      </div>

      {showAdvertiserView && (
        <EditCampaignModal open={editOpen} onOpenChange={setEditOpen} campaign={campaign} />
      )}

      {showBroadcasterView && (
        <SubmitOfferModal
          open={offerModalOpen}
          onOpenChange={setOfferModalOpen}
          campaignId={campaign.id}
          campaignBudget={campaign.total_budget}
          onSuccess={invalidateOffers}
        />
      )}

      {/* Advertiser: accept / reject confirmation */}
      <AlertDialog open={!!pendingAction} onOpenChange={open => { if (!open) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "accept" ? "Accept this offer?" : "Reject this offer?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "accept"
                ? "Accepting will automatically create a booking for each proposed space."
                : "The broadcaster will be notified that their offer was not accepted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleOfferAction}
              className={pendingAction?.type === "accept"
                ? "bg-[#ff8a00] text-white hover:bg-[#e77700]"
                : "bg-red-600 text-white hover:bg-red-700"}>
              {pendingAction?.type === "accept" ? "Accept & create bookings" : "Reject offer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Broadcaster: cancel offer confirmation */}
      <AlertDialog open={!!pendingCancelId} onOpenChange={open => { if (!open) setPendingCancelId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this offer?</AlertDialogTitle>
            <AlertDialogDescription>
              The advertiser will no longer be able to accept it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep offer</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelOffer}
              className="bg-red-600 text-white hover:bg-red-700">
              Cancel offer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default CampaignDetail;
