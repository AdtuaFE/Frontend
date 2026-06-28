import { useEffect, useRef, useState } from "react";
import { MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export type LocationResult = {
  place_name: string;
  lat: number;
  lng: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: LocationResult) => void;
  /** Optional bias coords — passed to the API to prioritise nearby results */
  biasLat?: number;
  biasLng?: number;
  placeholder?: string;
  error?: boolean;
  className?: string;
};

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  biasLat,
  biasLng,
  placeholder = "Search location…",
  error,
  className,
}: Props) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Prevents the debounce effect from re-fetching when we set the value after a selection
  const skipFetchRef = useRef(false);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    if (value.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: value });
        if (biasLat != null) params.set("lat", String(biasLat));
        if (biasLng != null) params.set("lng", String(biasLng));
        const results = await api.get<LocationResult[]>(`/api/location/autocomplete?${params}`);
        setSuggestions(results ?? []);
        setOpen((results ?? []).length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, biasLat, biasLng]);

  const handleSelect = (result: LocationResult) => {
    skipFetchRef.current = true;
    setSuggestions([]);
    setOpen(false);
    onChange(result.place_name);
    onSelect(result);
  };

  const handleClear = () => {
    onChange("");
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={`pl-9 ${value ? "pr-8" : ""} h-10 rounded-lg text-sm shadow-none ${
            error
              ? "border-red-400 focus-visible:ring-red-400"
              : "border-[#d7dce3] focus-visible:ring-[#ff8a00]"
          }`}
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md overflow-hidden">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={e => e.preventDefault()} // prevent input blur before click registers
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent flex items-start gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <span>{s.place_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
