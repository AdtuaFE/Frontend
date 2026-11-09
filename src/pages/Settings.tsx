import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { GeneralTab } from "@/components/settings/GeneralTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { SecurityTab } from "@/components/settings/SecurityTab";
import { PlansBillingTab } from "@/components/settings/PlansBillingTab";
import { useAuth } from "@/context/AuthContext";

const TABS = [
  { key: "general", label: "General" },
  { key: "notifications", label: "Notifications" },
  { key: "security", label: "Security" },
  { key: "plans", label: "Plans and billing" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  if (!user) return null;

  const param = searchParams.get("tab");
  const tab: Tab = TABS.some(t => t.key === param) ? (param as Tab) : "general";

  return (
    <AppLayout activeNav="settings">
      <div className="mx-auto flex w-full max-w-[1164px] flex-col gap-6">
        <h1 className="min-h-10 text-2xl font-semibold text-[#1a1d25]">Settings</h1>
        <div role="tablist" aria-label="Settings" className="flex gap-6 overflow-x-auto border-b-[0.8px] border-[#e6e7ec]">
          {TABS.map(t => {
            const on = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={on}
                aria-controls="settings-panel"
                onClick={() => setSearchParams({ tab: t.key })}
                className={`-mb-[0.8px] shrink-0 border-b-[1.2px] px-0.5 pb-3 text-sm leading-5 transition-colors ${
                  on ? "border-[#3a47c2] font-semibold text-[#3a47c2]" : "border-transparent font-medium text-[#656972] hover:text-[#1a1d25]"
                }`}>
                {t.label}
              </button>
            );
          })}
        </div>
        <div id="settings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="px-0 pt-2 md:px-10">
          {tab === "general" && <GeneralTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "security" && <SecurityTab />}
          {tab === "plans" && <PlansBillingTab />}
        </div>
      </div>
    </AppLayout>
  );
}
