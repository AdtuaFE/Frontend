import { forwardRef, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Archive, Check, ChevronLeft, Clock, Inbox, Info, Pause, Pencil, Play, CalendarClock, type LucideProps,
} from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CampaignStatus, RowStatus } from "./campaignData";

/* ---------- badges ---------- */

type Tone = "green" | "neutral" | "indigo" | "amber" | "red";

const TONE: Record<Tone, string> = {
  green: "bg-[#edfaf0] text-[#016d36]",
  neutral: "bg-[#f1f2f7] text-[#4a4d56]",
  indigo: "bg-[#f2f5ff] text-[#3a47c2]",
  amber: "bg-[#fef4e8] text-[#7c5003]",
  red: "bg-[#fef3f1] text-[#aa0f16]",
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
  completed: { tone: "indigo", icon: Check, label: "Completed" },
  archived: { tone: "neutral", icon: Archive, label: "Archived" },
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const b = CAMPAIGN_BADGE[status] ?? CAMPAIGN_BADGE.draft;
  return <Badge tone={b.tone} icon={b.icon}>{b.label}</Badge>;
}

const ROW_BADGE: Record<RowStatus, { tone: Tone; icon: ComponentType<LucideProps>; label: string }> = {
  not_approved: { tone: "red", icon: Info, label: "Not approved" },
  new_offer: { tone: "indigo", icon: Inbox, label: "New offer" },
  pending: { tone: "amber", icon: Clock, label: "Pending" },
  playing: { tone: "green", icon: Play, label: "Playing" },
  scheduled: { tone: "indigo", icon: CalendarClock, label: "Scheduled" },
  done: { tone: "neutral", icon: Check, label: "Finished" },
};

export function RowStatusBadge({ status }: { status: RowStatus }) {
  const b = ROW_BADGE[status];
  return <Badge tone={b.tone} icon={b.icon}>{b.label}</Badge>;
}

/* ---------- alerts ---------- */

export function Alert({ tone, title, children, action }: {
  tone: "error" | "warning";
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "grid w-full grid-cols-[20px_minmax(0,1fr)] gap-3 rounded-xl border-[0.8px] bg-[#fef3f1] p-4",
        tone === "error" ? "border-[#c92324]" : "border-[#976205]",
      )}>
      <Info className={cn("mt-0.5 size-5", tone === "error" ? "text-[#aa0f16]" : "text-[#7c5003]")} aria-hidden="true" />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 text-[#1a1d25]">
          <p className="text-base font-semibold leading-6">{title}</p>
          <p className="text-sm leading-5">{children}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

/* ---------- layout pieces ---------- */

export function Breadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      <Link to="/campaigns" className="text-[#656972] transition-colors hover:text-[#3a47c2]">Campaigns</Link>
      <ChevronLeft className="size-3.5 text-[#656972]" aria-hidden="true" />
      <span className="truncate font-medium text-[#1a1d25]">{current}</span>
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
        variant === "primary" && "border-transparent bg-[#3a47c2] text-white hover:bg-[#2f3a9e]",
        variant === "secondary" && "border-[#d2d4d9] bg-white text-[#1a1d25] hover:bg-[#f8faff] hover:text-[#1a1d25]",
        variant === "danger" && "border-transparent bg-[#c92324] text-white hover:bg-[#a81d1e]",
        className,
      )}
      {...props}
    />
  ),
);
CampaignButton.displayName = "CampaignButton";
