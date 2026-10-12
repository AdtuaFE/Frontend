import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { Pencil, ChevronUp, Star, TrendingUp, Monitor } from "lucide-react";
import { BROADCASTER_FREE_SHARE, BROADCASTER_PAID_SHARE } from "@/lib/plans";
import { PrimaryButton, SecondaryButton } from "./primitives";
import { SlotGrid } from "./SlotGrid";
import {
  DISPLAY_TYPES, SPACE_TYPES, effectiveSlots, monthlyEarningsCeiling,
  type PhotoDraft, type ScreenDraft, type SpaceDraft, type StepKey,
} from "./types";

const pin = L.divIcon({
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#3a47c2;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const labelFor = (list: readonly { value: string; label: string }[], value: string) =>
  list.find(i => i.value === value)?.label ?? value ?? "—";

type Props = {
  draft: SpaceDraft;
  photos: PhotoDraft[];
  isPaid: boolean;
  submitting: boolean;
  onEdit: (step: StepKey) => void;
  onBack: () => void;
  onPublish: () => void;
};

export function StepReview({ draft, photos, isPaid, submitting, onEdit, onBack, onPublish }: Props) {
  const navigate = useNavigate();
  const gross = monthlyEarningsCeiling(draft.screens);
  const yourShare = gross * (isPaid ? BROADCASTER_PAID_SHARE : BROADCASTER_FREE_SHARE);
  const premiumShare = gross * BROADCASTER_PAID_SHARE;
  const hasPin = draft.geoLat !== null && draft.geoLng !== null;

  return (
    <div className="flex w-full flex-col gap-8">
      {/* ---- Basics ---- */}
      <Section title="Basics" onEdit={() => onEdit("basics")}>
        <ReadField label="Space name">{draft.name || "—"}</ReadField>
        {draft.description && <ReadField label="Description">{draft.description}</ReadField>}
        <div className="grid grid-cols-2 gap-6">
          <ReadField label="Space type">{labelFor(SPACE_TYPES, draft.spaceType)}</ReadField>
          <ReadField label="Audience">{draft.audience || "—"}</ReadField>
        </div>
        {photos.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[#9c9c9c]">Relevant media</p>
            <p className="text-center text-xs text-[#767676]">Photos · {photos.length}</p>
            <div className="flex flex-wrap gap-3">
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className="relative h-[100px] w-[135px] overflow-hidden rounded-lg border border-[#e3e5ea]">
                  <img src={photo.previewUrl} alt={photo.name} className="size-full object-cover" />
                  {photo.isPrimary && (
                    <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-[#3a47c2] px-1.5 py-0.5 text-[10px] font-medium text-white">
                      <Star className="size-2.5 fill-current" />Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ---- Location ---- */}
      <Section title="Location" onEdit={() => onEdit("location")}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[#9c9c9c]">Address</p>
            <div className="text-sm leading-[22px] text-[#1a1d25]">
              {draft.addressLine1 && <p>{draft.addressLine1}</p>}
              {draft.addressLine2 && <p>{draft.addressLine2}</p>}
              <p>
                {[draft.city, draft.region, draft.postalCode].filter(Boolean).join(", ")}
                {draft.country ? `, ${draft.country}` : ""}
              </p>
            </div>
          </div>
          {hasPin && (
            <div className="h-[120px] w-[220px] shrink-0 overflow-hidden rounded-lg border border-[#e3e5ea]">
              <MapContainer
                center={[draft.geoLat as number, draft.geoLng as number]}
                zoom={14}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                attributionControl={false}
                className="size-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[draft.geoLat as number, draft.geoLng as number]} icon={pin} />
              </MapContainer>
            </div>
          )}
        </div>
      </Section>

      {/* ---- Screens and Schedule ---- */}
      <Section title="Screens and Schedule" onEdit={() => onEdit("screens")}>
        {draft.screens.map((screen, i) => (
          <ScreenSummary
            key={screen.id}
            screen={screen}
            screens={draft.screens}
            index={i}
            defaultOpen={i === 0}
            thumbnail={photos[i]?.previewUrl ?? photos[0]?.previewUrl}
          />
        ))}
      </Section>

      {/* ---- Earnings ---- */}
      <div className="flex w-full flex-col gap-6 rounded-2xl border-[0.8px] border-[#e8e8e8] bg-white p-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-[#767676]">Combined potential monthly earnings</p>
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-2xl font-semibold text-[#4a5565]">{money(yourShare)}</p>
            <p className="text-sm text-[#767676]">
              per month if all listed screens are fully booked
            </p>
          </div>
        </div>

        {!isPaid && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#767676]">
            <TrendingUp className="size-4 shrink-0 text-[#3a47c2]" />
            <p className="flex-1">
              With Premium, you keep{" "}
              <span className="font-semibold text-[#1a1d25]">
                {Math.round(BROADCASTER_PAID_SHARE * 100)}% of booking revenue
              </span>
              , up to {money(premiumShare)}/month if fully booked.
            </p>
            <button
              type="button"
              onClick={() => navigate("/settings?tab=plans")}
              className="shrink-0 text-sm font-medium text-[#3a47c2] hover:underline">
              See plans
            </button>
          </div>
        )}

        <EarningsExplainer
          gross={gross}
          share={isPaid ? BROADCASTER_PAID_SHARE : BROADCASTER_FREE_SHARE}
          net={yourShare}
        />
      </div>

      <div className="flex w-full items-center justify-center gap-8">
        <div className="flex-1">
          <SecondaryButton onClick={onBack} className="w-full">Back</SecondaryButton>
        </div>
        <div className="flex-1">
          <PrimaryButton onClick={onPublish} disabled={submitting}>
            {submitting ? "Publishing…" : "Publish Space"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function Section({
  title, onEdit, children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1a1d25]">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 text-sm font-medium text-[#3a47c2] hover:underline">
          <Pencil className="size-4" />Edit
        </button>
      </div>
      <div className="flex w-full flex-col gap-5">{children}</div>
    </div>
  );
}

function ReadField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-[#9c9c9c]">{label}</p>
      <p className="whitespace-pre-wrap text-sm leading-[22px] text-[#1a1d25]">{children}</p>
    </div>
  );
}

function ScreenSummary({
  screen, screens, index, defaultOpen, thumbnail,
}: {
  screen: ScreenDraft;
  screens: ScreenDraft[];
  index: number;
  defaultOpen: boolean;
  thumbnail?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const slots = effectiveSlots(screen, screens);
  const name = screen.name.trim() || `Screen ${index + 1}`;
  const orientation =
    Number(screen.widthPx) && Number(screen.heightPx)
      ? Number(screen.heightPx) > Number(screen.widthPx) ? "portrait" : "landscape"
      : "";
  const subtitle = [
    labelFor(DISPLAY_TYPES, screen.displayType),
    screen.widthPx && screen.heightPx ? `${screen.widthPx}×${screen.heightPx} ${orientation}`.trim() : null,
    `${slots.length} time slot${slots.length === 1 ? "" : "s"}`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="w-full rounded-xl border border-[#e8e8e8] bg-white">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-3 p-3 text-left">
        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#f8faff]">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="size-full object-cover" />
          ) : (
            <Monitor className="size-5 text-[#8f929d]" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-[#1a1d25]">{name}</span>
          <span className="truncate text-xs text-[#767676]">{subtitle}</span>
        </span>
        <ChevronUp className={`size-5 shrink-0 text-[#4a5565] transition-transform ${open ? "" : "rotate-180"}`} />
      </button>

      {open && (
        <div className="flex flex-col gap-5 border-t border-[#e8e8e8] p-4">
          <div className="grid grid-cols-2 gap-6">
            <ReadField label="Display type">{labelFor(DISPLAY_TYPES, screen.displayType)}</ReadField>
            <ReadField label="Size">
              {screen.widthPx && screen.heightPx
                ? `${screen.widthPx} × ${screen.heightPx} px${screen.sizeLabel ? `, ${screen.sizeLabel}` : ""}`
                : screen.sizeLabel || "—"}
            </ReadField>
          </div>
          <ReadField label="Supporting ad formats">
            {screen.formats.length ? screen.formats.join(", ") : "—"}
          </ReadField>
          {screen.orientation && (
            <ReadField label="Screen orientation">{screen.orientation}</ReadField>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-xs text-[#9c9c9c]">Time slots</p>
            <SlotGrid slots={slots} />
          </div>

          {screen.blockedDates.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[#9c9c9c]">Blocked dates (holidays or closures)</p>
              <div className="flex flex-wrap gap-2">
                {screen.blockedDates.map(iso => {
                  const [y, m, d] = iso.split("-").map(Number);
                  return (
                    <span
                      key={iso}
                      className="flex h-8 items-center rounded-lg border border-[#e3e5ea] px-3 text-sm text-[#1a1d25]">
                      {new Date(y, m - 1, d).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EarningsExplainer({
  gross, share, net,
}: {
  gross: number;
  share: number;
  net: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex w-full flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-medium text-[#767676]">
        How earnings are calculated
        <ChevronUp className={`size-[18px] transition-transform ${open ? "" : "rotate-180"}`} />
      </button>
      {open && (
        <p className="text-sm leading-[22px] text-[#767676]">
          Every priced time slot is counted at its full daily price for each day it runs, averaged
          over a month ({money(gross)} gross). Your share at{" "}
          {Math.round(share * 100)}% = {money(net)}. This is a ceiling — it assumes every slot sells
          out, every day.
        </p>
      )}
    </div>
  );
}
