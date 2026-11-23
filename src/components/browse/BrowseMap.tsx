import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { List, Maximize2, Minus, Plus, RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmtPrice, miToKm } from "./browseData";
import { Btn } from "./primitives";

export type MapPin = { id: number; lat: number; lng: number; price: number | null };

const pinIcon = (label: string, state: "idle" | "hover" | "on") =>
  L.divIcon({
    className: "",
    html: `<span class="adtua-pin adtua-pin--${state}">${label}</span>`,
    // No size: the pill sizes itself in CSS and is centred over the point there.
    iconSize: null as unknown as L.PointExpression,
    iconAnchor: [0, 14],
  });

const hereIcon = L.divIcon({
  className: "",
  html: '<span class="adtua-here"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** Fits the view to the results whenever a new search comes back. */
function FitToResults({ pins, center, radiusMi, searchKey, fitting }: {
  pins: MapPin[];
  center: { lat: number; lng: number } | null;
  radiusMi: number | null;
  searchKey: string;
  fitting: React.MutableRefObject<boolean>;
}) {
  const map = useMap();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === searchKey) return;
    fitting.current = true;
    map.once("moveend", () => { setTimeout(() => { fitting.current = false; }, 0); });
    if (center && radiusMi) {
      map.fitBounds(L.latLng(center.lat, center.lng).toBounds(miToKm(radiusMi) * 2000), { padding: [24, 24] });
      last.current = searchKey;
    } else if (pins.length) {
      map.fitBounds(L.latLngBounds(pins.map(p => [p.lat, p.lng])), { padding: [48, 48], maxZoom: 14 });
      last.current = searchKey;
    }
    else fitting.current = false;
  }, [map, pins, center, radiusMi, searchKey, fitting]);
  return null;
}

/** Shows "Search this area" once the person pans or zooms, and closes the card on a map click. */
function MapWatcher({ onMoved, onBackgroundClick, fitting }: {
  onMoved: () => void;
  onBackgroundClick: () => void;
  fitting: React.MutableRefObject<boolean>;
}) {
  useMapEvents({
    moveend: () => { if (!fitting.current) onMoved(); },
    click: onBackgroundClick,
  });
  return null;
}

/** Keeps the floating card under its pin as the map moves. */
function FloatingCard({ pin, children }: { pin: MapPin; children: ReactNode }) {
  const map = useMap();
  const [pt, setPt] = useState(() => map.latLngToContainerPoint([pin.lat, pin.lng]));
  useEffect(() => {
    const update = () => setPt(map.latLngToContainerPoint([pin.lat, pin.lng]));
    update();
    map.on("move zoom resize", update);
    return () => { map.off("move zoom resize", update); };
  }, [map, pin.lat, pin.lng]);
  const size = map.getSize();
  const w = 256;
  const left = Math.min(Math.max(12, pt.x - w / 2), size.x - w - 12);
  // Below the pin when there's room, above it otherwise.
  const below = pt.y + 24 + 300 < size.y;
  return (
    <div
      className="absolute z-[1000] box-border w-64 rounded-xl bg-white p-3 shadow-[0_8px_24px_rgba(26,29,37,0.16)]"
      style={below ? { left, top: pt.y + 24 } : { left, bottom: size.y - pt.y + 20 }}
      onClick={e => e.stopPropagation()}
      onDoubleClick={e => e.stopPropagation()}
      onWheel={e => e.stopPropagation()}>
      {children}
    </div>
  );
}

