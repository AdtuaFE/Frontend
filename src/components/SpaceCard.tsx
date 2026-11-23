import { useNavigate } from "react-router-dom";
import { MapPin, Monitor, Navigation } from "lucide-react";
import { fmt } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SpaceInfo } from "@/components/CreateBookingModal";

// The space card My spaces lists. Browse spaces has its own listing card (components/browse).

export type Space = {
  id: number;
  broadcaster_id: number;
  name: string;
  description: string | null;
  space_type: string;
  display_type: string;
  city: string | null;
  region: string | null;
  country: string | null;
  cpm: number;
  est_daily_impressions: number | null;
  is_active: boolean;
  geo_lat: number | null;
  geo_lng: number | null;
  distance_km?: number;
};

export function SpaceCard({
  space,
  onBook,
}: {
  space: Space;
  onBook?: (info: SpaceInfo) => void;
}) {
  const navigate = useNavigate();
  return (
    <Card className="hover:border-[#3a47c2] transition-colors flex flex-col cursor-pointer"
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
          {(space.city || space.region || space.country) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {[space.city, space.region, space.country].filter(Boolean).join(", ")}
            </span>
          )}
          {space.distance_km != null && (
            <span className="flex items-center gap-1 text-[#3a47c2] font-medium">
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
              className="shrink-0 bg-[#3a47c2] text-white hover:bg-[#2f3a9e]"
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
