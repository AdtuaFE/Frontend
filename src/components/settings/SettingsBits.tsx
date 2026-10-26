import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One settings block: what it is on the left, the controls on the right. */
export function Section({ title, description, soon, children }: {
  title: string;
  description?: ReactNode;
  /** Nothing in this block can be saved yet. */
  soon?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-x-[88px] gap-y-6 border-b-[0.8px] border-[#e3e5ea] py-8 last:border-b-0 md:grid-cols-[248px_minmax(0,1fr)]">
      <div className="flex flex-col">
        <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold leading-6 text-[#4a4d56]">
          {title}
          {soon && <SoonTag />}
        </h2>
        {description && <p className="pt-1 text-[13px] leading-[18px] text-[#656972]">{description}</p>}
      </div>
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
    </section>
  );
}

export function SoonTag() {
  return <Pill tone="neutral">Coming soon</Pill>;
}

const PILL: Record<"green" | "neutral" | "indigo" | "red", string> = {
  green: "bg-[#edfaf0] text-[#016d36]",
  neutral: "bg-[#f1f2f7] text-[#4a4d56]",
  indigo: "bg-[#f2f5ff] text-[#3a47c2]",
  red: "bg-[#fef3f1] text-[#aa0f16]",
};

export function Pill({ tone, icon, children }: { tone: keyof typeof PILL; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-md px-2 text-[13px] font-medium leading-[18px]", PILL[tone])}>
      {icon}
      {children}
    </span>
  );
}

export function Field({ label, htmlFor, hint, error, children, className }: {
  label: string; htmlFor?: string; hint?: string; error?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-[#4a5565]">{label}</label>
      <div className="flex w-full flex-col gap-1.5">
        {children}
        {error ? <p className="text-xs leading-5 text-red-500">{error}</p> : hint ? <p className="text-xs leading-5 text-[#656972]">{hint}</p> : null}
      </div>
    </div>
  );
}

/** A bordered list of rows, as the roles, sign-in methods and devices blocks use. */
export function RowList({ children }: { children: ReactNode }) {
  return <div className="flex flex-col divide-y-[0.8px] divide-[#e3e5ea] overflow-hidden rounded-xl border-[0.8px] border-[#e3e5ea] bg-white">{children}</div>;
}

export function Row({ icon, title, sub, right }: { icon?: ReactNode; title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {icon && <span className="flex size-5 shrink-0 items-center justify-center text-[#4a4d56]">{icon}</span>}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium leading-5 text-[#1a1d25]">{title}</span>
        {sub && <span className="text-[13px] leading-[18px] text-[#656972]">{sub}</span>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-3">{right}</div>}
    </div>
  );
}
