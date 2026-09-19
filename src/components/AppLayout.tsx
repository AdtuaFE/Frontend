import { useState, type ReactNode } from "react";
import {
  House, Compass, Megaphone, MonitorCheck, Store, FileCheck, ChartSpline,
  Search, Settings, Bell, PanelLeftOpen, PanelLeftClose, ChevronDown, X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ProfileModal } from "@/components/ProfileModal";
import logo from "@/assets/adtua-logo.svg";

export type NavKey = "home" | "browse" | "spaces" | "campaigns" | "marketplace" | "bookings" | "analytics";

type Props = {
  children: ReactNode;
  activeNav: NavKey;
  noPadding?: boolean;
  rightSlot?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
};

type NavItem = { key: NavKey; label: string; icon: typeof House; to?: string };

const ADVERTISER_ITEMS: NavItem[] = [
  { key: "browse", label: "Browse Spaces", icon: Compass, to: "/browse" },
  { key: "campaigns", label: "Campaigns", icon: Megaphone, to: "/campaigns" },
];
const BROADCASTER_ITEMS: NavItem[] = [
  { key: "spaces", label: "My Spaces", icon: MonitorCheck, to: "/spaces" },
  { key: "marketplace", label: "Marketplace", icon: Store, to: "/campaigns/marketplace" },
];
const HOME_ITEM: NavItem = { key: "home", label: "Dashboard", icon: House, to: "/dashboard" };
const TAIL_ITEMS: NavItem[] = [
  { key: "bookings", label: "Bookings", icon: FileCheck, to: "/bookings" },
  { key: "analytics", label: "Analytics", icon: ChartSpline },
];

function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <div
      className="bg-[rgba(255,127,17,0.1)] rounded-full shrink-0 flex items-center justify-center text-[#ff7f11] font-medium"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
}

