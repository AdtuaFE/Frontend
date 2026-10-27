import { useMemo } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationAutocomplete, type LocationResult } from "@/components/LocationAutocomplete";
import { parsePlaceName } from "@/lib/location";
import { Field, StepNav, TextInput, fieldCn, fieldErrCn } from "./primitives";
import type { SpaceDraft } from "./types";

/** Short list first — the autocomplete fills this in for anywhere else. */
const COUNTRIES = ["US", "CA", "GB", "IE", "AU", "NZ", "IN", "DE", "FR", "ES", "IT", "NL"];

const pin = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3a47c2;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

type Props = {
  draft: SpaceDraft;
  search: string;
  errors: Record<string, string>;
  onSearchChange: (value: string) => void;
  onChange: (patch: Partial<SpaceDraft>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepLocation({
  draft, search, errors, onSearchChange, onChange, onBack, onNext,
}: Props) {
  const hasPin = draft.geoLat !== null && draft.geoLng !== null;
  const center = useMemo<[number, number]>(
    () => (hasPin ? [draft.geoLat as number, draft.geoLng as number] : [39.1653, -86.5264]),
    [hasPin, draft.geoLat, draft.geoLng],
  );

  const handleSelect = (result: LocationResult) => {
    const { addressLine1, city, region, postalCode, country } = parsePlaceName(result.place_name);
    onChange({
      ...(addressLine1 ? { addressLine1 } : {}),
      city: city || draft.city,
      region: region || draft.region,
      country: country || draft.country,
      ...(postalCode ? { postalCode } : {}),
      geoLat: result.lat,
      geoLng: result.lng,
    });
  };

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex w-full flex-col gap-3">
        <Field
          label="Search address"
          hint="Select an address to automatically fill the location details below. You can edit them if needed.">
          <LocationAutocomplete
            value={search}
            onChange={onSearchChange}
            onSelect={handleSelect}
            placeholder="Start typing an address or city..."
            className="w-full"
          />
        </Field>

        <div className="h-[264px] w-full overflow-hidden rounded-lg border border-[#e3e5ea]">
          <MapContainer
            key={`${center[0]},${center[1]}`}
            center={center}
            zoom={hasPin ? 15 : 13}
            scrollWheelZoom={false}
            className="size-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {hasPin && <Marker position={center} icon={pin} />}
          </MapContainer>
        </div>
      </div>

      <Field label="Address line 1" required error={errors.addressLine1}>
        <TextInput
          invalid={!!errors.addressLine1}
          placeholder="123 Main Street"
          value={draft.addressLine1}
          onChange={e => onChange({ addressLine1: e.target.value })}
        />
      </Field>

      <Field label="Address line 2 (optional)">
        <TextInput
          placeholder="Suite, floor, or landmark"
          value={draft.addressLine2}
          onChange={e => onChange({ addressLine2: e.target.value })}
        />
      </Field>

      <div className="flex w-full flex-col gap-8">
        <div className="flex w-full items-start gap-8">
          <Field label="City" required error={errors.city}>
            <TextInput
              invalid={!!errors.city}
              placeholder="Bloomington"
              value={draft.city}
              onChange={e => onChange({ city: e.target.value })}
            />
          </Field>
          <Field label="State/Region">
            <TextInput
              placeholder="Indiana"
              value={draft.region}
              onChange={e => onChange({ region: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex w-full items-start gap-8">
          <Field label="Country" required error={errors.country}>
            <Select value={draft.country} onValueChange={v => onChange({ country: v })}>
              <SelectTrigger className={`${errors.country ? fieldErrCn : fieldCn} justify-between`}>
                <SelectValue placeholder="US" />
              </SelectTrigger>
              <SelectContent>
                {/* Keep whatever the autocomplete filled in, even if it's off this list. */}
                {(COUNTRIES.includes(draft.country) || !draft.country
                  ? COUNTRIES
                  : [draft.country, ...COUNTRIES]
                ).map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="ZIP/Postal Code">
            <TextInput
              placeholder="47208"
              value={draft.postalCode}
              onChange={e => onChange({ postalCode: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}
