import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapSpace = {
  id: number;
  geo_lat: number;
  geo_lng: number;
  is_active: boolean;
  is_own?: boolean;
};

function markerIcon(active: boolean, own: boolean, selected: boolean) {
  // own+active=orange, own+inactive=gray, other+active=blue, other+inactive=light gray
  const color = own
    ? (active ? '#ff8a00' : '#94a3b8')
    : (active ? '#3b82f6' : '#cbd5e1');
  const size = selected ? 22 : 16;
  const ring = selected
    ? `box-shadow:0 0 0 3px ${own ? 'rgba(255,138,0,0.25)' : 'rgba(59,130,246,0.25)'}, 0 2px 8px rgba(0,0,0,0.3)`
    : '0 2px 6px rgba(0,0,0,0.3)';
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:${ring}"></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MapController({ spaces, selectedId }: { spaces: MapSpace[]; selectedId: number | null }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || !spaces.length) return;
    const bounds = L.latLngBounds(spaces.map(s => [s.geo_lat, s.geo_lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
      fitted.current = true;
    }
  }, [spaces, map]);

  useEffect(() => {
    if (!selectedId) return;
    const s = spaces.find(sp => sp.id === selectedId);
    if (s) map.panTo([s.geo_lat, s.geo_lng], { animate: true });
  }, [selectedId, spaces, map]);

  return null;
}

export function SpaceMap({ spaces, selectedId, onSelect }: {
  spaces: MapSpace[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <MapContainer center={[20, 0]} zoom={2} className="w-full h-full" zoomControl={false}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ZoomControl position="bottomright" />
      <MapController spaces={spaces} selectedId={selectedId} />
      {spaces.map(s => (
        <Marker
          key={s.id}
          position={[s.geo_lat, s.geo_lng]}
          icon={markerIcon(s.is_active, s.is_own ?? false, s.id === selectedId)}
          eventHandlers={{ click: () => onSelect(s.id) }}
        />
      ))}
    </MapContainer>
  );
}