export function AppLayout({
  children, activeNav, noPadding, rightSlot, searchValue, onSearchChange, searchPlaceholder,
}: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [openGroups, setOpenGroups] = useState({ advertiser: true, broadcaster: true });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;
  const isDual = isAdvertiser && isBroadcaster;

  const initials =
    [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "U";
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Your account";

  const activeKey: NavKey =
    activeNav === "campaigns" && pathname.startsWith("/campaigns/marketplace") ? "marketplace" : activeNav;

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    navigate("/signin");
  };

  const renderItem = (item: NavItem, indent = false) => {
    const Icon = item.icon;
    const active = activeKey === item.key;
    return (
      <button
        key={item.key + item.label}
        onClick={() => item.to && navigate(item.to)}
        disabled={!item.to}
        title={collapsed ? item.label : undefined}
        className={`w-full flex items-center gap-2.5 py-2 rounded-lg text-sm transition-colors ${
          collapsed ? "justify-center px-0" : indent ? "pl-9 pr-3" : "px-3"
        } ${
          active
            ? "bg-[rgba(255,127,17,0.1)] text-[#ff7f11] font-semibold"
            : "text-[#767676] hover:bg-[#f9f9f9] hover:text-[#4a5565] disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-default"
        }`}>
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
      </button>
    );
  };

  const renderGroup = (id: "advertiser" | "broadcaster", label: string, items: NavItem[]) => (
    <div key={id} className="w-full">
      {!collapsed && (
        <button
          onClick={() => setOpenGroups(g => ({ ...g, [id]: !g[id] }))}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#9c9c9c] uppercase tracking-wide">
          {label}
          <ChevronDown className={`h-4 w-4 transition-transform ${openGroups[id] ? "" : "-rotate-90"}`} />
        </button>
      )}
      {(collapsed || openGroups[id]) && (
        <div className="flex flex-col gap-1">{items.map(i => renderItem(i, !collapsed))}</div>
      )}
    </div>
  );

  return (
    <>
      <div className="h-screen bg-white flex overflow-hidden">
        {/* SIDE NAV */}
        <aside
          className={`${collapsed ? "w-[64px]" : "w-[240px]"} shrink-0 border-r border-[#e8e8e8] bg-white h-full flex flex-col justify-between overflow-hidden transition-[width] duration-200`}>
          <div className="flex flex-col w-full min-h-0">
            <div className={`border-b border-[#e8e8e8] flex items-center h-14 shrink-0 ${collapsed ? "justify-center px-0" : "justify-between px-5"}`}>
              {!collapsed && (
                <button onClick={() => navigate("/dashboard")} className="hover:opacity-75 transition-opacity">
                  <img src={logo} alt="Adtua" className="h-7 w-auto" />
                </button>
              )}
              <button
                onClick={() => setCollapsed(c => !c)}
                className="p-1 rounded-md text-[#4a5565] hover:bg-[#f9f9f9] transition-colors"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
            </div>

            <nav className={`flex flex-col gap-2 pt-5 overflow-y-auto ${collapsed ? "px-2" : "px-4"}`}>
              {renderItem(HOME_ITEM)}
              {isDual ? (
                <>
                  {renderGroup("advertiser", "Advertiser", ADVERTISER_ITEMS)}
                  {renderGroup("broadcaster", "Broadcaster", BROADCASTER_ITEMS)}
                </>
              ) : (
                (isBroadcaster ? BROADCASTER_ITEMS : ADVERTISER_ITEMS).map(i => renderItem(i))
              )}
              {TAIL_ITEMS.map(i => renderItem(i))}
            </nav>
          </div>

          <div className="flex flex-col gap-4 w-full shrink-0">
            {!collapsed && !bannerDismissed && (
              <div className="px-4">
                <div
                  className="flex flex-col gap-3 p-4 rounded-xl text-white"
                  style={{ backgroundImage: "linear-gradient(162.6deg, #ff7f11 8.5%, #f0740a 45.8%, #ff7f11 91.5%)" }}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-[13px] font-semibold leading-5">Upgrade to Premium</p>
                      <button onClick={() => setBannerDismissed(true)} className="shrink-0 hover:opacity-75" title="Dismiss">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs leading-[18px]">Choose your space, control your timing, double your reach.</p>
                  </div>
                  <button className="bg-white text-[#ff7f11] text-[13px] font-semibold rounded-lg px-4 py-2 w-full hover:bg-[#fff4ea] transition-colors">
                    Upgrade Now
                  </button>
                </div>
              </div>
            )}

            <div className={`border-t border-[#e8e8e8] ${collapsed ? "p-2" : "p-4"}`}>
              <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : "px-2"}`}>
                <button onClick={() => setProfileOpen(true)} className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-lg hover:opacity-80 transition-opacity" title="Profile">
                  <Avatar initials={initials} size={34} />
                  {!collapsed && (
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#4a5565] leading-5 truncate">{fullName}</p>
                      <p className="text-[10px] text-[#9c9c9c] truncate">Free Plan</p>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* TOP BAR */}
          <header className="h-14 border-b border-[#e8e8e8] shrink-0 px-5 flex items-center justify-between gap-4 bg-white">
            <div className={`flex items-center gap-2 border border-[#e8e8e8] rounded-lg px-3 py-2 w-full max-w-[360px] ${onSearchChange ? "" : "opacity-50"}`}>
              <Search className="h-4 w-4 text-[#9c9c9c] shrink-0" />
              <input
                value={searchValue ?? ""}
                onChange={e => onSearchChange?.(e.target.value)}
                disabled={!onSearchChange}
                placeholder={searchPlaceholder ?? "Search campaigns, spaces, analytics"}
                className="w-full bg-transparent text-sm leading-none outline-none text-[#4a5565] placeholder:text-[#9c9c9c] disabled:cursor-default"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {rightSlot}
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-md text-[#4a5565] hover:bg-[#f9f9f9] transition-colors" title="Settings" onClick={() => setProfileOpen(true)}>
                  <Settings className="h-[18px] w-[18px]" />
                </button>
                <button className="p-2 rounded-md text-[#4a5565] hover:bg-[#f9f9f9] transition-colors" title="Notifications">
                  <Bell className="h-[18px] w-[18px]" />
                </button>
              </div>
              <div className="relative group">
                <button className="block rounded-full hover:ring-2 hover:ring-[#ff7f11] transition-all" title="Your profile">
                  <Avatar initials={initials} size={34} />
                </button>
                {/* pt-1 bridges the gap between avatar and menu so hover doesn't break */}
                <div className="absolute top-full right-0 pt-1 hidden group-hover:block z-50">
                  <div className="bg-white border border-[#e8e8e8] rounded-lg shadow-lg py-1 min-w-[160px]">
                    <button
                      onClick={() => setProfileOpen(true)}
                      className="w-full px-4 py-2 text-sm text-left text-[#4a5565] hover:bg-[#f9f9f9] transition-colors">
                      Profile
                    </button>
                    <div className="border-t border-[#e8e8e8] mx-3 my-1" />
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-sm text-left text-[#9c9c9c] hover:bg-[#f9f9f9] hover:text-[#4a5565] transition-colors">
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className={noPadding ? "flex-1 overflow-hidden" : "flex-1 p-6 overflow-auto"}>
            {children}
          </main>
        </div>
      </div>

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
