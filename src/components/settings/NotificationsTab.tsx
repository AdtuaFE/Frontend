import { Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { Section } from "./SettingsBits";

type Item = { title: string; sub: string; email: boolean; inApp: boolean };

const ADVERTISER: Item[] = [
  { title: "Bookings", sub: "A broadcaster accepts, rejects or cancels a booking", email: true, inApp: true },
  { title: "Offers", sub: "A broadcaster sends an offer on one of your campaigns", email: true, inApp: true },
  { title: "Campaign updates", sub: "A campaign goes live, ends or needs new creative", email: true, inApp: true },
];
const BROADCASTER: Item[] = [
  { title: "Booking requests", sub: "New booking requests and cancellations from advertisers", email: true, inApp: true },
  { title: "Offers", sub: "An advertiser accepts or rejects an offer you sent", email: true, inApp: true },
  { title: "Payouts", sub: "A payout is sent or something blocks it", email: true, inApp: true },
];
const ACCOUNT: Item[] = [
  { title: "Messages", sub: "Someone replies in one of your conversations", email: false, inApp: true },
  { title: "Billing", sub: "Receipts, plan renewals and failed payments", email: true, inApp: true },
  { title: "Tips and product news", sub: "New features and occasional advice from the Adtua team", email: false, inApp: true },
];

const COLS = "grid grid-cols-[minmax(0,1fr)_80px_80px] items-center";

function Group({ label, items }: { label: string; items: Item[] }) {
  return (
    <div role="rowgroup">
      <div role="row" className={`${COLS} border-b-[0.8px] border-[#e3e5ea] pb-2 pt-5`}>
        <span role="rowheader" className="text-[13px] leading-[18px] text-[#4a4d56]">{label}</span>
      </div>
      {items.map(item => (
        <div key={`${label}-${item.title}`} role="row" className={`${COLS} border-b-[0.8px] border-[#e3e5ea] py-3`}>
          <span role="cell" className="flex flex-col">
            <span className="text-sm font-medium leading-5 text-[#1a1d25]">{item.title}</span>
            <span className="text-[13px] leading-[18px] text-[#656972]">{item.sub}</span>
          </span>
          <span role="cell"><Checkbox checked={item.email} disabled aria-label={`${item.title} by email`} className="data-[state=checked]:border-[#3a47c2] data-[state=checked]:bg-[#3a47c2]" /></span>
          <span role="cell"><Checkbox checked={item.inApp} disabled aria-label={`${item.title} in the app`} className="data-[state=checked]:border-[#3a47c2] data-[state=checked]:bg-[#3a47c2]" /></span>
        </div>
      ))}
    </div>
  );
}

/** Notification choices aren't stored anywhere yet, so the grid shows the defaults and can't be changed. */
export function NotificationsTab() {
  const { user } = useAuth();
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;

  return (
    <Section title="What we tell you about" soon
      description="Pick where each update shows up. In-app updates land in the bell at the top of the page.">
      <div role="table" aria-label="Notifications" className="w-full">
        <div role="row" className={`${COLS} border-b-[0.8px] border-[#e3e5ea] pb-3`}>
          <span role="columnheader" className="text-[13px] font-medium text-[#4a4d56]">Update</span>
          <span role="columnheader" className="text-[13px] font-medium text-[#4a4d56]">Email</span>
          <span role="columnheader" className="text-[13px] font-medium text-[#4a4d56]">In-app</span>
        </div>
        {isAdvertiser && <Group label="Advertiser" items={ADVERTISER} />}
        {isBroadcaster && <Group label="Broadcaster" items={BROADCASTER} />}
        <Group label="Account" items={ACCOUNT} />
        <div role="row" className={`${COLS} py-3`}>
          <span role="cell" className="flex flex-col">
            <span className="text-sm font-medium leading-5 text-[#1a1d25]">Security alerts</span>
            <span className="text-[13px] leading-[18px] text-[#656972]">New sign-ins, password changes and email changes</span>
          </span>
          <span role="cell" className="col-span-2 flex items-center gap-2 text-[13px] text-[#4a4d56]">
            <Lock className="size-4" aria-hidden="true" />Always on
          </span>
        </div>
      </div>
    </Section>
  );
}
