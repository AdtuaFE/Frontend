import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { ProfileModal } from "@/components/ProfileModal";
import { PlansBilling } from "@/components/settings/PlansBilling";
import { useAuth } from "@/context/AuthContext";

const TABS = ["general", "security", "plans"] as const;
type Tab = (typeof TABS)[number];

export default function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profileTab, setProfileTab] = useState<"details" | "password" | null>(null);

  if (!user) return null;

  const param = searchParams.get("tab");
  const tab: Tab = TABS.includes(param as Tab) ? (param as Tab) : "general";
  const isAdvertiser = user.roles.includes("advertiser");
  const isBroadcaster = user.roles.includes("broadcaster");

  return (
    <AppLayout activeNav="settings">
      <div className="max-w-3xl mx-auto py-4">
        <Tabs value={tab} onValueChange={v => setSearchParams({ tab: v })}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="plans">Plans and Billing</TabsTrigger>
          </TabsList>

          {/* General/Security weren't in the ready-for-dev Figma set, so they reuse the existing profile dialog. */}
          <TabsContent value="general" className="mt-8">
            <div className="border border-[#e8e8e8] rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-[#4a5565]">{user.first_name} {user.last_name}</p>
                <p className="text-sm text-[#767676]">{user.email}</p>
              </div>
              <Button variant="outline" onClick={() => setProfileTab("details")}>Edit profile</Button>
            </div>
          </TabsContent>

          <TabsContent value="security" className="mt-8">
            <div className="border border-[#e8e8e8] rounded-2xl p-6 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-[#4a5565]">Password</p>
                <p className="text-sm text-[#767676]">Change the password used to sign in</p>
              </div>
              <Button variant="outline" onClick={() => setProfileTab("password")}>Change password</Button>
            </div>
          </TabsContent>

          <TabsContent value="plans" className="mt-8 space-y-16">
            {isAdvertiser && <PlansBilling role="advertiser" />}
            {isAdvertiser && isBroadcaster && <div className="border-t border-[#e8e8e8]" />}
            {isBroadcaster && <PlansBilling role="broadcaster" />}
          </TabsContent>
        </Tabs>
      </div>

      <ProfileModal
        open={profileTab !== null}
        onOpenChange={open => !open && setProfileTab(null)}
        defaultTab={profileTab ?? "details"}
      />
    </AppLayout>
  );
}
