import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Monitor, Navigation } from "lucide-react";
import { CreateBookingModal, type SpaceInfo } from "@/components/CreateBookingModal";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

type Space = {
  id: number;
  broadcaster_id: number;
  name: string;
  description: string | null;
  space_type: string;
  display_type: string;
  city: string | null;
  country: string | null;
  cpm: number;
  est_daily_impressions: number | null;
  is_active: boolean;
  geo_lat: number | null;
  geo_lng: number | null;
  distance_km?: number;
};

const fmt = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

function SpaceCard({
  space,
  onBook,
}: {
  space: Space;
  onBook?: (info: SpaceInfo) => void;
}) {
  const navigate = useNavigate();
  return (
    <Card className="hover:border-[#ff8a00] transition-colors flex flex-col cursor-pointer"
      onClick={() => navigate(`/spaces/${space.id}`)}>
      <CardContent className="pt-6 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{space.name}</h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            space.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
          }`}>
            {space.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Monitor className="h-3.5 w-3.5" />
            {fmt(space.space_type)}
          </span>
          {(space.city || space.country) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {[space.city, space.country].filter(Boolean).join(", ")}
            </span>
          )}
          {space.distance_km != null && (
            <span className="flex items-center gap-1 text-[#ff8a00] font-medium">
              <Navigation className="h-3.5 w-3.5" />
              {space.distance_km < 1
                ? `${Math.round(space.distance_km * 1000)} m`
                : `${space.distance_km.toFixed(1)} km`} away
            </span>
          )}
        </div>
        {space.description && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{space.description}</p>
        )}
        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-medium text-foreground">${space.cpm} CPM</span>
            {space.est_daily_impressions != null && (
              <span className="ml-3 text-muted-foreground">
                ~{space.est_daily_impressions.toLocaleString()} daily
              </span>
            )}
          </div>
          {onBook && (
            <Button
              size="sm"
              className="shrink-0 bg-[#ff8a00] text-white hover:bg-[#e77700]"
              onClick={e => {
                e.stopPropagation();
                onBook({ id: space.id, name: space.name, cpm: space.cpm, est_daily_impressions: space.est_daily_impressions });
              }}>
              Book
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-baseline gap-3 mb-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <span className="text-sm text-muted-foreground">{count} space{count !== 1 ? "s" : ""}</span>
    </div>
  );
}

const Browse = () => {
  const { user } = useAuth();
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;

  const [bookingSpace, setBookingSpace] = useState<SpaceInfo | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [searchCoords, setSearchCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(10);

  const { data: allSpaces = [], isLoading } = useQuery<Space[]>({
    queryKey: ["spaces-search", searchCoords?.lat, searchCoords?.lng, radius],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchCoords) {
        params.set("lat", String(searchCoords.lat));
        params.set("lng", String(searchCoords.lng));
        params.set("radius", String(radius));
      }
      const qs = params.toString();
      return api.get<Space[]>(`/api/spaces/search${qs ? `?${qs}` : ""}`);
    },
  });

  const { data: mySpaces = [] } = useQuery<Space[]>({
    queryKey: ["spaces-mine"],
    queryFn: () => api.get<Space[]>("/api/spaces/mine"),
    enabled: isBroadcaster,
  });

  const mySpaceIds = new Set(mySpaces.map(s => s.id));
  const otherSpaces = allSpaces.filter(s => !mySpaceIds.has(s.id));

  const clearLocation = () => {
    setSearchCoords(null);
    setLocationQuery("");
  };

  if (isLoading) {
    return (
      <AppLayout activeNav="browse">
        <div className="flex items-center justify-center py-40 text-muted-foreground">
          Loading spaces…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeNav="browse">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Browse spaces</h1>
          <p className="mt-1 text-muted-foreground">Discover available ad spaces from broadcasters.</p>
        </div>

        {/* Location + radius filter */}
        <div className="rounded-xl border bg-card p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Near location</Label>
            <LocationAutocomplete
              value={locationQuery}
              onChange={v => { setLocationQuery(v); if (!v) setSearchCoords(null); }}
              onSelect={r => { setSearchCoords({ lat: r.lat, lng: r.lng }); setLocationQuery(r.place_name); }}
              placeholder="Search by city or area…"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Radius</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number" min="1" max="500"
                value={radius}
                onChange={e => setRadius(Math.max(1, Number(e.target.value)))}
                disabled={!searchCoords}
                className="h-10 w-20 rounded-lg border-[#d7dce3] text-sm shadow-none focus-visible:ring-[#ff8a00] disabled:opacity-40"
              />
              <span className="text-sm text-muted-foreground">km</span>
            </div>
          </div>
          {searchCoords && (
            <Button variant="outline" size="sm" onClick={clearLocation} className="h-10">
              Clear filter
            </Button>
          )}
        </div>

        {searchCoords && (
          <p className="text-sm text-muted-foreground -mt-4">
            Showing spaces within <strong>{radius} km</strong> of <strong>{locationQuery}</strong>,
            sorted by distance.
          </p>
        )}

        {/* Broadcaster's own spaces — no book button, no radius filter */}
        {isBroadcaster && mySpaces.length > 0 && (
          <div>
            <SectionHeading title="My spaces" count={mySpaces.length} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mySpaces.map(s => <SpaceCard key={s.id} space={s} />)}
            </div>
          </div>
        )}

        {/* All other spaces */}
        <div>
          <SectionHeading
            title={isBroadcaster ? "Other spaces" : "All spaces"}
            count={otherSpaces.length}
          />
          {otherSpaces.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {otherSpaces.map(s => (
                <SpaceCard
                  key={s.id}
                  space={s}
                  onBook={isAdvertiser ? setBookingSpace : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              {searchCoords
                ? `No spaces found within ${radius} km. Try increasing the radius.`
                : isBroadcaster ? "No other spaces listed yet." : "No spaces listed yet."}
            </div>
          )}
        </div>
      </div>

      <CreateBookingModal
        open={!!bookingSpace}
        onOpenChange={open => { if (!open) setBookingSpace(null); }}
        space={bookingSpace}
      />
    </AppLayout>
  );
};

export default Browse;
