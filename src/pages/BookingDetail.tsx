import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueries, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, XCircle, CheckCircle, Plus, Upload, Film,
  Archive, RefreshCw, Trash2, MessageSquare, Star, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/components/AppLayout";
import { fmtMoney } from "@/components/campaigns/campaignData";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { spotsFor } from "@/lib/creative";
import { toast } from "sonner";

type SlotStatus = "pending" | "approved" | "rejected" | "dropped" | "rescheduled" | "cancelled";

/**
 * A booked slot as GET /api/bookings/:id returns it (creating and listing bookings return fewer
 * fields). `daily_playbacks_allocated` counts 15-second spots, and `slot_id` is the screen slot's id.
 */
type BookingSlot = {
  id: number;
  slot_id: number;
  daily_playbacks_allocated: number;
  reserved_price: number | string;
  status: SlotStatus;
};

const SLOT_STATUS: Record<SlotStatus, { label: string; cn: string }> = {
  pending:     { label: "Waiting for review", cn: "bg-yellow-100 text-yellow-700" },
  approved:    { label: "Approved", cn: "bg-green-100 text-green-700" },
  rejected:    { label: "Turned down", cn: "bg-red-100 text-red-700" },
  dropped:     { label: "Dropped", cn: "bg-muted text-muted-foreground" },
  rescheduled: { label: "Moved", cn: "bg-muted text-muted-foreground" },
  cancelled:   { label: "Cancelled", cn: "bg-muted text-muted-foreground" },
};

type Booking = {
  id: number;
  campaign_id: number;
  space_id: number;
  broadcaster_id: number;
  status: string;
  start_date: string;
  end_date: string;
  agreed_cpm: number | null;
  total_price: number | null;
  created_at: string;
  booking_slots?: BookingSlot[];
  /** A swapped-in ad is waiting for the broadcaster to approve it. */
  has_pending_creative_review?: boolean;
  /** Some slots were turned down and none are left to review: the advertiser drops or moves them. */
  needs_resolution?: boolean;
};

type Campaign = { id: number; name: string; advertiser_id: number };
type Space = { id: number; name: string; city: string | null; region: string | null; country: string | null };
type Screen = { id: number; space_id: number; label: string; is_active: boolean };
type Slot = { id: number; label: string; day_of_week: number; start_time: string; end_time: string };

type AssetStatus = "active" | "archived" | "pending_review" | "rejected";

type Asset = {
  id: number;
  booking_id: number;
  signed_url: string;
  mime_type: string;
  duration_seconds?: number | null;
  status: AssetStatus;
  set_at: string;
};

const ASSET_STATUS: Record<AssetStatus, { label: string; cn: string }> = {
  active:         { label: "Active", cn: "bg-green-100 text-green-700" },
  archived:       { label: "Archived", cn: "bg-muted text-muted-foreground" },
  pending_review: { label: "Waiting for review", cn: "bg-yellow-100 text-yellow-700" },
  rejected:       { label: "Rejected", cn: "bg-red-100 text-red-700" },
};

type Review = {
  id: number;
  reviewer_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  accepted:  "bg-green-100 text-green-700",
  active:    "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
  expired:   "bg-muted text-muted-foreground",
  completed: "bg-blue-100 text-blue-700",
  needs_resolution: "bg-orange-100 text-orange-700",
};

