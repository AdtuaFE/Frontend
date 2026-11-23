// Small display pieces shared by the screen detail, review request and request sent pages.

import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ImageIcon, Minus, OctagonAlert, Plus, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Badge({ tone, children }: { tone: "success" | "warning" | "neutral"; children: ReactNode }) {
  return (
    <span className={cn(
      "inline-flex h-5 items-center whitespace-nowrap rounded px-2 text-xs font-medium leading-4",
      tone === "success" && "bg-[#edfaf0] text-[#016d36]",
      tone === "warning" && "bg-[#fef4e8] text-[#7c5003]",
      tone === "neutral" && "bg-[#f1f2f7] text-[#4a4d56]",
    )}>
      {children}
    </span>
  );
}

/** "Available all 14 days" / "Open 10 of 14 days" for the days the screen plays. */
export function AvailabilityBadge({ open, total }: { open: number; total: number }) {
  if (total === 0) return null;
  if (open === 0) return <Badge tone="warning">Not open on these dates</Badge>;
  if (open === total) return <Badge tone="success">Available all {total} day{total === 1 ? "" : "s"}</Badge>;
  return <Badge tone="neutral">Open {open} of {total} days</Badge>;
}

/** The warning or critical callout used for shortfalls and full days. */
export function Callout({ tone, title, children, actions }: {
  tone: "warn" | "crit";
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const Icon = tone === "crit" ? OctagonAlert : TriangleAlert;
  return (
    <div role={tone === "crit" ? "alert" : "status"}
      className={cn("grid grid-cols-[16px_minmax(0,1fr)] gap-2 rounded-lg p-3", tone === "crit" ? "bg-[#fef3f1]" : "bg-[#fef4e8]")}>
      <Icon aria-hidden className={cn("mt-0.5 h-4 w-4", tone === "crit" ? "text-[#aa0f16]" : "text-[#7c5003]")} />
      <div className="min-w-0">
        <b className="block text-sm font-medium leading-5 text-[#1a1d25]">{title}</b>
        {children && <div className="mt-1 text-xs leading-4 text-[#4a4d56] [&_p]:m-0">{children}</div>}
        {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Label / amount rows, amounts right-aligned. `total` makes the first row the heading-size total. */
export function KeyValues({ rows, total }: { rows: [ReactNode, ReactNode, string?][]; total?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 text-sm leading-5 text-[#4a4d56]">
      {rows.map(([k, v, cls], i) => (
        <Fragment key={i}>
          <span className={cn(total && i === 0 && "text-base font-semibold leading-6 text-[#1a1d25]", cls)}>{k}</span>
          <span className={cn("text-right tabular-nums text-[#1a1d25]", total && i === 0 && "text-base font-semibold leading-6", cls)}>{v}</span>
        </Fragment>
      ))}
    </div>
  );
}

export function Stepper({ value, min = 1, max, onChange, label }: {
  value: number;
  min?: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <span className="inline-flex h-8 items-center overflow-hidden rounded-lg border border-[#d2d4d9] bg-white" role="group" aria-label={label}>
      <button type="button" aria-label="Fewer plays" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}
        className="grid h-[30px] w-8 place-items-center text-[#4a4d56] hover:bg-[#f8faff] disabled:text-[#8f929d] disabled:hover:bg-transparent">
        <Minus className="h-4 w-4" />
      </button>
      <input aria-label={label} inputMode="numeric" value={value}
        onChange={e => { const n = Number(e.target.value.replace(/\D/g, "")); if (n) onChange(Math.min(max, Math.max(min, n))); }}
        className="w-10 bg-transparent text-center text-sm font-medium tabular-nums text-[#1a1d25] outline-none" />
      <button type="button" aria-label="More plays" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}
        className="grid h-[30px] w-8 place-items-center text-[#4a4d56] hover:bg-[#f8faff] disabled:text-[#8f929d] disabled:hover:bg-transparent">
        <Plus className="h-4 w-4" />
      </button>
    </span>
  );
}

export function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm leading-5 text-[#656972]">
      {items.map((it, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight aria-hidden className="h-4 w-4" strokeWidth={1.5} />}
          {it.to ? (
            <Link to={it.to} className="text-[#656972] no-underline hover:text-[#1a1d25] hover:underline hover:underline-offset-[3px]">{it.label}</Link>
          ) : (
            <span aria-current="page" className="font-medium text-[#1a1d25]">{it.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

/** Thumbnail, name and a line under it. */
export function ScreenCell({ image, name, sub }: { image?: string | null; name: string; sub?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-9 w-12 shrink-0 place-items-center overflow-hidden rounded bg-[#f1f2f7] text-[#8f929d]">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <ImageIcon aria-hidden className="h-4 w-4" />}
      </div>
      <div className="min-w-0">
        <b className="block truncate text-sm font-medium leading-5 text-[#1a1d25]">{name}</b>
        {sub && <span className="mt-0.5 block truncate text-xs leading-4 text-[#656972]">{sub}</span>}
      </div>
    </div>
  );
}

export const cardCn = "rounded-xl border border-[#e3e5ea] bg-white";
export const hrCn = "m-0 h-0 shrink-0 border-0 border-t border-[#e3e5ea]";
