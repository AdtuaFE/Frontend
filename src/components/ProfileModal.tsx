import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, type User } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DetailsForm = {
  first_name: string;
  last_name: string;
  phone: string;
  org_name: string;
  company_name: string;
};

type PasswordForm = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

const inputCn = "h-10 rounded-lg border-[#d7dce3] bg-white text-sm shadow-none focus-visible:ring-[#ff8a00]";

const ROLE_COLORS: Record<string, string> = {
  advertiser: "bg-blue-100 text-blue-700",
  broadcaster: "bg-purple-100 text-purple-700",
  admin:       "bg-red-100 text-red-700",
};

function toDetailsForm(user: User): DetailsForm {
  return {
    first_name:   user.first_name ?? "",
    last_name:    user.last_name ?? "",
    phone:        user.phone ?? "",
    org_name:     user.org_name ?? "",
    company_name: user.company_name ?? "",
  };
}

export function ProfileModal({ open, onOpenChange }: Props) {
  const { user, refreshUser } = useAuth();

  const [details, setDetails] = useState<DetailsForm>(() =>
    user ? toDetailsForm(user) : { first_name: "", last_name: "", phone: "", org_name: "", company_name: "" }
  );
  const [passwords, setPasswords] = useState<PasswordForm>({
    current_password: "", new_password: "", confirm_password: "",
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (user) setDetails(toDetailsForm(user));
  }, [user?.id]);

  if (!user) return null;

  const handleDetailsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords(prev => ({ ...prev, [name]: value }));
    setPasswordError("");
  };

  const handleDetailsSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!details.first_name.trim()) { toast.error("First name is required"); return; }
    setSavingDetails(true);
    try {
      await api.patch("/api/user/profile", {
        first_name:   details.first_name.trim(),
        last_name:    details.last_name.trim() || undefined,
        phone:        details.phone.trim() || undefined,
        org_name:     details.org_name.trim() || undefined,
        company_name: details.company_name.trim() || undefined,
      });
      await refreshUser();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingDetails(false);
    }
  };

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwords.current_password) { setPasswordError("Enter your current password"); return; }
    if (passwords.new_password.length < 8) { setPasswordError("New password must be at least 8 characters"); return; }
    if (passwords.new_password !== passwords.confirm_password) { setPasswordError("Passwords don't match"); return; }
    setSavingPassword(true);
    try {
      await api.post("/api/user/change-password", {
        current_password: passwords.current_password,
        new_password:     passwords.new_password,
      });
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Your profile</DialogTitle>
        </DialogHeader>

        {/* Identity + roles */}
        <div className="border-b pb-4 space-y-2">
          <p className="font-semibold text-base">
            {user.first_name} {user.last_name}
          </p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {user.roles.map(role => (
              <span key={role}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_COLORS[role] ?? "bg-muted text-muted-foreground"}`}>
                {role}
              </span>
            ))}
          </div>
        </div>

        <Tabs defaultValue="details" className="mt-1">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="details">Personal details</TabsTrigger>
            <TabsTrigger value="password">Change password</TabsTrigger>
          </TabsList>

          {/* Personal details */}
          <TabsContent value="details" className="mt-4">
            <form onSubmit={handleDetailsSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="p-first_name">First name <span className="text-red-500">*</span></Label>
                  <Input id="p-first_name" name="first_name" value={details.first_name}
                    onChange={handleDetailsChange} className={inputCn} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-last_name">Last name</Label>
                  <Input id="p-last_name" name="last_name" value={details.last_name}
                    onChange={handleDetailsChange} className={inputCn} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-email">Email</Label>
                <Input id="p-email" value={user.email} readOnly
                  className="h-10 rounded-lg border-[#d7dce3] bg-muted text-sm shadow-none cursor-not-allowed" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-phone">Phone</Label>
                <Input id="p-phone" name="phone" value={details.phone}
                  onChange={handleDetailsChange} placeholder="+1 555 000 0000" className={inputCn} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-org_name">Organisation name</Label>
                <Input id="p-org_name" name="org_name" value={details.org_name}
                  onChange={handleDetailsChange} placeholder="Acme Inc." className={inputCn} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-company_name">Company name</Label>
                <Input id="p-company_name" name="company_name" value={details.company_name}
                  onChange={handleDetailsChange} placeholder="Trading / legal name" className={inputCn} />
              </div>

              <div className="flex justify-end pt-1">
                <Button type="submit" disabled={savingDetails}
                  className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
                  {savingDetails ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* Change password */}
          <TabsContent value="password" className="mt-4">
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-current_password">Current password</Label>
                <Input id="p-current_password" name="current_password" type="password"
                  value={passwords.current_password} onChange={handlePasswordChange}
                  autoComplete="current-password" className={inputCn} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-new_password">New password</Label>
                <Input id="p-new_password" name="new_password" type="password"
                  value={passwords.new_password} onChange={handlePasswordChange}
                  autoComplete="new-password" className={inputCn} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-confirm_password">Confirm new password</Label>
                <Input id="p-confirm_password" name="confirm_password" type="password"
                  value={passwords.confirm_password} onChange={handlePasswordChange}
                  autoComplete="new-password" className={inputCn} />
              </div>

              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}

              <div className="flex justify-end pt-1">
                <Button type="submit" disabled={savingPassword}
                  className="bg-[#ff8a00] text-white hover:bg-[#e77700]">
                  {savingPassword ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
