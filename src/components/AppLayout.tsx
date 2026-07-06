import { useState, type ReactNode } from "react";
import { Home, Square, Video, BarChart3, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ProfileModal } from "@/components/ProfileModal";

export type NavKey = "home" | "browse" | "campaigns" | "analytics";

const NAV_ITEMS: { key: NavKey; icon: typeof Home; label: string; path?: string }[] = [
  { key: "home",      icon: Home,     label: "Home",         path: "/dashboard" },
  { key: "browse",    icon: Square,   label: "Browse",       path: "/browse" },
  { key: "campaigns", icon: Video,    label: "Campaigns",    path: "/campaigns" },
  { key: "analytics", icon: BarChart3, label: "Analytics" },
];

type Props = {
  children: ReactNode;
  activeNav: NavKey;
};

export function AppLayout({ children, activeNav }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;

  const initials =
    [user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join("").toUpperCase() || "U";

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  return (
    <>
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-0"} transition-all duration-300 bg-background border-r flex flex-col shrink-0 overflow-y-auto`}>
        {sidebarOpen && (
          <div className="flex-1 flex flex-col">
            <div className="p-6 flex items-center gap-3">
              <h1 className="text-2xl font-bold">adtua</h1>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-accent rounded-md">
                <Menu className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3">
              {NAV_ITEMS.filter(item => item.key !== "campaigns" || isBroadcaster).map((item) => (
                <button
                  key={item.key}
                  onClick={() => item.path && navigate(item.path)}
                  disabled={!item.path}
                  className={`w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-lg text-sm transition-colors
                    ${activeNav === item.key
                      ? "bg-[#FFE5CC] text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"}
                    ${!item.path ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="p-6 border-t space-y-3">
              <p className="text-sm text-muted-foreground">
                {user?.first_name} {user?.last_name}
              </p>
              <button
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground underline">
                Sign out
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b px-8 flex items-center justify-between shrink-0">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-accent rounded-md">
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setProfileOpen(true)}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a00]"
            title="Your profile">
            <Avatar className="h-10 w-10 hover:ring-2 hover:ring-[#ff8a00] transition-all">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </button>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>

    <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