const DAY = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Earliest start for a booking: today's UTC date + 3 days (the backend's rule).
const minStartDate = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 3);
  return d.toISOString().split("T")[0];
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime";
const fmtTime = (t: string) => t.slice(0, 5); // "HH:MM:SS" → "HH:MM"

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground">{value}</p>
    </div>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="focus:outline-none">
          <Star
            className={`h-6 w-6 transition-colors ${
              n <= (hover || value) ? "fill-[#3a47c2] text-[#3a47c2]" : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}


/**
 * Who can do what to an ad:
 * - active: the advertiser can archive it
 * - archived: the advertiser can make it active again or delete it
 * - pending_review (a swap on an accepted booking): only the broadcaster acts, approving or rejecting it
 * - rejected: nobody; the old ad keeps playing, and the advertiser can upload another
 */
function AssetCard({
  asset,
  viewer,
  actioning,
  onArchive,
  onActivate,
  onDelete,
  onApprove,
  onReject,
}: {
  asset: Asset;
  viewer: "advertiser" | "broadcaster" | "other";
  actioning: boolean;
  onArchive: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isImage = asset.mime_type.startsWith("image/");
  const isVideo = asset.mime_type.startsWith("video/");
  const status = ASSET_STATUS[asset.status] ?? ASSET_STATUS.archived;
  const iconCn = "h-7 w-7";

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-opacity ${asset.status === "archived" || asset.status === "rejected" ? "opacity-50" : ""}`}>
      <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {isImage ? (
          <img src={asset.signed_url} alt="" className="w-full h-full object-cover" />
        ) : isVideo ? (
          <video src={asset.signed_url} className="w-full h-full" controls preload="metadata" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Film className="h-10 w-10" />
            <span className="text-xs uppercase tracking-wide">{asset.mime_type.split("/")[1]}</span>
          </div>
        )}
      </div>

      <div className="px-3 py-2.5 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cn}`}>{status.label}</span>

        {viewer === "advertiser" && asset.status === "active" && (
          <Button size="icon" variant="ghost" className={iconCn} disabled={actioning} onClick={onArchive} title="Archive">
            <Archive className="h-3.5 w-3.5" />
          </Button>
        )}
        {viewer === "advertiser" && asset.status === "archived" && (
          <div className="flex items-center gap-0.5">
            <Button size="icon" variant="ghost" className={iconCn} disabled={actioning} onClick={onActivate} title="Make active">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className={`${iconCn} text-red-500 hover:text-red-600 hover:bg-red-50`}
              disabled={actioning} onClick={onDelete} title="Delete permanently">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {viewer === "broadcaster" && asset.status === "pending_review" && (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" disabled={actioning} onClick={onReject}
              className="h-7 px-2.5 text-xs text-red-600 hover:text-red-700 hover:border-red-300">
              Reject
            </Button>
            <Button size="sm" disabled={actioning} onClick={onApprove}
              className="h-7 px-2.5 text-xs bg-[#3a47c2] text-white hover:bg-[#2f3a9e]">
              Approve
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

const BookingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cancelling, setCancelling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [assetActioning, setAssetActioning] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Broadcaster accept/reject state
  const [bookingActioning, setBookingActioning] = useState(false);
  const [pendingStatusAction, setPendingStatusAction] = useState<"accepted" | "rejected" | null>(null);

  // Per-slot review (broadcaster) and resolving turned-down slots (advertiser)
  const [slotActioning, setSlotActioning] = useState<number | null>(null);
  const [moving, setMoving] = useState<BookingSlot | null>(null);
  const [move, setMove] = useState({ slotId: "", start: "", end: "", plays: "" });

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const { data: booking, isLoading, isError } = useQuery<Booking>({
    queryKey: ["booking", Number(id)],
    queryFn: () => api.get<Booking>(`/api/bookings/${id}`),
    enabled: !!id,
  });

  const { data: campaign } = useQuery<Campaign>({
    queryKey: ["campaign", booking?.campaign_id],
    queryFn: () => api.get<Campaign>(`/api/campaigns/${booking!.campaign_id}`),
    enabled: !!booking,
  });

  const { data: space } = useQuery<Space>({
    queryKey: ["space", booking?.space_id],
    queryFn: () => api.get<Space>(`/api/spaces/${booking!.space_id}`),
    enabled: !!booking,
  });

  // booking_slots only carries slot_id — look up the label/time range from the space's
  // slots, which now live under screens: list screens, then fan out to their slots.
  const { data: screens = [] } = useQuery<Screen[]>({
    queryKey: ["space-screens", booking?.space_id],
    queryFn: () => api.get<Screen[]>(`/api/spaces/${booking!.space_id}/screens`),
    enabled: !!booking,
  });

  const slotQueries = useQueries({
    queries: screens.map(screen => ({
      queryKey: ["screen-slots", booking?.space_id, screen.id],
      queryFn: () => api.get<Slot[]>(`/api/spaces/${booking!.space_id}/screens/${screen.id}/slots`),
      enabled: !!booking,
    })),
  });
  const slots: Slot[] = slotQueries.flatMap(q => q.data ?? []);

  const { data: assets = [] } = useQuery<Asset[]>({
    queryKey: ["booking-assets", Number(id)],
    queryFn: () => api.get<Asset[]>(`/api/bookings/${id}/assets`),
    enabled: !!id && !!booking,
  });

  const { data: existingReviews = [] } = useQuery<Review[]>({
    queryKey: ["booking-reviews", Number(id)],
    queryFn: () => api.get<Review[]>(`/api/reviews?booking_id=${id}`),
    enabled: !!id && booking?.status === "completed",
  });

  // Swaps change the booking's has_pending_creative_review too, so both refresh together.
  const invalidateAssets = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["booking-assets", Number(id)] }),
    queryClient.invalidateQueries({ queryKey: ["booking", Number(id)] }),
  ]);

  const isBookingBroadcaster = !!user && !!booking && user.id === booking.broadcaster_id;
  const isBookingAdvertiser = !!user && !!campaign && user.id === campaign.advertiser_id;

  const myReview = existingReviews.find(r => r.reviewer_id === user?.id);
  const canReview = (booking?.status === "completed") &&
    (isBookingBroadcaster || isBookingAdvertiser) &&
    !myReview && !reviewSubmitted;

  const handleCancel = async () => {
    if (!booking) return;
    setCancelling(true);
    try {
      await api.patch(`/api/bookings/${booking.id}/status`, { status: "cancelled" });
      await queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  const handleStatusAction = async () => {
    if (!booking || !pendingStatusAction) return;
    setBookingActioning(true);
    try {
      await api.patch(`/api/bookings/${booking.id}/status`, { status: pendingStatusAction });
      await queryClient.invalidateQueries({ queryKey: ["booking", booking.id] });
      await queryClient.invalidateQueries({ queryKey: ["broadcaster-bookings"] });
      toast.success(pendingStatusAction === "accepted" ? "Booking accepted" : "Booking rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBookingActioning(false);
      setPendingStatusAction(null);
    }
  };

  const refreshBooking = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["booking", Number(id)] }),
    queryClient.invalidateQueries({ queryKey: ["bookings"] }),
    queryClient.invalidateQueries({ queryKey: ["broadcaster-bookings"] }),
  ]);

  const handleSlotReview = async (bs: BookingSlot, decision: "approved" | "rejected") => {
    if (!booking) return;
    setSlotActioning(bs.slot_id);
    try {
      const updated = await api.patch<Booking>(`/api/bookings/${booking.id}/slots/${bs.slot_id}/review`, { decision });
      await refreshBooking();
      toast.success(decision === "rejected"
        ? "Slot turned down. The advertiser can drop it or move it."
        : updated.status === "accepted" ? "Slot approved. Every slot is approved, so the booking is accepted." : "Slot approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSlotActioning(null);
    }
  };

  const handleDropSlot = async (bs: BookingSlot) => {
    if (!booking) return;
    setSlotActioning(bs.slot_id);
    try {
      await api.post(`/api/bookings/${booking.id}/slots/${bs.slot_id}/resolve`, { action: "drop" });
      await Promise.all([refreshBooking(), queryClient.invalidateQueries({ queryKey: ["wallet"] })]);
      toast.success(`Slot dropped. ${fmtMoney(Number(bs.reserved_price))} went back to your wallet.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't drop the slot");
    } finally {
      setSlotActioning(null);
    }
  };

  const handleMoveSlot = async () => {
    if (!booking || !moving) return;
    if (!move.slotId || !move.start || !move.end || !(Number(move.plays) >= 1)) {
      toast.error("Pick a slot, the dates and how many plays a day");
      return;
    }
    if (move.end < move.start) { toast.error("The end date has to be on or after the start date"); return; }
    setSlotActioning(moving.slot_id);
    try {
      const created = await api.post<Booking>(`/api/bookings/${booking.id}/slots/${moving.slot_id}/resolve`, {
        action: "reschedule",
        new_slot_id: Number(move.slotId),
        new_start_date: move.start,
        new_end_date: move.end,
        play_count: Number(move.plays),
      });
      await Promise.all([refreshBooking(), queryClient.invalidateQueries({ queryKey: ["wallet"] })]);
      setMoving(null);
      toast.success("Moved to a new booking", { description: "It reuses your ad, and the broadcaster reviews it like any request." });
      // Moving makes a new booking with its own id; this one keeps only what's left.
      navigate(`/bookings/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't move the slot");
    } finally {
      setSlotActioning(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !booking) return;
    e.target.value = "";
    const fd = new FormData();
    fd.append("asset", file);
    setUploading(true);
    try {
      const uploaded = await api.postMultipart<Asset>(`/api/bookings/${booking.id}/assets`, fd);
      await invalidateAssets();
      // On an accepted booking a new ad waits for the broadcaster; the current one keeps playing.
      if (uploaded.status === "pending_review") {
        toast.success("New ad sent for review", { description: "Your current ad keeps playing until the broadcaster approves it." });
      } else {
        toast.success("Ad uploaded");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleArchive = async (assetId: number) => {
    if (!booking) return;
    setAssetActioning(assetId);
    try {
      await api.patch(`/api/bookings/${booking.id}/assets/${assetId}/archive`);
      await invalidateAssets();
      toast.success("Asset archived");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setAssetActioning(null);
    }
  };

  const handleActivate = async (assetId: number) => {
    if (!booking) return;
    setAssetActioning(assetId);
    try {
      await api.patch(`/api/bookings/${booking.id}/assets/${assetId}/activate`);
      await invalidateAssets();
      toast.success("Asset activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setAssetActioning(null);
    }
  };

  const handleReview = async (assetId: number, decision: "approve" | "reject") => {
    if (!booking) return;
    setAssetActioning(assetId);
    try {
      await api.patch(`/api/bookings/${booking.id}/assets/${assetId}/${decision}`);
      await invalidateAssets();
      toast.success(decision === "approve" ? "New ad approved. It plays from now on." : "New ad rejected. The current ad keeps playing.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setAssetActioning(null);
    }
  };

  const handleDeleteAsset = async () => {
    if (!booking || !pendingDeleteId) return;
    try {
      await api.delete(`/api/bookings/${booking.id}/assets/${pendingDeleteId}`);
      await invalidateAssets();
      toast.success("Asset deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleReviewSubmit = async () => {
    if (!booking || !user || reviewRating === 0) return;
    setReviewSubmitting(true);
    try {
      const revieweeId = isBookingAdvertiser
        ? booking.broadcaster_id
        : campaign?.advertiser_id;
      const targetType = isBookingAdvertiser ? "broadcaster" : "advertiser";
      await api.post("/api/reviews/", {
        reviewee_id: revieweeId,
        booking_id: booking.id,
        target_type: targetType,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: ["booking-reviews", Number(id)] });
      toast.success("Review submitted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout activeNav="home">
        <div className="flex items-center justify-center py-40 text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  if (isError || !booking) {
    return (
      <AppLayout activeNav="home">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <p className="text-muted-foreground">Booking not found.</p>
        </div>
      </AppLayout>
    );
  }

  const canCancel = booking.status === "pending" && isBookingAdvertiser;
  const bookingSlots = booking.booking_slots ?? [];
  const turnedDown = bookingSlots.filter(bs => bs.status === "rejected");
  // A slot holds 15-second spots; with the ad's length known, show them as plays.
  const activeAsset = assets.find(a => a.status === "active");
  const spotsPerPlay = activeAsset ? spotsFor(activeAsset.duration_seconds ?? 15) : null;
  const playsOf = (bs: BookingSlot) => (spotsPerPlay ? Math.round(bs.daily_playbacks_allocated / spotsPerPlay) : null);
  const dailyLabel = (bs: BookingSlot) => {
    const plays = playsOf(bs);
    return plays != null ? `${plays.toLocaleString()} plays/day` : `${bs.daily_playbacks_allocated.toLocaleString()} spots/day`;
  };
  const slotName = (slotId: number) => {
    const slot = slots.find(s => s.id === slotId);
    return slot
      ? `${slot.label} · ${DAY[slot.day_of_week] ?? ""} ${fmtTime(slot.start_time)}–${fmtTime(slot.end_time)} UTC`
      : `Slot #${slotId}`;
  };
  const openMove = (bs: BookingSlot) => {
    const start = booking.start_date >= minStartDate() ? booking.start_date : minStartDate();
    setMove({ slotId: "", start, end: booking.end_date >= start ? booking.end_date : start, plays: String(playsOf(bs) ?? "") });
    setMoving(bs);
  };
  const badgeKey = booking.needs_resolution ? "needs_resolution" : booking.status;
  const pendingSwap = assets.some(a => a.status === "pending_review") || !!booking.has_pending_creative_review;
  // Swaps on an accepted booking go to the broadcaster for review, and have to match the current ad's length.
  const isLive = booking.status === "accepted" || booking.status === "active";
  const uploadBlockedTitle = pendingSwap ? "Wait until the broadcaster has reviewed the new ad" : undefined;
  const location = [space?.city, space?.region, space?.country].filter(Boolean).join(", ") || null;

  return (
    <AppLayout activeNav="home">
      <div className="max-w-3xl mx-auto space-y-8">
        <button onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">
                {space ? space.name : `Booking #${booking.id}`}
              </h1>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${booking.needs_resolution ? "" : "capitalize"} ${STATUS_BADGE[badgeKey] ?? "bg-muted text-muted-foreground"}`}>
                {booking.needs_resolution ? "Needs a decision" : booking.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Created {new Date(booking.created_at).toLocaleDateString()}
            </p>
          </div>

          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline" size="sm" disabled={cancelling}
                  className="text-red-600 hover:text-red-700 hover:border-red-300 shrink-0">
                  <XCircle className="h-4 w-4 mr-1.5" /> Cancel booking
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The broadcaster will be notified. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep booking</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}
                    className="bg-red-600 text-white hover:bg-red-700">
                    Cancel booking
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Booking details */}
        <div className="rounded-xl border bg-card p-6 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
          <Field label="Space" value={space?.name} />
          <Field label="Campaign" value={campaign?.name} />
          <Field label="Location" value={location} />
          <Field label="Start date" value={booking.start_date} />
          <Field label="End date" value={booking.end_date} />
          <Field label="Agreed CPM" value={booking.agreed_cpm != null ? `$${booking.agreed_cpm}` : null} />
          <Field label="Total price"
            value={booking.total_price != null ? `$${booking.total_price.toLocaleString()}` : null} />
          {bookingSlots.length > 0 && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time slots</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {bookingSlots.map(bs => {
                  const status = SLOT_STATUS[bs.status];
                  // Once everything is approved the per-slot state stops being news.
                  const showStatus = status && (booking.status === "pending" || bs.status !== "approved");
                  return (
                    <span key={bs.slot_id} className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs">
                      {slotName(bs.slot_id)} · {dailyLabel(bs)}
                      {showStatus && <span className={`rounded px-1.5 py-px font-medium ${status.cn}`}>{status.label}</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Broadcaster: review each slot when there's more than one */}
        {isBookingBroadcaster && booking.status === "pending" && !booking.needs_resolution && bookingSlots.length > 1 && (
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-semibold mb-1">Review each time slot</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Approve the slots you can run and turn down the ones you can't. The booking is accepted once every slot is approved.
            </p>
            <div className="divide-y rounded-lg border">
              {bookingSlots.map(bs => {
                const status = SLOT_STATUS[bs.status];
                return (
                  <div key={bs.slot_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{slotName(bs.slot_id)}</p>
                      <p className="text-xs text-muted-foreground">{dailyLabel(bs)} · {fmtMoney(Number(bs.reserved_price))}</p>
                    </div>
                    {bs.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" disabled={slotActioning !== null}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                          onClick={() => handleSlotReview(bs, "rejected")}>
                          Turn down
                        </Button>
                        <Button size="sm" disabled={slotActioning !== null}
                          className="bg-[#3a47c2] text-white hover:bg-[#2f3a9e]"
                          onClick={() => handleSlotReview(bs, "approved")}>
                          Approve
                        </Button>
                      </div>
                    ) : status && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.cn}`}>{status.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isBookingBroadcaster && booking.needs_resolution && (
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-semibold mb-1">Waiting for the advertiser</h2>
            <p className="text-sm text-muted-foreground">
              You turned down {turnedDown.length === 1 ? "a slot" : `${turnedDown.length} slots`}. The advertiser can drop or move{" "}
              {turnedDown.length === 1 ? "it" : "them"}, and anything left is dropped automatically after 48 hours.
            </p>
          </div>
        )}

        {/* Advertiser: deal with turned-down slots */}
        {isBookingAdvertiser && booking.needs_resolution && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
            <h2 className="text-sm font-semibold text-orange-900 mb-1">
              The broadcaster turned down {turnedDown.length === 1 ? "a time slot" : `${turnedDown.length} time slots`}
            </h2>
            <p className="text-sm text-orange-900/80 mb-4">
              Drop a slot to get its money back, or move it to another slot. Slots you leave are dropped automatically 48 hours
              after they were turned down.
            </p>
            <div className="divide-y divide-orange-200 rounded-lg border border-orange-200 bg-white">
              {turnedDown.map(bs => (
                <div key={bs.slot_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{slotName(bs.slot_id)}</p>
                    <p className="text-xs text-muted-foreground">{dailyLabel(bs)} · {fmtMoney(Number(bs.reserved_price))} held</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={slotActioning !== null} onClick={() => handleDropSlot(bs)}>
                      Drop
                    </Button>
                    <Button size="sm" disabled={slotActioning !== null} onClick={() => openMove(bs)}
                      className="bg-[#3a47c2] text-white hover:bg-[#2f3a9e]">
                      Move to another slot
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Broadcaster: accept / reject a single-slot booking whole */}
        {isBookingBroadcaster && booking.status === "pending" && !booking.needs_resolution && bookingSlots.length <= 1 && (
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-semibold mb-1">Action required</h2>
            <p className="text-sm text-muted-foreground mb-4">
              An advertiser has requested to book your space. Accept or reject this booking.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline" disabled={bookingActioning}
                className="text-red-600 hover:text-red-700 hover:border-red-300 gap-1.5"
                onClick={() => setPendingStatusAction("rejected")}>
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button
                disabled={bookingActioning}
                className="bg-[#3a47c2] text-white hover:bg-[#2f3a9e] gap-1.5"
                onClick={() => setPendingStatusAction("accepted")}>
                <CheckCircle className="h-4 w-4" /> Accept
              </Button>
            </div>
          </div>
        )}

        {/* Creative assets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Creative assets</h2>
            {!isBookingBroadcaster && (
              <div className="flex gap-2">
                <Button
                  size="sm" variant="outline"
                  className="gap-1.5"
                  disabled={uploading || pendingSwap}
                  title={uploadBlockedTitle}
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload file"}
                </Button>
                <Button
                  size="sm" variant="outline"
                  disabled
                  title="Available once messaging is enabled"
                  className="gap-1.5 opacity-40 cursor-not-allowed">
                  <MessageSquare className="h-4 w-4" />
                  Promote from message
                </Button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileChange}
          />

          {pendingSwap && (isBookingAdvertiser || isBookingBroadcaster) && (
            <div className="flex gap-2.5 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                {isBookingBroadcaster
                  ? "The advertiser sent a new ad. Approve it to start showing it, or reject it to keep the current one."
                  : "Your new ad is waiting for the broadcaster to approve it. The current ad keeps playing until then."}
              </p>
            </div>
          )}
          {isLive && isBookingAdvertiser && assets.length > 0 && !pendingSwap && (
            <p className="text-xs text-muted-foreground">
              A new ad has to be the same length as the current one, and the broadcaster approves it before it plays.
            </p>
          )}

          {assets.length === 0 ? (
            isBookingBroadcaster ? (
              <p className="text-sm text-muted-foreground py-4">
                No creative assets have been uploaded by the advertiser yet.
              </p>
            ) : (
              <button
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-[#d7dce3] py-16 flex flex-col items-center gap-3 text-muted-foreground hover:border-[#3a47c2] hover:text-[#3a47c2] transition-colors disabled:pointer-events-none">
                <Plus className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Upload your first creative</p>
                  <p className="text-sm mt-0.5">JPEG, PNG, WebP, GIF, MP4, MOV · max 100 MB</p>
                </div>
              </button>
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  viewer={isBookingBroadcaster ? "broadcaster" : isBookingAdvertiser ? "advertiser" : "other"}
                  actioning={assetActioning === asset.id}
                  onArchive={() => handleArchive(asset.id)}
                  onActivate={() => handleActivate(asset.id)}
                  onDelete={() => setPendingDeleteId(asset.id)}
                  onApprove={() => handleReview(asset.id, "approve")}
                  onReject={() => handleReview(asset.id, "reject")}
                />
              ))}
              {!isBookingBroadcaster && (
                <button
                  disabled={uploading || pendingSwap}
                  title={uploadBlockedTitle}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-[#d7dce3] aspect-video flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-[#3a47c2] hover:text-[#3a47c2] transition-colors disabled:pointer-events-none">
                  <Plus className="h-6 w-6" />
                  Add another
                </button>
              )}
            </div>
          )}
        </div>

        {/* Reviews */}
        {booking.status === "completed" && (isBookingBroadcaster || isBookingAdvertiser) && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review</h2>

            {myReview || reviewSubmitted ? (
              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n}
                      className={`h-5 w-5 ${n <= (myReview?.rating ?? reviewRating) ? "fill-[#3a47c2] text-[#3a47c2]" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                {myReview?.comment && (
                  <p className="text-sm text-muted-foreground italic">"{myReview.comment}"</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">Your review has been submitted.</p>
              </div>
            ) : canReview ? (
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                  {isBookingAdvertiser
                    ? "How was your experience with this broadcaster?"
                    : "How was your experience with this advertiser?"}
                </p>
                <StarRating value={reviewRating} onChange={setReviewRating} />
                <Textarea
                  placeholder="Share your experience (optional)…"
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={3}
                />
                <Button
                  disabled={reviewRating === 0 || reviewSubmitting}
                  onClick={handleReviewSubmit}
                  className="bg-[#3a47c2] text-white hover:bg-[#2f3a9e]">
                  {reviewSubmitting ? "Submitting…" : "Submit review"}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Delete asset confirmation */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={open => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
            <AlertDialogDescription>
              The file will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAsset}
              className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Advertiser: move a turned-down slot */}
      <Dialog open={!!moving} onOpenChange={open => { if (!open) setMoving(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move this slot</DialogTitle>
            <DialogDescription>
              {moving ? `${slotName(moving.slot_id)} was turned down. ` : ""}Moving it makes a new booking request with
              the same ad. The broadcaster reviews it like any request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>New time slot</Label>
              <Select value={move.slotId} onValueChange={v => setMove(m => ({ ...m, slotId: v }))}>
                <SelectTrigger className="h-10 rounded-lg border-[#d7dce3] text-sm"><SelectValue placeholder="Pick a slot" /></SelectTrigger>
                <SelectContent>
                  {slots.filter(s => s.id !== moving?.slot_id).map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{slotName(s.id)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="move-start">Start date</Label>
                <Input id="move-start" type="date" min={minStartDate()} value={move.start}
                  onChange={e => setMove(m => ({ ...m, start: e.target.value }))} className="h-10 rounded-lg border-[#d7dce3] text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="move-end">End date</Label>
                <Input id="move-end" type="date" min={move.start} value={move.end}
                  onChange={e => setMove(m => ({ ...m, end: e.target.value }))} className="h-10 rounded-lg border-[#d7dce3] text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="move-plays">Plays per day</Label>
              <Input id="move-plays" type="number" min={1} value={move.plays}
                onChange={e => setMove(m => ({ ...m, plays: e.target.value }))} className="h-10 w-32 rounded-lg border-[#d7dce3] text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setMoving(null)}>Cancel</Button>
            <Button disabled={slotActioning !== null} onClick={handleMoveSlot} className="bg-[#3a47c2] text-white hover:bg-[#2f3a9e]">
              {slotActioning !== null ? "Moving…" : "Move slot"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broadcaster: accept / reject confirmation */}
      <AlertDialog open={!!pendingStatusAction} onOpenChange={open => { if (!open) setPendingStatusAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatusAction === "accepted" ? "Accept this booking?" : "Reject this booking?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusAction === "accepted"
                ? "The advertiser will be notified that their booking has been accepted."
                : "The advertiser will be notified that their booking was not accepted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusAction}
              className={pendingStatusAction === "accepted"
                ? "bg-[#3a47c2] text-white hover:bg-[#2f3a9e]"
                : "bg-red-600 text-white hover:bg-red-700"}>
              {pendingStatusAction === "accepted" ? "Accept booking" : "Reject booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default BookingDetail;
