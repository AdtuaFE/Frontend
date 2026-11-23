import { useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, History, LocateFixed, MapPin, Search, SearchX, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Btn, menuItemCn, popoverCn } from "./primitives";

export type Place = { label: string; lat: number; lng: number };
type Suggestion = { place_name: string; lat: number; lng: number };

const RECENT_KEY = "adtua.browse.recentLocations";

function readRecent(): Place[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as Place[]) : [];
    return Array.isArray(list) ? list.slice(0, 3) : [];
  } catch {
    return [];
  }
}

function saveRecent(p: Place) {
  try {
    const next = [p, ...readRecent().filter(r => r.label !== p.label)].slice(0, 3);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* private mode: recents are a convenience only */
  }
}

/** The typed part in bold, as the design shows matches. */
function Highlight({ text, query }: { text: string; query: string }) {
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (!query || i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<b className="font-semibold">{text.slice(i, i + query.length)}</b>{text.slice(i + query.length)}</>;
}

const fmtShort = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const fmtDates = (r: DateRange | undefined) =>
  r?.from ? (r.to && r.to.getTime() !== r.from.getTime() ? `${fmtShort(r.from)} to ${fmtShort(r.to)}` : fmtShort(r.from)) : null;

/**
 * Location and dates, then Search. Picking a place or a date range applies it right away;
 * Search re-runs with whatever is typed.
 */
export function SearchBar({ place, onPlace, dates, onDates, compact }: {
  place: Place | null;
  onPlace: (p: Place | null) => void;
  dates: DateRange | undefined;
  onDates: (r: DateRange | undefined) => void;
  /** Phone: one field that shows the place over the dates. */
  compact?: boolean;
}) {
  const [text, setText] = useState(place?.label ?? "");
  const [locOpen, setLocOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typed = text.trim();
  const showingPlace = place && text === place.label;

  useEffect(() => { setText(place?.label ?? ""); }, [place]);

  // Suggestions after two characters, debounced.
  useEffect(() => {
    if (typed.length < 2 || showingPlace) { setSuggestions(null); return; }
    let live = true;
    const t = setTimeout(async () => {
      try {
        const res = await api.get<Suggestion[]>(`/api/location/autocomplete?${new URLSearchParams({ q: typed })}`);
        if (live) setSuggestions(res ?? []);
      } catch {
        if (live) setSuggestions([]);
      }
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [typed, showingPlace]);

  const choose = (p: Place) => {
    saveRecent(p);
    setText(p.label);
    setLocOpen(false);
    onPlace(p);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocError("This browser can't share your location."); return; }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      pos => { setLocating(false); choose({ label: "Current location", lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      () => { setLocating(false); setLocError("Location access was blocked. Type a place instead."); },
      { timeout: 10_000 },
    );
  };

  const runSearch = () => {
    if (!typed) { onPlace(null); return; }
    if (showingPlace) { onPlace(place); return; }
    const first = suggestions?.[0];
    if (first) choose({ label: first.place_name, lat: first.lat, lng: first.lng });
    else { setLocOpen(true); inputRef.current?.focus(); }
  };

  const recent = readRecent();

  const locationList = (
    <div role="listbox" aria-label="Locations" className="flex flex-col p-2">
      {typed.length < 2 || showingPlace ? (
        <>
          <button type="button" className={menuItemCn} onMouseDown={e => e.preventDefault()} onClick={useMyLocation} disabled={locating}>
            <LocateFixed aria-hidden />{locating ? "Finding you…" : "Use my current location"}
          </button>
          {locError && <p className="px-3 pb-2 text-xs leading-4 text-[#aa0f16]">{locError}</p>}
          {recent.length > 0 && (
            <>
              <div className="my-1 h-px bg-[#f1f2f7]" />
              <div className="px-3 pb-1 pt-2 text-xs font-medium leading-4 text-[#656972]">Recent</div>
              {recent.map(r => (
                <button key={r.label} type="button" className={menuItemCn} onMouseDown={e => e.preventDefault()} onClick={() => choose(r)}>
                  <History aria-hidden />{r.label}
                </button>
              ))}
            </>
          )}
        </>
      ) : suggestions === null ? (
        <p className="px-3 py-2 text-sm text-[#656972]">Searching…</p>
      ) : suggestions.length === 0 ? (
        <div className={cn(menuItemCn, "min-h-0 cursor-default p-3 text-[#8f929d] hover:bg-transparent")}>
          <SearchX aria-hidden />
          <span>No places match “{typed}”<span className="block text-xs leading-4">Check the spelling or try a ZIP code</span></span>
        </div>
      ) : (
        suggestions.map((s, i) => (
          <button key={i} type="button" role="option" aria-selected={false} className={menuItemCn} onMouseDown={e => e.preventDefault()}
            onClick={() => choose({ label: s.place_name, lat: s.lat, lng: s.lng })}>
            <MapPin aria-hidden /><span><Highlight text={s.place_name} query={typed} /></span>
          </button>
        ))
      )}
    </div>
  );

  const datePicker = (
    <PopoverContent align="start" className={cn(popoverCn, "p-2")}>
      <Calendar
        mode="range"
        numberOfMonths={compact ? 1 : 2}
        selected={dates}
        defaultMonth={dates?.from}
        disabled={{ before: new Date() }}
        onSelect={r => onDates(r)}
      />
      <div className="flex items-center justify-between gap-2 border-t border-[#e3e5ea] px-2 pt-2">
        <Btn variant="tertiary" size="sm" onClick={() => onDates(undefined)} disabled={!dates?.from}>Any dates</Btn>
        <Btn variant="primary" size="sm" onClick={() => setDateOpen(false)}>Done</Btn>
      </div>
    </PopoverContent>
  );

  if (compact) {
    return (
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverAnchor asChild>
          <div className="flex items-center gap-3 rounded-xl border border-[#8f929d] bg-white px-4 py-2">
            <Search aria-hidden className="h-5 w-5 shrink-0 text-[#656972]" />
            <div className="flex min-w-0 flex-1 flex-col">
              <Popover open={locOpen} onOpenChange={setLocOpen}>
                <PopoverAnchor asChild>
                  <input ref={inputRef} value={text} placeholder="City, address or ZIP code" aria-label="Location"
                    onFocus={() => setLocOpen(true)} onChange={e => { setText(e.target.value); setLocOpen(true); }}
                    onKeyDown={e => { if (e.key === "Enter") runSearch(); }}
                    className="min-w-0 bg-transparent text-xs font-medium leading-4 text-[#1a1d25] outline-none placeholder:font-normal placeholder:text-[#656972]" />
                </PopoverAnchor>
                <PopoverContent align="start" sideOffset={14} onOpenAutoFocus={e => e.preventDefault()} className={cn(popoverCn, "w-[min(358px,calc(100vw-32px))]")}>
                  {locationList}
                </PopoverContent>
              </Popover>
              <button type="button" onClick={() => setDateOpen(true)} className="truncate text-left text-sm leading-5 text-[#1a1d25]">
                {fmtDates(dates) ?? <span className="text-[#656972]">Any dates</span>}
              </button>
            </div>
          </div>
        </PopoverAnchor>
        {datePicker}
      </Popover>
    );
  }

  return (
    <div role="search" className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] items-center rounded-xl border border-[#8f929d] bg-white py-1 pl-0 pr-1">
      <Popover open={locOpen} onOpenChange={setLocOpen}>
        <PopoverAnchor asChild>
          <label className="flex min-w-0 cursor-text items-center gap-3 px-4 py-2">
            <MapPin aria-hidden className="h-5 w-5 shrink-0 text-[#656972]" />
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="text-xs font-medium leading-4 text-[#4a4d56]">Location</b>
              <input ref={inputRef} value={text} placeholder="City, address or ZIP code"
                onFocus={() => setLocOpen(true)}
                onChange={e => { setText(e.target.value); setLocOpen(true); }}
                onKeyDown={e => { if (e.key === "Enter") runSearch(); if (e.key === "Escape") setLocOpen(false); }}
                className="min-w-0 truncate bg-transparent text-sm leading-5 text-[#1a1d25] outline-none placeholder:text-[#656972]" />
            </span>
            {text && (
              <button type="button" aria-label="Clear location" onClick={() => { setText(""); onPlace(null); }}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[#656972] hover:bg-[#f1f2f7] hover:text-[#1a1d25]">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
        </PopoverAnchor>
        <PopoverContent align="start" sideOffset={8} onOpenAutoFocus={e => e.preventDefault()}
          onInteractOutside={e => { if (e.target instanceof Node && inputRef.current?.parentElement?.contains(e.target)) e.preventDefault(); }}
          className={cn(popoverCn, "w-[360px]")}>
          {locationList}
        </PopoverContent>
      </Popover>

      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverAnchor asChild>
          <button type="button" onClick={() => setDateOpen(true)}
            className="flex min-w-0 items-center gap-3 border-l border-[#e3e5ea] px-4 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#3a47c2]">
            <CalendarIcon aria-hidden className="h-5 w-5 shrink-0 text-[#656972]" />
            <span className="flex min-w-0 flex-col">
              <b className="text-xs font-medium leading-4 text-[#4a4d56]">Dates</b>
              <span className={cn("truncate text-sm leading-5", dates?.from ? "text-[#1a1d25]" : "text-[#656972]")}>
                {fmtDates(dates) ?? "Any dates"}
              </span>
            </span>
          </button>
        </PopoverAnchor>
        {datePicker}
      </Popover>

      <div className="pl-2">
        <Btn variant="primary" className="pl-3" onClick={runSearch}><Search aria-hidden />Search</Btn>
      </div>
    </div>
  );
}
