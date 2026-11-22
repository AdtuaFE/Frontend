import { forwardRef, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Archive, Bell, CalendarCheck, ChevronRight, CircleCheck, CircleX, Clock, OctagonAlert, Pause, Pencil, Play, TimerOff, TriangleAlert, type LucideProps,
} from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CampaignStatus, RowStatus } from "./campaignData";

/* ---------- badges ---------- */

type Tone = "green" | "neutral" | "indigo" | "amber" | "red";

const TONE: Record<Tone, string> = {
  green: "bg-surface-success text-text-success",
  neutral: "bg-surface-muted text-text-secondary",
  indigo: "bg-surface-brand-subtle text-text-brand",
  amber: "bg-surface-warning text-text-warning",
  red: "bg-surface-danger text-text-danger",
};

export function Badge({ tone, icon: Icon, children }: { tone: Tone; icon: ComponentType<LucideProps>; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-md px-2 text-[13px] font-medium leading-[18px]", TONE[tone])}>
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

const CAMPAIGN_BADGE: Record<CampaignStatus, { tone: Tone; icon: ComponentType<LucideProps>; label: string }> = {
  active: { tone: "green", icon: Play, label: "Active" },
  draft: { tone: "neutral", icon: Pencil, label: "Draft" },
  paused: { tone: "amber", icon: Pause, label: "Paused" },
  completed: { tone: "neutral", icon: CircleCheck, label: "Completed" },
  archived: { tone: "neutral", icon: Archive, label: "Archived" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const b = CAMPAIGN_BADGE[status] ?? CAMPAIGN_BADGE.draft;
  return <Badge tone={b.tone} icon={b.icon}>{b.label}</Badge>;
}

const ROW_BADGE: Record<RowStatus, { tone: Tone; icon: ComponentType<LucideProps>; label: string }> = {
  new_offer: { tone: "indigo", icon: Bell, label: "New offer" },
  pending: { tone: "amber", icon: Clock, label: "Waiting" },
  scheduled: { tone: "neutral", icon: CalendarCheck, label: "Scheduled" },
  playing: { tone: "green", icon: Play, label: "Playing" },
  done: { tone: "neutral", icon: CircleCheck, label: "Completed" },
  declined: { tone: "red", icon: CircleX, label: "Declined" },
  expired: { tone: "neutral", icon: TimerOff, label: "Expired" },
};

export function RowStatusBadge({ status }: { status: RowStatus }) {
  const b = ROW_BADGE[status];
  return <Badge tone={b.tone} icon={b.icon}>{b.label}</Badge>;
}

/* ---------- plain status text (no pill): colored icon and word ---------- */

const TEXT_TONE: Record<Tone, string> = {
  green: "text-text-success",
  neutral: "text-text-secondary",
  indigo: "text-text-brand",
  amber: "text-text-warning",
  red: "text-text-danger",
};

function StatusText({ tone, icon: Icon, size, children }: {
  tone: Tone; icon: ComponentType<LucideProps>; size: "md" | "sm"; children: ReactNode;
}) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 font-medium", size === "md" ? "text-sm" : "text-xs", TEXT_TONE[tone])}>
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

/** Campaign status as plain text: next to the title (14px) and in the campaigns list. */
export function CampaignStatusText({ status }: { status: CampaignStatus }) {
  const b = CAMPAIGN_BADGE[status] ?? CAMPAIGN_BADGE.draft;
  return <StatusText tone={b.tone} icon={b.icon} size="md">{b.label}</StatusText>;
}

/** Booking row status as plain text (12px). */
export function RowStatusText({ status }: { status: RowStatus }) {
  const b = ROW_BADGE[status];
  return <StatusText tone={b.tone} icon={b.icon} size="sm">{b.label}</StatusText>;
}

/* ---------- alerts ---------- */

export function Alert({ tone, title, children, action }: {
  tone: "error" | "warning";
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const Icon = tone === "error" ? OctagonAlert : TriangleAlert;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "grid w-full grid-cols-[20px_minmax(0,1fr)] gap-3 rounded-xl p-4",
        tone === "error" ? "bg-surface-danger" : "bg-surface-warning",
      )}>
      <Icon className={cn("mt-0.5 size-5", tone === "error" ? "text-text-danger" : "text-text-warning")} aria-hidden="true" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-text-primary">
          <p className="text-base font-semibold leading-6">{title}</p>
          <p className="text-sm leading-5">{children}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

/* ---------- layout pieces ---------- */

export function Breadcrumb({ current, parent }: { current: string; parent?: { label: string; to: string } }) {
  const sep = <ChevronRight className="size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />;
  const link = "truncate text-text-tertiary transition-colors hover:text-text-brand";
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      <Link to="/campaigns" className={link}>Campaigns</Link>
      {parent && (<>{sep}<Link to={parent.to} className={link}>{parent.label}</Link></>)}
      {sep}
      <span className="truncate font-medium text-text-primary">{current}</span>
    </nav>
  );
}

/** Buttons at the design's two sizes: 32px with a 16px icon, and 40px. Forwards its ref so menus can anchor to it. */
type CampaignButtonProps = Omit<ButtonProps, "variant" | "size"> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
};

export const CampaignButton = forwardRef<HTMLButtonElement, CampaignButtonProps>(
  ({ variant = "secondary", size = "sm", className, ...props }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant={variant === "secondary" ? "outline" : "default"}
      className={cn(
        "flex gap-1.5 rounded-lg border-[0.8px] font-medium shadow-none [&_svg]:size-4",
        size === "sm" ? "h-8 pl-[10.8px] pr-[12.8px] text-[13px]" : "h-10 pl-[14.8px] pr-[16.8px] text-sm",
        variant === "primary" && "border-transparent bg-text-brand text-white hover:bg-brand-hover",
        variant === "secondary" && "border-[#d2d4d9] bg-white text-text-primary hover:bg-surface-subtle hover:text-text-primary",
        variant === "danger" && "border-transparent bg-border-danger text-white hover:bg-[#a81d1e]",
        className,
      )}
      {...props}
    />
  ),
);
CampaignButton.displayName = "CampaignButton";