function ZoomButtons() {
  const map = useMap();
  const zoom = (by: number) => map.setZoom(map.getZoom() + by);
  return (
    <div className="absolute right-4 top-4 z-[1000] flex flex-col overflow-hidden rounded-lg bg-white shadow-[0_1px_3px_rgba(26,29,37,0.16)]">
      <button type="button" aria-label="Zoom in" onClick={() => zoom(1)} className="grid h-8 w-8 place-items-center text-[#1a1d25] hover:bg-[#f8faff]">
        <Plus className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Zoom out" onClick={() => zoom(-1)} className="grid h-8 w-8 place-items-center border-t border-[#e3e5ea] text-[#1a1d25] hover:bg-[#f8faff]">
        <Minus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Reads the visible area when "Search this area" is pressed. */
function AreaReader({ readRef }: { readRef: React.MutableRefObject<(() => { lat: number; lng: number; radiusMi: number }) | null> }) {
  const map = useMap();
  useEffect(() => {
    readRef.current = () => {
      const c = map.getCenter();
      const b = map.getBounds();
      const halfKm = Math.min(c.distanceTo(L.latLng(b.getNorth(), c.lng)), c.distanceTo(L.latLng(c.lat, b.getEast()))) / 1000;
      return { lat: c.lat, lng: c.lng, radiusMi: Math.max(0.5, Math.round((halfKm / 1.609344) * 10) / 10) };
    };
  }, [map, readRef]);
  return null;
}

/**
 * The results map from the "Browse spaces" design: price pins, the search radius, a card that
 * floats under the picked pin, expand/list toggle, zoom, and "Search this area" after a pan.
 */
export function BrowseMap({
  pins, selectedId, hoveredId, onSelect, center, radiusMi, searchKey, expanded, onToggleExpand,
  onSearchArea, renderCard, loading, className,
}: {
  pins: MapPin[];
  selectedId: number | null;
  hoveredId: number | null;
  onSelect: (id: number | null) => void;
  center: { lat: number; lng: number } | null;
  radiusMi: number | null;
  searchKey: string;
  expanded: boolean;
  onToggleExpand?: () => void;
  onSearchArea: (area: { lat: number; lng: number; radiusMi: number }) => void;
  renderCard: (id: number) => ReactNode;
  loading?: boolean;
  className?: string;
}) {
  const [moved, setMoved] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const tiles = useRef({ ok: 0, err: 0 });
  const fitting = useRef(false);
  const readArea = useRef<(() => { lat: number; lng: number; radiusMi: number }) | null>(null);

  useEffect(() => { setMoved(false); }, [searchKey]);

  const icons = useMemo(() => {
    const m = new Map<number, L.DivIcon>();
    for (const p of pins) {
      const state = p.id === selectedId ? "on" : p.id === hoveredId ? "hover" : "idle";
      m.set(p.id, pinIcon(p.price != null ? fmtPrice(p.price) : "—", state));
    }
    return m;
  }, [pins, selectedId, hoveredId]);

  const selectedPin = pins.find(p => p.id === selectedId) ?? null;

  if (failed) {
    return (
      <div className={cn("relative grid place-items-center rounded-xl bg-[#f1f2f7]", className)}>
        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <h3 className="m-0 text-base font-semibold leading-6">The map couldn't load</h3>
          <p className="m-0 max-w-[40ch] text-sm leading-5 text-[#4a4d56]">The list still works.</p>
          <div className="mt-2 flex gap-2">
            <Btn size="sm" className="pl-2" onClick={() => { tiles.current = { ok: 0, err: 0 }; setFailed(false); setAttempt(a => a + 1); }}>
              <RefreshCw aria-hidden />Try again
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("adtua-map relative isolate overflow-hidden rounded-xl bg-[#f1f2f7]", className)} aria-label={loading ? "Map, results loading" : "Map of results"}>
      <MapContainer key={attempt} center={[39.5, -98.35]} zoom={4} zoomControl={false} attributionControl
        className="h-full w-full" style={{ background: "#f1f2f7" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          eventHandlers={{
            tileload: () => { tiles.current.ok++; },
            tileerror: () => {
              tiles.current.err++;
              if (tiles.current.ok === 0 && tiles.current.err >= 4) setFailed(true);
            },
          }}
        />
        <FitToResults pins={pins} center={center} radiusMi={radiusMi} searchKey={searchKey} fitting={fitting} />
        <MapWatcher onMoved={() => setMoved(true)} onBackgroundClick={() => onSelect(null)} fitting={fitting} />
        <AreaReader readRef={readArea} />
        {center && radiusMi && (
          <Circle center={[center.lat, center.lng]} radius={miToKm(radiusMi) * 1000} interactive={false}
            pathOptions={{ color: "#cad6fe", weight: 2, dashArray: "6 6", fill: false }} />
        )}
        {center && <Marker position={[center.lat, center.lng]} icon={hereIcon} interactive={false} keyboard={false} />}
        {!loading && pins.map(p => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icons.get(p.id)!}
            zIndexOffset={p.id === selectedId ? 1000 : p.id === hoveredId ? 500 : 0}
            eventHandlers={{ click: () => onSelect(p.id === selectedId ? null : p.id) }} />
        ))}
        {selectedPin && !loading && <FloatingCard pin={selectedPin}>{renderCard(selectedPin.id)}</FloatingCard>}
        {!loading && <ZoomButtons />}
      </MapContainer>

      {!loading && onToggleExpand && (
        <Btn size="sm" className="absolute left-4 top-4 z-[1000] pl-2 shadow-[0_1px_3px_rgba(26,29,37,0.16)]" onClick={onToggleExpand}>
          {expanded ? <><List aria-hidden />Show list</> : <><Maximize2 aria-hidden />Expand map</>}
        </Btn>
      )}
      {moved && !loading && (
        <Btn size="sm" className="absolute left-1/2 top-4 z-[1000] -translate-x-1/2 pl-2 shadow-[0_1px_3px_rgba(26,29,37,0.16)]"
          onClick={() => { const a = readArea.current?.(); if (a) { setMoved(false); onSearchArea(a); } }}>
          <RotateCcw aria-hidden />Search this area
        </Btn>
      )}
    </div>
  );
}
