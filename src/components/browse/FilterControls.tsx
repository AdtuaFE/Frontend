// The filter row, sort menu, More filters sheet and applied-filter chips from the
// "Browse controls" design. Multi-value popovers keep a draft and apply on "Show N spaces";
// single-select menus apply on click.

import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Check, ChevronDown, Plus, SlidersHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Campaign } from "@/components/campaigns/campaignData";
import { fmtRange } from "@/components/campaigns/campaignData";
import {
  ALL_DAYS, DAY_LABEL, DISTANCES_MI, EMPTY_FILTERS, SORT_LABEL, venueLabel,
  type Filters, type Orientation, type SizeBucket, type SortKey,
} from "./browseData";
import {
  Btn, CheckMark, CheckRow, FilterChip, PopoverFooter, RadioMark, ToggleTag, countLabel, menuItemCn, popoverCn,
} from "./primitives";

/** How many spaces a draft would show; the footer buttons say it before applying. */
export type CountWith = (f: Filters) => number;

/* ---------- campaign (single select) ---------- */

export function CampaignChip({ campaigns, value, onChange, disabled }: {
  campaigns: Campaign[];
  value: Campaign | null;
  onChange: (id: number | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pick = (id: number | null) => { onChange(id); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterChip set={!!value} disabled={disabled}>{value ? value.name : "Campaign"}</FilterChip>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn(popoverCn, "w-[280px]")}>
        <div role="menu" aria-label="Campaign" className="flex max-h-[360px] flex-col overflow-y-auto p-2">
          <button type="button" role="menuitemradio" aria-checked={!value} className={menuItemCn} onClick={() => pick(null)}>
            <span className="inline-flex items-center gap-2"><RadioMark on={!value} />No campaign</span>
          </button>
          {campaigns.map(c => (
            <button key={c.id} type="button" role="menuitemradio" aria-checked={value?.id === c.id} className={menuItemCn}
              onClick={() => pick(c.id)}>
              <span className="inline-flex items-center gap-2">
                <RadioMark on={value?.id === c.id} />
                <span className="flex flex-col">
                  <span>{c.name}</span>
                  <span className="text-xs leading-4 text-[#656972]">{fmtRange(c.start_date, c.end_date)}</span>
                </span>
              </span>
            </button>
          ))}
          <div className="mx-0 my-1 h-px bg-[#f1f2f7]" />
          <Link to="/campaigns/new" className={menuItemCn}><Plus aria-hidden />New campaign</Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- distance (single select, needs a location) ---------- */

export function DistanceChip({ value, onChange, hasLocation }: {
  value: number;
  onChange: (mi: number) => void;
  hasLocation: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!hasLocation) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* A disabled button gets no pointer events, so the wrapper carries the hover. */}
          <span tabIndex={0} className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3a47c2]">
            <FilterChip disabled>Distance</FilterChip>
          </span>
        </TooltipTrigger>
        <TooltipContent>Add a location to filter by distance</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FilterChip set>Within {value} mi</FilterChip>
      </PopoverTrigger>
      <PopoverContent align="start" className={popoverCn}>
        <div role="menu" aria-label="Distance" className="flex flex-col p-2">
          {DISTANCES_MI.map(mi => (
            <button key={mi} type="button" role="menuitemradio" aria-checked={value === mi} className={menuItemCn}
              onClick={() => { onChange(mi); setOpen(false); }}>
              <span className="inline-flex items-center gap-2"><RadioMark on={value === mi} />Within {mi} mi</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ---------- venue type (multi select with footer) ---------- */

export function VenueTypeChip({ filters, onApply, countWith, venueCounts }: {
  filters: Filters;
  onApply: (f: Filters) => void;
  countWith: CountWith;
  /** Spaces per venue type in the results, with every other filter applied. */
  venueCounts: Map<string, number>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(filters.venueTypes);
  const toggle = (v: string) => setDraft(d => (d.includes(v) ? d.filter(x => x !== v) : [...d, v]));
  const types = [...venueCounts.keys()].sort((a, b) => (venueCounts.get(b) ?? 0) - (venueCounts.get(a) ?? 0));
  const set = filters.venueTypes;
  const label = set.length === 1 ? venueLabel(set[0]) : "Venue type";

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (o) setDraft(filters.venueTypes); }}>
      <PopoverTrigger asChild>
        <FilterChip set={set.length > 0} count={set.length}>{label}</FilterChip>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn(popoverCn, "w-[280px]")}>
        <div role="menu" aria-label="Venue type" className="flex max-h-[320px] flex-col overflow-y-auto p-2">
          {types.length === 0 && <p className="px-3 py-2 text-sm text-[#656972]">No venue types in these results.</p>}
          {types.map(v => (
            <button key={v} type="button" role="menuitemcheckbox" aria-checked={draft.includes(v)} className={menuItemCn}
              onClick={() => toggle(v)}>
              <span className="inline-flex items-center gap-2"><CheckMark on={draft.includes(v)} />{venueLabel(v)}</span>
              <small className="ml-auto text-xs tabular-nums text-[#656972]">{venueCounts.get(v)}</small>
            </button>
          ))}
        </div>
        <PopoverFooter
          onClear={() => setDraft([])}
          clearDisabled={draft.length === 0}
          onApply={() => { onApply({ ...filters, venueTypes: draft }); setOpen(false); }}
          applyLabel={`Show ${countLabel(countWith({ ...filters, venueTypes: draft }))}`}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ---------- price a day (range with footer) ---------- */

const roundUp = (n: number) => Math.max(1, Math.ceil(n));

export function PriceChip({ filters, onApply, countWith, bounds, average }: {
  filters: Filters;
  onApply: (f: Filters) => void;
  countWith: CountWith;
  /** Lowest and highest day prices in the results. */
  bounds: [number, number];
  average: number | null;
}) {
  const [open, setOpen] = useState(false);
  const lo = Math.floor(bounds[0]);
  const hi = roundUp(bounds[1]);
  const [draft, setDraft] = useState<[number, number]>(filters.price ?? [lo, hi]);
  const set = filters.price;
  const isFull = draft[0] <= lo && draft[1] >= hi;

  const setEnd = (i: 0 | 1, raw: string) => {
    const n = Number(raw.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n)) return;
    setDraft(d => (i === 0 ? [Math.min(n, d[1]), d[1]] : [d[0], Math.max(n, d[0])]));
  };
  const next = isFull ? null : draft;

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (o) setDraft(filters.price ?? [lo, hi]); }}>
      <PopoverTrigger asChild>
        <FilterChip set={!!set}>{set ? `Price: $${set[0]} to $${set[1]}` : "Price"}</FilterChip>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn(popoverCn, "w-[300px]")}>
        <div role="dialog" aria-label="Price a day" className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium leading-5">Price a day</span>
            {average != null && <span className="text-xs leading-4 text-[#656972]">Average is ${average.toFixed(2)} a day</span>}
          </div>
          <SliderPrimitive.Root
            min={lo} max={hi} step={1} value={draft} minStepsBetweenThumbs={0}
            onValueChange={v => setDraft([v[0], v[1]])}
            className="relative mx-2 my-1 flex h-5 touch-none select-none items-center">
            <SliderPrimitive.Track className="relative h-1 grow rounded-sm bg-[#f1f2f7]">
              <SliderPrimitive.Range className="absolute h-full rounded-sm bg-[#3a47c2]" />
            </SliderPrimitive.Track>
            {[0, 1].map(i => (
              <SliderPrimitive.Thumb key={i} aria-label={i === 0 ? "Minimum price" : "Maximum price"}
                className="block h-4 w-4 rounded-full border-2 border-[#3a47c2] bg-white shadow-[0_1px_3px_rgba(26,29,37,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3a47c2]" />
            ))}
          </SliderPrimitive.Root>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            {([0, 1] as const).map(i => (
              <label key={i} className={cn("flex flex-col gap-1", i === 1 && "col-start-3")}>
                <span className="text-xs font-medium leading-4 text-[#4a4d56]">{i === 0 ? "Minimum" : "Maximum"}</span>
                <span className="flex h-10 items-center gap-1 rounded-lg border border-[#8f929d] px-3 text-sm focus-within:border-[#3a47c2] focus-within:shadow-[0_0_0_2px_#e3eafe]">
                  $<input inputMode="decimal" value={draft[i]} onChange={e => setEnd(i, e.target.value)}
                    className="w-full min-w-0 bg-transparent outline-none" />
                </span>
              </label>
            ))}
            <span className="col-start-2 row-start-1 mt-5 text-center text-xs text-[#656972]">to</span>
          </div>
        </div>
        <PopoverFooter
          onClear={() => setDraft([lo, hi])}
          clearDisabled={isFull}
          onApply={() => { onApply({ ...filters, price: next }); setOpen(false); }}
          applyLabel={`Show ${countLabel(countWith({ ...filters, price: next }))}`}
        />
      </PopoverContent>
    </Popover>
  );
}

