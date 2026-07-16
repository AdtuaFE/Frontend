import { useState, type ReactNode } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ProfileModal } from "@/components/ProfileModal";
import { CreateCampaignModal } from "@/components/CreateCampaignModal";

export type NavKey = "home" | "browse" | "campaigns" | "bookings" | "analytics";

type Props = {
  children: ReactNode;
  activeNav: NavKey;
  noPadding?: boolean;
  rightSlot?: ReactNode;
};

export function AppLayout({ children, activeNav, noPadding, rightSlot }: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;

  const initials =
    [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "U";

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    navigate("/signin");
  };

  const navCls = (key: NavKey) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      activeNav === key
        ? "bg-[#FFE5CC] text-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    }`;

  return (
    <>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* TOP NAV */}
        <header className="h-14 border-b shrink-0 px-6 flex items-center gap-1">
          {/* Logo */}
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xl font-bold mr-5 hover:opacity-75 transition-opacity">
            adtua
          </button>

          {/* Primary nav */}
          <nav className="flex items-center gap-0.5">
            <button onClick={() => navigate("/browse")} className={navCls("browse")}>
              Browse
            </button>

            {/* Campaigns with hover dropdown */}
            <div className="relative group">
              <button className={`${navCls("campaigns")} flex items-center gap-1`}>
                Campaigns
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
              {/* pt-1 bridges the gap between button and dropdown so hover doesn't break */}
              <div className="absolute top-full left-0 pt-1 hidden group-hover:block z-50">
                <div className="bg-background border rounded-lg shadow-lg py-1 min-w-[190px]">
                  <button
                    onClick={() => navigate("/campaigns")}
                    className="w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors">
                    Browse campaigns
                  </button>
                  {isAdvertiser && (
                    <>
                      <div className="border-t mx-3 my-1" />
                      <button
                        onClick={() => setCampaignModalOpen(true)}
                        className="w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors flex items-center gap-2 font-medium text-[#ff8a00]">
                        <Plus className="h-4 w-4" />
                        New Campaign
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button onClick={() => navigate("/bookings")} className={navCls("bookings")}>
              Bookings
            </button>
          </nav>

          <div className="flex-1" />

          {/* Right side */}
          {rightSlot && <div className="mr-3">{rightSlot}</div>}

          {/* Avatar with dropdown */}
          <div className="relative group">
            <button
              className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a00]"
              title="Your profile">
              <Avatar className="h-8 w-8 hover:ring-2 hover:ring-[#ff8a00] transition-all">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </button>
            <div className="absolute top-full right-0 pt-1 hidden group-hover:block z-50">
              <div className="bg-background border rounded-lg shadow-lg py-1 min-w-[160px]">
                <button
                  onClick={() => setProfileOpen(true)}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors">
                  Profile
                </button>
                <div className="border-t mx-3 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm text-left hover:bg-accent transition-colors text-muted-foreground">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={noPadding ? "flex-1 overflow-hidden" : "flex-1 p-8 overflow-auto"}>
          {children}
        </main>
      </div>

      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
      <CreateCampaignModal open={campaignModalOpen} onOpenChange={setCampaignModalOpen} />
    </>
  );
}
