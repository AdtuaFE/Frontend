import { useState } from "react";
import { Home, Square, Video, BarChart3, Settings, Menu, CircleCheck, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { icon: Home, label: "Home", active: true },
    { icon: Square, label: "Browse", active: false },
    { icon: Video, label: "My Campaigns", active: false },
    { icon: BarChart3, label: "Analytics", active: false },
    { icon: Settings, label: "Settings", active: false },
  ];

  const checklistItems = [
    { title: "Complete Sign up", subtitle: "Enter your preferences", completed: true },
    { title: "Create a campaign", subtitle: "Learn how to create your first campaign", completed: false },
    { title: "Launch your first ad", subtitle: "Publish and start reaching your audience", completed: false },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 bg-background border-r flex flex-col`}
      >
        {sidebarOpen && (
          <div className="flex-1 flex flex-col">
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
              <h1 className="text-2xl font-bold">adtua</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-accent rounded-md"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  className={`w-full flex items-center gap-3 px-4 py-3 mb-1 rounded-lg text-sm transition-colors ${
                    item.active
                      ? "bg-[#FFE5CC] text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Footer */}
            <div className="p-6 border-t">
              <p className="text-sm text-muted-foreground">Broadcast your space</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-20 border-b px-8 flex items-center justify-between">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-accent rounded-md"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1" />
          <Avatar className="h-10 w-10">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </header>

        {/* Content */}
        <main className="flex-1 p-8 overflow-auto">
          {/* Onboarding Checklist */}
          <div className="max-w-6xl mx-auto mb-12">
            <h2 className="text-2xl font-bold mb-6">Onboarding checklist</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {checklistItems.map((item, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                      </div>
                      <div className="flex-shrink-0">
                        {item.completed ? (
                          <CircleCheck className="h-6 w-6 text-green-600" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Campaigns Section */}
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Campaigns</h2>
            
            {/* Empty State */}
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-muted-foreground text-lg mb-2">No campaigns yet.</p>
              <p className="text-muted-foreground text-sm mb-6">Create your first campaign to start reaching your audience.</p>
              <Button
                className="h-12 px-8 text-base font-medium rounded-lg"
                style={{ backgroundColor: "#FF8A00" }}
              >
                Create a campaign
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