/* ---------- sort ---------- */

export function SortMenu({ value, onChange, hasLocation }: {
  value: SortKey;
  onChange: (s: SortKey) => void;
  hasLocation: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="whitespace-nowrap text-xs leading-4 text-[#656972]">Sort by</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Btn size="sm" className="pr-2">{SORT_LABEL[value]}<ChevronDown aria-hidden /></Btn>
        </PopoverTrigger>
        <PopoverContent align="end" className={cn(popoverCn, "w-[260px]")}>
          <div className="px-4 pb-1 pt-3 text-xs font-medium leading-4 text-[#656972]">Sort by</div>
          <div role="menu" aria-label="Sort by" className="flex flex-col p-2">
            {(Object.keys(SORT_LABEL) as SortKey[]).map(k => {
              const disabled = k === "distance" && !hasLocation;
              return (
                <button key={k} type="button" role="menuitemradio" aria-checked={value === k} disabled={disabled}
                  className={cn(menuItemCn, value === k && "font-medium")}
                  onClick={() => { onChange(k); setOpen(false); }}>
                  <span className="flex flex-col">
                    <span>{SORT_LABEL[k]}</span>
                    {disabled && <span className="text-xs leading-4 text-[#8f929d]">Add a location to sort by distance</span>}
                  </span>
                  {value === k && <Check aria-hidden className="ml-auto !text-[#3a47c2]" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ---------- More filters sheet ---------- */

const SIZES: [SizeBucket, string][] = [["any", "Any"], ["lt40", "Under 40 in"], ["40to60", "40 to 60 in"], ["gt60", "Over 60 in"]];

function SheetGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-[#f1f2f7] p-6 [&+&]:border-t">
      <h3 className="m-0 text-base font-semibold leading-6">{title}</h3>
      {children}
    </section>
  );
}

const toggleIn = <T,>(list: T[], v: T, keepOne = true): T[] =>
  list.includes(v) ? (keepOne && list.length === 1 ? list : list.filter(x => x !== v)) : [...list, v];

export function MoreFiltersChip({ filters, onApply, countWith, distance, onDistance, hasLocation, activeCount }: {
  filters: Filters;
  onApply: (f: Filters) => void;
  countWith: CountWith;
  distance: number;
  onDistance: (mi: number) => void;
  hasLocation: boolean;
  activeCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);
  const [draftDistance, setDraftDistance] = useState(distance);
  const patch = (p: Partial<Filters>) => setDraft(d => ({ ...d, ...p }));

  return (
    <DialogPrimitive.Root open={open} onOpenChange={o => { setOpen(o); if (o) { setDraft(filters); setDraftDistance(distance); } }}>
      <DialogPrimitive.Trigger asChild>
        <FilterChip lead={<SlidersHorizontal aria-hidden />} noChevron set={activeCount > 0} count={activeCount}>
          More filters
        </FilterChip>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(26,29,37,0.4)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-[400px] flex-col bg-white text-[#1a1d25] shadow-[0_8px_24px_rgba(26,29,37,0.16)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
          <div className="flex items-center justify-between border-b border-[#e3e5ea] py-5 pl-6 pr-4">
            <DialogPrimitive.Title className="m-0 text-xl font-semibold leading-7 tracking-[-0.01em]">More filters</DialogPrimitive.Title>
            <DialogPrimitive.Close className="grid h-10 w-10 place-items-center rounded-lg text-[#4a4d56] hover:bg-[#f8faff] hover:text-[#1a1d25] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3a47c2]" aria-label="Close">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">Narrow the spaces by distance, screen and schedule.</DialogPrimitive.Description>
          <div className="flex flex-1 flex-col overflow-y-auto">
            {hasLocation && (
              <SheetGroup title="Distance">
                <div className="flex flex-wrap gap-2">
                  {DISTANCES_MI.map(mi => (
                    <ToggleTag key={mi} pressed={draftDistance === mi} onClick={() => setDraftDistance(mi)}>Within {mi} mi</ToggleTag>
                  ))}
                </div>
              </SheetGroup>
            )}
            <SheetGroup title="Screen size">
              <div className="flex flex-wrap gap-2">
                {SIZES.map(([k, l]) => <ToggleTag key={k} pressed={draft.size === k} onClick={() => patch({ size: k })}>{l}</ToggleTag>)}
              </div>
            </SheetGroup>
            <SheetGroup title="Orientation">
              <div className="flex flex-col gap-3">
                {(["landscape", "portrait"] as Orientation[]).map(o => (
                  <CheckRow key={o} checked={draft.orientations.includes(o)} onChange={() => patch({ orientations: toggleIn(draft.orientations, o) })}>
                    {o === "landscape" ? "Landscape" : "Portrait"}
                  </CheckRow>
                ))}
              </div>
            </SheetGroup>
            <SheetGroup title="Ad format">
              <div className="flex flex-col gap-3">
                {(["video", "image"] as const).map(f => (
                  <CheckRow key={f} checked={draft.formats.includes(f)} onChange={() => patch({ formats: toggleIn(draft.formats, f) })}>
                    {f === "video" ? "Video" : "Image"}
                  </CheckRow>
                ))}
              </div>
            </SheetGroup>
            <SheetGroup title="Days open">
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map(d => (
                  <ToggleTag key={d} pressed={draft.days.includes(d)} onClick={() => patch({ days: toggleIn(draft.days, d).sort() })}>
                    {DAY_LABEL[d]}
                  </ToggleTag>
                ))}
              </div>
            </SheetGroup>
          </div>
          <div className="flex items-center justify-between border-t border-[#e3e5ea] px-6 py-4">
            <Btn variant="tertiary" onClick={() => { setDraft(EMPTY_FILTERS); setDraftDistance(distance); }}>Clear all</Btn>
            <Btn variant="primary" onClick={() => { onApply(draft); if (hasLocation && draftDistance !== distance) onDistance(draftDistance); setOpen(false); }}>
              Show {countLabel(countWith(draft))}
            </Btn>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ---------- applied filters ---------- */

export function AppliedFilters({ filters, onChange }: { filters: Filters; onChange: (f: Filters) => void }) {
  const chips: { label: string; name: string; clear: Partial<Filters> }[] = [];
  if (filters.venueTypes.length) chips.push({ label: `Venue type: ${filters.venueTypes.map(venueLabel).join(", ")}`, name: "Venue type", clear: { venueTypes: [] } });
  if (filters.price) chips.push({ label: `$${filters.price[0]} to $${filters.price[1]} a day`, name: "Price", clear: { price: null } });
  if (filters.size !== "any") chips.push({ label: SIZES.find(s => s[0] === filters.size)![1], name: "Screen size", clear: { size: "any" } });
  if (filters.orientations.length < 2) chips.push({ label: filters.orientations[0] === "landscape" ? "Landscape" : "Portrait", name: "Orientation", clear: { orientations: EMPTY_FILTERS.orientations } });
  if (filters.formats.length < 2) chips.push({ label: filters.formats[0] === "video" ? "Video ads" : "Image ads", name: "Ad format", clear: { formats: EMPTY_FILTERS.formats } });
  if (filters.days.length < 7) chips.push({ label: `Open ${filters.days.map(d => DAY_LABEL[d]).join(", ")}`, name: "Days open", clear: { days: ALL_DAYS } });
  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map(c => (
        <span key={c.name} className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-full border border-[#cad6fe] bg-[#f2f5ff] pl-3 pr-1 text-xs leading-4 text-[#3a47c2]">
          {c.label}
          <button type="button" aria-label={`Remove ${c.name} filter`} onClick={() => onChange({ ...filters, ...c.clear })}
            className="grid h-5 w-5 place-items-center rounded-full hover:bg-[#e3eafe] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3a47c2]">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <Btn variant="link" className="ml-1 text-sm" onClick={() => onChange(EMPTY_FILTERS)}>Clear all</Btn>
    </div>
  );
}
