// Small pieces styled from the booking-flow designs: buttons, chips, checkbox and radio marks,
// and the popover shell with its footer.

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3a47c2]";

type BtnVariant = "primary" | "secondary" | "tertiary" | "link";
const btnVariant: Record<BtnVariant, string> = {
  primary: "bg-[#3a47c2] text-white hover:bg-[#2e399f] active:bg-[#232c7b] disabled:bg-[#cad6fe]",
  secondary: "border-[#d2d4d9] bg-white text-[#1a1d25] hover:bg-[#f8faff] active:bg-[#f1f2f7] disabled:border-[#e3e5ea] disabled:text-[#8f929d]",
  tertiary: "text-[#3a47c2] hover:bg-[#f2f5ff] active:bg-[#e3eafe] disabled:text-[#8f929d] disabled:bg-transparent",
  link: "!h-auto !p-0 border-0 text-[#3a47c2] hover:text-[#2e399f] hover:underline underline-offset-[3px]",
};

export const Btn = forwardRef<HTMLButtonElement, ComponentProps<"button"> & { variant?: BtnVariant; size?: "sm" | "md" }>(
  ({ variant = "secondary", size = "md", className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-transparent font-medium transition-colors disabled:cursor-not-allowed",
        size === "sm" ? "h-8 gap-1 px-3 text-xs leading-4 [&_svg]:h-4 [&_svg]:w-4" : "h-10 gap-2 px-4 text-sm leading-5 [&_svg]:h-5 [&_svg]:w-5",
        btnVariant[variant],
        focusRing,
        className,
      )}
      {...props}
    />
  ),
);
Btn.displayName = "Btn";

/**
 * A filter chip. Its label never changes; when set it turns indigo and shows the value or a count.
 * Radix passes `data-state="open"` through, which outlines it and flips the chevron.
 */
export const FilterChip = forwardRef<
  HTMLButtonElement,
  ComponentProps<"button"> & { set?: boolean; count?: number; lead?: ReactNode; noChevron?: boolean }
>(({ set, count, lead, noChevron, children, className, type = "button", ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    aria-pressed={set || undefined}
    className={cn(
      "group inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border pr-2 text-xs leading-4 transition-colors",
      lead ? "pl-2" : "pl-3",
      set
        ? "border-[#cad6fe] bg-[#f2f5ff] text-[#3a47c2]"
        : "border-[#d2d4d9] bg-white text-[#4a4d56] hover:bg-[#f8faff] hover:text-[#1a1d25] data-[state=open]:border-[#3a47c2] data-[state=open]:text-[#1a1d25]",
      "disabled:cursor-not-allowed disabled:border-[#e3e5ea] disabled:bg-white disabled:text-[#8f929d]",
      "[&_svg]:h-4 [&_svg]:w-4",
      focusRing,
      className,
    )}
    {...props}>
    {lead}
    {children}
    {count != null && count > 1 && (
      <span className="ml-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-[#3a47c2] px-1 text-xs font-medium tabular-nums text-white">
        {count}
      </span>
    )}
    {!noChevron && <ChevronDown aria-hidden className="transition-transform group-data-[state=open]:rotate-180" />}
  </button>
));
FilterChip.displayName = "FilterChip";

/** The pill used inside the More filters sheet: pressed shows a check and turns indigo. */
export function ToggleTag({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full border text-sm leading-5 transition-colors [&_svg]:h-4 [&_svg]:w-4",
        pressed
          ? "border-[#cad6fe] bg-[#f2f5ff] pl-2 pr-4 text-[#3a47c2]"
          : "border-[#d2d4d9] bg-white px-4 text-[#4a4d56] hover:bg-[#f8faff] hover:text-[#1a1d25]",
        focusRing,
      )}>
      {pressed && <Check aria-hidden />}
      {children}
    </button>
  );
}

export function CheckMark({ on }: { on: boolean }) {
  return (
    <i
      aria-hidden
      className={cn(
        "grid h-4 w-4 shrink-0 place-items-center rounded border",
        on ? "border-[#3a47c2] bg-[#3a47c2] text-white" : "border-[#8f929d] bg-white",
      )}>
      {on && <Check className="h-3 w-3" strokeWidth={3} />}
    </i>
  );
}

export function RadioMark({ on }: { on: boolean }) {
  return (
    <i
      aria-hidden
      className={cn(
        "grid h-4 w-4 shrink-0 place-items-center rounded-full border bg-white",
        on ? "border-[#3a47c2]" : "border-[#8f929d]",
      )}>
      {on && <span className="h-2 w-2 rounded-full bg-[#3a47c2]" />}
    </i>
  );
}

/** A checkbox row: real input, design marks. */
export function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm leading-5 text-[#1a1d25]">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="rounded peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#3a47c2]">
        <CheckMark on={checked} />
      </span>
      {children}
    </label>
  );
}

/** Menu rows inside a popover. */
export const menuItemCn = cn(
  "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm leading-5 text-[#1a1d25] hover:bg-[#f8faff]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#3a47c2]",
  "disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[#8f929d]",
  "[&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 [&>svg]:text-[#656972]",
);

export const popoverCn =
  "w-auto min-w-[240px] overflow-hidden rounded-xl border border-[#e3e5ea] bg-white p-0 text-[#1a1d25] shadow-[0_8px_24px_rgba(26,29,37,0.16)]";

export function PopoverFooter({ onClear, onApply, applyLabel, clearDisabled }: {
  onClear: () => void;
  onApply: () => void;
  applyLabel: string;
  clearDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-[#e3e5ea] px-4 py-3">
      <Btn variant="tertiary" size="sm" onClick={onClear} disabled={clearDisabled}>Clear</Btn>
      <Btn variant="primary" size="sm" onClick={onApply}>{applyLabel}</Btn>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <i aria-hidden className={cn("block rounded bg-[#f1f2f7]", className)} />;
}

export const countLabel = (n: number, noun = "space") => `${n.toLocaleString()} ${noun}${n === 1 ? "" : "s"}`;
