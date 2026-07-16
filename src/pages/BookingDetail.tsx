import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, XCircle, CheckCircle, Plus, Upload, Film,
  Archive, RefreshCw, Trash2, MessageSquare, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

type BookingSlot = {
  slot_id: number;
  daily_playbacks_allocated: number;
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
};

type Campaign = { id: number; name: string; advertiser_id: number };
type Space = { id: number; name: string; city: string | null; country: string | null };

type Asset = {
  id: number;
  booking_id: number;
  signed_url: string;
  mime_type: string;
  status: "active" | "archived";
  set_at: string;
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
  rejected:  "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-blue-100 text-blue-700",
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime";

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
              n <= (hover || value) ? "fill-[#ff8a00] text-[#ff8a00]" : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}


function AssetCard({
  asset,
  readOnly = false,
  actioning,
  onArchive,
  onActivate,
  onDelete,
}: {
  asset: Asset;
  readOnly?: boolean;
  actioning: boolean;
  onArchive: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const isImage = asset.mime_type.startsWith("image/");
  const isVideo = asset.mime_type.startsWith("video/");

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-opacity ${asset.status === "archived" ? "opacity-50" : ""}`}>
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
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
          asset.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
        }`}>
          {asset.status}
        </span>

        {!readOnly && (
          <div className="flex items-center gap-0.5">
            {asset.status === "active" ? (
              <Button
                size="icon" variant="ghost" className="h-7 w-7"
                disabled={actioning} onClick={onArchive} title="Archive">
                <Archive className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="icon" variant="ghost" className="h-7 w-7"
                disabled={actioning} onClick={onActivate} title="Activate">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="icon" variant="ghost"
              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
              disabled={actioning} onClick={onDelete} title="Delete permanently">
              <Trash2 className="h-3.5 w-3.5" />
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

  const invalidateAssets = () =>
    queryClient.invalidateQueries({ queryKey: ["booking-assets", Number(id)] });

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !booking) return;
    e.target.value = "";
    const fd = new FormData();
    fd.append("asset", file);
    setUploading(true);
    try {
      await api.postMultipart(`/api/bookings/${booking.id}/assets`, fd);
      await invalidateAssets();
      toast.success("Asset uploaded");
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
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </button>
          <p className="text-muted-foreground">Booking not found.</p>
        </div>
      </AppLayout>
    );
  }

  const canCancel = booking.status === "pending" && isBookingAdvertiser;
  const location = [space?.city, space?.country].filter(Boolean).join(", ") || null;

  return (
    <AppLayout activeNav="home">
      <div className="max-w-3xl mx-auto space-y-8">
        <button onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">
                {space ? space.name : `Booking #${booking.id}`}
              </h1>
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_BADGE[booking.status] ?? "bg-muted text-muted-foreground"}`}>
                {booking.status}
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
          {booking.booking_slots && booking.booking_slots.length > 0 && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Time slots</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {booking.booking_slots.map(bs => (
                  <span key={bs.slot_id} className="rounded-md bg-muted px-2.5 py-1 text-xs">
                    Slot #{bs.slot_id} · {bs.daily_playbacks_allocated.toLocaleString()} plays/day
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Broadcaster: accept / reject */}
        {isBookingBroadcaster && booking.status === "pending" && (
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
                className="bg-[#ff8a00] text-white hover:bg-[#e77700] gap-1.5"
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
                  disabled={uploading}
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

          {assets.length === 0 ? (
            isBookingBroadcaster ? (
              <p className="text-sm text-muted-foreground py-4">
                No creative assets have been uploaded by the advertiser yet.
              </p>
            ) : (
              <button
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-[#d7dce3] py-16 flex flex-col items-center gap-3 text-muted-foreground hover:border-[#ff8a00] hover:text-[#ff8a00] transition-colors disabled:pointer-events-none">
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
                  readOnly={isBookingBroadcaster}
                  actioning={assetActioning === asset.id}
                  onArchive={() => handleArchive(asset.id)}
                  onActivate={() => handleActivate(asset.id)}
                  onDelete={() => setPendingDeleteId(asset.id)}
                />
              ))}
              {!isBookingBroadcaster && (
                <button
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-[#d7dce3] aspect-video flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-[#ff8a00] hover:text-[#ff8a00] transition-colors disabled:pointer-events-none">
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
                      className={`h-5 w-5 ${n <= (myReview?.rating ?? reviewRating) ? "fill-[#ff8a00] text-[#ff8a00]" : "text-muted-foreground"}`}
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
                  className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
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
                ? "bg-[#ff8a00] text-white hover:bg-[#e77700]"
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
