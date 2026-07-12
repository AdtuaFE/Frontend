import { useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft, Edit2, Trash2, Upload, Star, Plus, ImageIcon, Cpu, Pencil, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AppLayout } from "@/components/AppLayout";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { EditSpaceModal } from "@/components/EditSpaceModal";
import { CreateBookingModal, type SpaceInfo } from "@/components/CreateBookingModal";

// ── Types ─────────────────────────────────────────────────────────────────────

type Space = {
  id: number;
  broadcaster_id: number;
  name: string;
  description: string | null;
  space_type: string;
  display_type: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;
  address_line1: string | null;
  address_line2: string | null;
  geo_lat: number | null;
  geo_lng: number | null;
  width_px: number | null;
  height_px: number | null;
  size_label: string | null;
  cpm: number;
  est_daily_impressions: number | null;
  interests: string[] | null;
  is_active: boolean;
  created_at: string;
};

type SpaceImage = {
  id: number;
  space_id: number;
  url: string;
  mime_type: string;
  is_primary: boolean;
  created_at: string;
};

type Slot = {
  id: number;
  label: string;
  start_time: string;
  end_time: string;
  est_impressions_per_playback: number;
  daily_capacity_playbacks: number;
  price_multiplier: number;
};

type UsageBooking = {
  booking_id: number;
  daily_playbacks_allocated: number;
  used_today: number;
  remaining_today: number;
  pct_used: number;
};

type UsageSlot = {
  slot_id: number;
  slot_name: string;
  daily_capacity_playbacks: number;
  total_allocated_playbacks: number;
  total_used_playbacks: number;
  pct_capacity_sold: number;
  bookings?: UsageBooking[];
};

type SpaceUsage = {
  date?: string;
  slots: UsageSlot[];
};

