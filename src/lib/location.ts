export type ParsedPlace = {
  addressLine1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

/**
 * Splits a Mapbox-style place name, which runs fine-to-coarse:
 * "42 Maple Avenue, Bloomington, Indiana 47401, United States". Fields it can't find are "".
 */
export function parsePlaceName(placeName: string): ParsedPlace {
  const parts = placeName.split(", ");
  // If the first part starts with a digit it's a street address e.g. "42 Maple Avenue"
  const firstIsStreet = /^\d/.test(parts[0]);
  // Second-to-last part may be "Indiana 47401" — split into region + postal code
  const regionRaw = parts.length >= 3 ? parts[parts.length - 2] : "";
  const postalMatch = regionRaw.match(/^(.+?)\s+(\d[\w-]+)$/);
  return {
    addressLine1: firstIsStreet ? parts[0] : "",
    city: firstIsStreet ? (parts[1] ?? "") : (parts[0] ?? ""),
    region: postalMatch ? postalMatch[1].trim() : regionRaw,
    postalCode: postalMatch ? postalMatch[2].trim() : "",
    country: parts[parts.length - 1] ?? "",
  };
}