type Device = {
  device_id: string;
  space_id: number;
  status: "active" | "inactive";
  paired_at: string | null;
  last_seen_at: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (s: string | null | undefined) =>
  !s ? "" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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

// ── Component ─────────────────────────────────────────────────────────────────

const SpaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Image state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteSpaceOpen, setDeleteSpaceOpen] = useState(false);
  const [pendingDeleteImageId, setPendingDeleteImageId] = useState<number | null>(null);
  const [bookingSpace, setBookingSpace] = useState<SpaceInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageActioning, setImageActioning] = useState<number | null>(null);
  const [deletingSpace, setDeletingSpace] = useState(false);

  // Slot edit state
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [slotEditForm, setSlotEditForm] = useState({
    est_impressions_per_playback: "",
    daily_capacity_playbacks: "",
    price_multiplier: "",
  });
  const [slotSaving, setSlotSaving] = useState(false);

  // Device state
  const [pairCode, setPairCode] = useState("");
  const [pairing, setPairing] = useState(false);
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: space, isLoading, isError } = useQuery<Space>({
    queryKey: ["space", Number(id)],
    queryFn: () => api.get<Space>(`/api/spaces/${id}`),
    enabled: !!id,
  });

  const { data: images = [] } = useQuery<SpaceImage[]>({
    queryKey: ["space-images", Number(id)],
    queryFn: () => api.get<SpaceImage[]>(`/api/spaces/${id}/images`),
    enabled: !!id && !!space,
  });

  const { data: slots = [] } = useQuery<Slot[]>({
    queryKey: ["space-slots", Number(id)],
    queryFn: () => api.get<Slot[]>(`/api/spaces/${id}/slots`),
    enabled: !!id && !!space,
  });

  const isOwner = !!user && !!space && user.id === space.broadcaster_id;
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;

  const { data: usage } = useQuery<SpaceUsage>({
    queryKey: ["space-usage", Number(id)],
    queryFn: () => api.get<SpaceUsage>(`/api/spaces/${id}/usage`),
    enabled: !!id && !!space && isOwner,
    refetchInterval: 60_000,
  });

  const { data: devices = [] } = useQuery<Device[]>({
    queryKey: ["space-devices", Number(id)],
    queryFn: () => api.get<Device[]>(`/api/spaces/${id}/devices`),
    enabled: !!id && !!space && isOwner,
  });

  const primaryImage = images.find(i => i.is_primary) ?? images[0] ?? null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const invalidateImages = () =>
    queryClient.invalidateQueries({ queryKey: ["space-images", Number(id)] });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !space) return;
    e.target.value = "";
    if (images.length >= 10) { toast.error("Maximum 10 images per space"); return; }
    const fd = new FormData();
    fd.append("image", file);
    setUploading(true);
    try {
      await api.postMultipart(`/api/spaces/${space.id}/images`, fd);
      await invalidateImages();
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (imageId: number) => {
    if (!space) return;
    setImageActioning(imageId);
    try {
      await api.patch(`/api/spaces/${space.id}/images/${imageId}/primary`);
      await invalidateImages();
      toast.success("Primary photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setImageActioning(null);
    }
  };

  const handleDeleteImage = async () => {
    if (!space || !pendingDeleteImageId) return;
    try {
      await api.delete(`/api/spaces/${space.id}/images/${pendingDeleteImageId}`);
      await invalidateImages();
      toast.success("Photo deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setPendingDeleteImageId(null);
    }
  };

  const handleDeleteSpace = async () => {
    if (!space) return;
    setDeletingSpace(true);
    try {
      await api.delete(`/api/spaces/${space.id}`);
      await queryClient.invalidateQueries({ queryKey: ["spaces-mine"] });
      toast.success("Space deleted");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeletingSpace(false);
    }
  };

  const handleSlotEdit = (slot: Slot) => {
    setEditingSlotId(slot.id);
    setSlotEditForm({
      est_impressions_per_playback: String(slot.est_impressions_per_playback),
      daily_capacity_playbacks: String(slot.daily_capacity_playbacks),
      price_multiplier: String(slot.price_multiplier),
    });
  };

  const handleSlotSave = async () => {
    if (!space || !editingSlotId) return;
    setSlotSaving(true);
    try {
      await api.patch(`/api/spaces/${space.id}/slots/${editingSlotId}`, {
        est_impressions_per_playback: Number(slotEditForm.est_impressions_per_playback),
        daily_capacity_playbacks: Number(slotEditForm.daily_capacity_playbacks),
        price_multiplier: Number(slotEditForm.price_multiplier),
      });
      await queryClient.invalidateQueries({ queryKey: ["space-slots", space.id] });
      setEditingSlotId(null);
      toast.success("Slot updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSlotSaving(false);
    }
  };

  const handlePairDevice = async () => {
    if (!space || pairCode.length !== 6) return;
    setPairing(true);
    try {
      await api.post("/api/player/pair", { pairing_code: Number(pairCode), space_id: space.id });
      await queryClient.invalidateQueries({ queryKey: ["space-devices", space.id] });
      setPairCode("");
      toast.success("Device paired successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pairing failed — check the code and try again");
    } finally {
      setPairing(false);
    }
  };

  const handleDeactivateDevice = async () => {
    if (!space || !pendingDeactivateId) return;
    setDeactivating(true);
    try {
      await api.delete(`/api/player/${pendingDeactivateId}`);
      await queryClient.invalidateQueries({ queryKey: ["space-devices", space.id] });
      toast.success("Device deactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deactivation failed");
    } finally {
      setDeactivating(false);
      setPendingDeactivateId(null);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <AppLayout activeNav="browse">
        <div className="flex items-center justify-center py-40 text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }

  if (isError || !space) {
    return (
      <AppLayout activeNav="browse">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <p className="text-muted-foreground">Space not found.</p>
        </div>
      </AppLayout>
    );
  }

  const address = [
    space.address_line1, space.address_line2, space.city,
    space.region, space.postal_code, space.country,
  ].filter(Boolean).join(", ");

  const dimensions = space.width_px && space.height_px
    ? `${space.width_px} × ${space.height_px} px${space.size_label ? ` (${space.size_label})` : ""}`
    : space.size_label ?? null;

  const hasUsageData = usage?.slots && usage.slots.some(s => s.total_allocated_playbacks > 0);

  return (
    <AppLayout activeNav="browse">
      <div className="max-w-4xl mx-auto space-y-8">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* Hero image */}
        <div className="aspect-[21/9] rounded-2xl overflow-hidden bg-muted">
          {primaryImage ? (
            <img src={primaryImage.url} alt={space.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <ImageIcon className="h-12 w-12" />
              <span className="text-sm">No photos yet</span>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{space.name}</h1>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                space.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
              }`}>
                {space.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[fmt(space.space_type), space.city, space.country].filter(Boolean).join(" · ")}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdvertiser && !isOwner && (
              <Button
                size="sm"
                className="bg-[#ff8a00] text-white hover:bg-[#e77700]"
                onClick={() => setBookingSpace({
                  id: space.id, name: space.name, cpm: space.cpm,
                  est_daily_impressions: space.est_daily_impressions,
                })}>
                Book space
              </Button>
            )}
            {isOwner && (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5">
                  <Edit2 className="h-4 w-4" /> Edit
                </Button>
                <Button size="sm" variant="outline"
                  className="gap-1.5 text-red-600 hover:text-red-700 hover:border-red-300"
                  onClick={() => setDeleteSpaceOpen(true)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="rounded-xl border bg-card p-6 space-y-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
            <Field label="Space type" value={fmt(space.space_type)} />
            {space.display_type && <Field label="Display type" value={fmt(space.display_type)} />}
            {address && <Field label="Address" value={address} />}
            <Field label="CPM" value={`$${space.cpm}`} />
            {space.est_daily_impressions != null && (
              <Field label="Est. daily impressions" value={space.est_daily_impressions.toLocaleString()} />
            )}
            {dimensions && <Field label="Dimensions" value={dimensions} />}
          </div>

          {space.description && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{space.description}</p>
            </div>
          )}

          {space.interests && space.interests.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">
                {space.interests.map(tag => (
                  <span key={tag} className="rounded-full bg-[#fff3e0] px-3 py-1 text-xs font-medium text-[#9a4f00]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Photos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Photos</h2>
            {isOwner && (
              <Button size="sm" variant="outline" className="gap-1.5"
                disabled={uploading || images.length >= 10}
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading…" : "Upload photo"}
              </Button>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
            className="hidden" onChange={handleUpload} />

          {images.length === 0 ? (
            isOwner ? (
              <button disabled={uploading} onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-[#d7dce3] py-16 flex flex-col items-center gap-3 text-muted-foreground hover:border-[#ff8a00] hover:text-[#ff8a00] transition-colors disabled:pointer-events-none">
                <Plus className="h-8 w-8" />
                <div className="text-center">
                  <p className="font-medium">Upload the first photo</p>
                  <p className="text-sm mt-0.5">JPEG, PNG or WebP · max 5 MB · up to 10 photos</p>
                </div>
              </button>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No photos uploaded yet.</p>
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {images.map(img => (
                <div key={img.id} className="relative rounded-xl overflow-hidden border group">
                  <div className="aspect-video bg-muted">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  {img.is_primary && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-[#ff8a00] px-2 py-0.5 text-xs font-medium text-white">
                      <Star className="h-3 w-3 fill-white" /> Primary
                    </div>
                  )}
                  {isOwner && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                      {!img.is_primary && (
                        <button onClick={() => handleSetPrimary(img.id)}
                          disabled={imageActioning === img.id}
                          className="text-xs text-white font-medium hover:underline disabled:opacity-50">
                          Set as primary
                        </button>
                      )}
                      <button onClick={() => setPendingDeleteImageId(img.id)}
                        className="ml-auto text-white hover:text-red-300" title="Delete photo">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {isOwner && images.length < 10 && (
                <button disabled={uploading} onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-[#d7dce3] aspect-video flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-[#ff8a00] hover:text-[#ff8a00] transition-colors disabled:pointer-events-none">
                  <Plus className="h-6 w-6" />
                  Add photo
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Time Slots ──────────────────────────────────────────────────────── */}
        {slots.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Time slots</h2>
            <div className="space-y-3">
              {slots.map(slot => {
                const isEditing = editingSlotId === slot.id;
                return (
                  <div key={slot.id} className="rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{slot.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {fmtTime(slot.start_time)}–{fmtTime(slot.end_time)} UTC
                          </span>
                        </div>

                        {isEditing ? (
                          <div className="mt-3 grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Imp / play</Label>
                              <Input type="number" min="1"
                                value={slotEditForm.est_impressions_per_playback}
                                onChange={e => setSlotEditForm(f => ({ ...f, est_impressions_per_playback: e.target.value }))}
                                className="h-8 text-sm rounded-md border-[#d7dce3] shadow-none focus-visible:ring-[#ff8a00]"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Daily cap</Label>
                              <Input type="number" min="1"
                                value={slotEditForm.daily_capacity_playbacks}
                                onChange={e => setSlotEditForm(f => ({ ...f, daily_capacity_playbacks: e.target.value }))}
                                className="h-8 text-sm rounded-md border-[#d7dce3] shadow-none focus-visible:ring-[#ff8a00]"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Rate mult.</Label>
                              <Input type="number" min="0.1" step="0.1"
                                value={slotEditForm.price_multiplier}
                                onChange={e => setSlotEditForm(f => ({ ...f, price_multiplier: e.target.value }))}
                                className="h-8 text-sm rounded-md border-[#d7dce3] shadow-none focus-visible:ring-[#ff8a00]"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                            <span>{slot.est_impressions_per_playback.toLocaleString()} imp/play</span>
                            <span>{slot.daily_capacity_playbacks.toLocaleString()} plays/day cap</span>
                            <span>{slot.price_multiplier}× rate</span>
                          </div>
                        )}
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isEditing ? (
                            <>
                              <Button size="sm" variant="outline" disabled={slotSaving}
                                onClick={() => setEditingSlotId(null)}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" disabled={slotSaving}
                                onClick={handleSlotSave}
                                className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
                                {slotSaving ? "Saving…" : "Save"}
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleSlotEdit(slot)}
                              className="gap-1.5">
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Today's usage ───────────────────────────────────────────────────── */}
        {isOwner && hasUsageData && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Today's usage</h2>
            <div className="rounded-xl border bg-card p-6 space-y-6">
              {usage!.slots.map(slot => (
                <div key={slot.slot_id}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{fmt(slot.slot_name)}</span>
                      <span className="text-xs text-muted-foreground">
                        {slot.total_allocated_playbacks.toLocaleString()} / {slot.daily_capacity_playbacks.toLocaleString()} plays allocated
                      </span>
                    </div>
                    <span className="text-xs font-medium shrink-0">
                      {Math.round(slot.pct_capacity_sold)}% sold
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-[#ff8a00] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, slot.pct_capacity_sold)}%` }}
                    />
                  </div>
                  {slot.bookings && slot.bookings.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {slot.bookings.map(b => (
                        <div key={b.booking_id}
                          className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Booking #{b.booking_id}</span>
                          <span>
                            {b.used_today} / {b.daily_playbacks_allocated} played
                            {" · "}
                            <span className={b.remaining_today === 0 ? "text-green-600" : ""}>
                              {b.remaining_today} remaining
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Screen devices ──────────────────────────────────────────────────── */}
        {isOwner && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Screen devices</h2>

            {/* Pair a device */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="text-sm font-semibold mb-1">Pair a new device</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Boot your Raspberry Pi or screen device. Enter the 6-digit code shown on its screen.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <InputOTP maxLength={6} value={pairCode} onChange={setPairCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map(i => (
                      <InputOTPSlot key={i} index={i} className="h-11 w-11 text-base" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <Button
                  onClick={handlePairDevice}
                  disabled={pairing || pairCode.length !== 6}
                  className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
                  {pairing ? "Pairing…" : "Pair device"}
                </Button>
              </div>
            </div>

            {/* Device list */}
            {devices.length > 0 ? (
              <div className="space-y-3">
                {devices.map(device => (
                  <div key={device.device_id}
                    className="rounded-xl border bg-card p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Cpu className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium font-mono truncate">
                            {device.device_id.length > 12
                              ? `…${device.device_id.slice(-12)}`
                              : device.device_id}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            device.status === "active"
                              ? "bg-green-100 text-green-700"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {device.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {device.last_seen_at
                            ? `Last seen ${new Date(device.last_seen_at).toLocaleString()}`
                            : device.paired_at
                            ? `Paired ${new Date(device.paired_at).toLocaleDateString()} · never checked in`
                            : "Never checked in"}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline" size="sm"
                      className="text-red-600 hover:text-red-700 hover:border-red-300 shrink-0"
                      onClick={() => setPendingDeactivateId(device.device_id)}>
                      Deactivate
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No devices paired yet.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Modals & dialogs ──────────────────────────────────────────────────── */}

      {isOwner && space && (
        <EditSpaceModal open={editOpen} onOpenChange={setEditOpen} space={space} />
      )}

      <CreateBookingModal
        open={!!bookingSpace}
        onOpenChange={open => { if (!open) setBookingSpace(null); }}
        space={bookingSpace}
      />

      {/* Delete space */}
      <AlertDialog open={deleteSpaceOpen} onOpenChange={setDeleteSpaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{space.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the space and all its photos. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep space</AlertDialogCancel>
            <AlertDialogAction disabled={deletingSpace} onClick={handleDeleteSpace}
              className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete image */}
      <AlertDialog open={!!pendingDeleteImageId}
        onOpenChange={open => { if (!open) setPendingDeleteImageId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              The photo will be permanently removed from this space.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImage}
              className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate device */}
      <AlertDialog open={!!pendingDeactivateId}
        onOpenChange={open => { if (!open) setPendingDeactivateId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this device?</AlertDialogTitle>
            <AlertDialogDescription>
              The device will stop polling for content. You can pair it again with a new code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivateDevice} disabled={deactivating}
              className="bg-red-600 text-white hover:bg-red-700">
              {deactivating ? "Deactivating…" : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default SpaceDetail;
