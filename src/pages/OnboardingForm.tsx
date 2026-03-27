import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { CheckCircle2, MapPin, Megaphone, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

type Role = "advertiser" | "broadcaster" | "both";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  orgName: string;
  advertiserNotes: string;
  campaignName: string;
  objective: string;
  totalBudget: string;
  budgetPeriod: string;
  campaignLocation: string;
  adType: string;
  startDate: string;
  endDate: string;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  country: string;
  postalCode: string;
  spaceName: string;
  spaceDescription: string;
  interests: string;
  spaceType: string;
  displayType: string;
  widthPx: string;
  heightPx: string;
  sizeLabel: string;
  cpm: string;
  estDailyImpressions: string;
};

const initialFormData: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "advertiser",
  orgName: "",
  advertiserNotes: "",
  campaignName: "",
  objective: "",
  totalBudget: "",
  budgetPeriod: "",
  campaignLocation: "",
  adType: "",
  startDate: "",
  endDate: "",
  companyName: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  country: "",
  postalCode: "",
  spaceName: "",
  spaceDescription: "",
  interests: "",
  spaceType: "",
  displayType: "",
  widthPx: "",
  heightPx: "",
  sizeLabel: "",
  cpm: "",
  estDailyImpressions: "",
};

const inputClassName =
  "h-12 rounded-xl border-[#d7dce3] bg-white text-base shadow-none focus-visible:ring-[#ff8a00]";

const sectionClassName =
  "rounded-[28px] border border-[#e5e8ed] bg-white p-6 sm:p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]";

const OnboardingForm = () => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const showAdvertiserFields =
    formData.role === "advertiser" || formData.role === "both";
  const showBroadcasterFields =
    formData.role === "broadcaster" || formData.role === "both";

  const interestsPreview = useMemo(
    () =>
      formData.interests
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [formData.interests],
  );

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value as Role }));
    setIsSubmitted(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log("Onboarding captured locally:", formData);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f8fb_28%,#eef3f8_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 overflow-hidden rounded-[32px] border border-[#f1d7b5] bg-[#fff7ed] shadow-[0_30px_80px_rgba(255,138,0,0.12)]">
          <div className="grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#c26600]">
                Adtua Intake Form
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-[#18181b] sm:text-5xl">
                Tell us what you need so we can shape the right dashboard.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5f6368]">
                This form mirrors the backend data model for users, advertiser
                profiles, broadcaster profiles, campaigns, and spaces. For now,
                submission stays local and shows a success message only.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 backdrop-blur">
              <p className="text-sm font-semibold text-[#18181b]">
                What this collects
              </p>
              <div className="mt-5 grid gap-4 text-sm text-[#4b5563]">
                <div className="flex items-start gap-3">
                  <Megaphone className="mt-0.5 h-5 w-5 text-[#ff8a00]" />
                  <span>Advertiser details like organization, campaign objective, budget, and ad setup.</span>
                </div>
                <div className="flex items-start gap-3">
                  <MonitorSmartphone className="mt-0.5 h-5 w-5 text-[#ff8a00]" />
                  <span>Broadcaster details like company, address, space type, sizing, CPM, and impressions.</span>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-[#ff8a00]" />
                  <span>Location data aligned with the profiles, spaces, and campaign records in the backend schema.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className={sectionClassName}>
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c26600]">
                Section 1
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#18181b]">
                Basic profile
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                These fields match the shared user account data in the backend.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Honey" className={inputClassName} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Sharma" className={inputClassName} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="name@company.com" className={inputClassName} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+1 (555) 000-0000" className={inputClassName} />
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <Label>How will you use Adtua?</Label>
              <RadioGroup value={formData.role} onValueChange={handleRoleChange} className="grid gap-4 md:grid-cols-3">
                <Label htmlFor="role-advertiser" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d7dce3] p-4 transition hover:border-[#ffb25c] hover:bg-[#fffaf3]">
                  <RadioGroupItem value="advertiser" id="role-advertiser" className="mt-1" />
                  <div>
                    <p className="font-medium text-[#18181b]">Advertiser</p>
                    <p className="mt-1 text-sm text-[#5f6368]">I want to create campaigns and book ad space.</p>
                  </div>
                </Label>

                <Label htmlFor="role-broadcaster" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d7dce3] p-4 transition hover:border-[#ffb25c] hover:bg-[#fffaf3]">
                  <RadioGroupItem value="broadcaster" id="role-broadcaster" className="mt-1" />
                  <div>
                    <p className="font-medium text-[#18181b]">Broadcaster</p>
                    <p className="mt-1 text-sm text-[#5f6368]">I want to list spaces and manage incoming bookings.</p>
                  </div>
                </Label>

                <Label htmlFor="role-both" className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d7dce3] p-4 transition hover:border-[#ffb25c] hover:bg-[#fffaf3]">
                  <RadioGroupItem value="both" id="role-both" className="mt-1" />
                  <div>
                    <p className="font-medium text-[#18181b]">Both</p>
                    <p className="mt-1 text-sm text-[#5f6368]">I need advertiser and broadcaster onboarding in one pass.</p>
                  </div>
                </Label>
              </RadioGroup>
            </div>
          </section>

          {showAdvertiserFields && (
            <section className={sectionClassName}>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c26600]">Section 2</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#18181b]">Advertiser setup</h2>
                <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                  Based on `advertiser_profile` and `campaigns` in the backend schema.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input id="orgName" name="orgName" value={formData.orgName} onChange={handleChange} placeholder="Adtua Coffee Co." className={inputClassName} required={showAdvertiserFields} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign name</Label>
                  <Input id="campaignName" name="campaignName" value={formData.campaignName} onChange={handleChange} placeholder="Spring launch" className={inputClassName} required={showAdvertiserFields} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="objective">Campaign objective</Label>
                  <Textarea id="objective" name="objective" value={formData.objective} onChange={handleChange} placeholder="What are you trying to achieve with this campaign?" className="min-h-[120px] rounded-2xl border-[#d7dce3] px-4 py-3 text-base focus-visible:ring-[#ff8a00]" required={showAdvertiserFields} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalBudget">Total budget</Label>
                  <Input id="totalBudget" name="totalBudget" type="number" min="0" value={formData.totalBudget} onChange={handleChange} placeholder="2500" className={inputClassName} required={showAdvertiserFields} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetPeriod">Budget period</Label>
                  <Input id="budgetPeriod" name="budgetPeriod" value={formData.budgetPeriod} onChange={handleChange} placeholder="monthly" className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaignLocation">Target location</Label>
                  <Input id="campaignLocation" name="campaignLocation" value={formData.campaignLocation} onChange={handleChange} placeholder="Indianapolis, IN" className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adType">Ad type</Label>
                  <Input id="adType" name="adType" value={formData.adType} onChange={handleChange} placeholder="image, video, static billboard" className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleChange} className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleChange} className={inputClassName} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="advertiserNotes">Notes</Label>
                  <Textarea id="advertiserNotes" name="advertiserNotes" value={formData.advertiserNotes} onChange={handleChange} placeholder="Anything else we should know before building your advertiser dashboard?" className="min-h-[120px] rounded-2xl border-[#d7dce3] px-4 py-3 text-base focus-visible:ring-[#ff8a00]" />
                </div>
              </div>
            </section>
          )}

          {showBroadcasterFields && (
            <section className={sectionClassName}>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c26600]">Section 3</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#18181b]">Broadcaster setup</h2>
                <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                  Based on `broadcaster_profile` and `spaces` in the backend schema.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Adtua Media Group" className={inputClassName} required={showBroadcasterFields} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spaceName">Space name</Label>
                  <Input id="spaceName" name="spaceName" value={formData.spaceName} onChange={handleChange} placeholder="Downtown kiosk screen" className={inputClassName} required={showBroadcasterFields} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="spaceDescription">Space description</Label>
                  <Textarea id="spaceDescription" name="spaceDescription" value={formData.spaceDescription} onChange={handleChange} placeholder="Describe where the ad space lives, who sees it, and why it performs well." className="min-h-[120px] rounded-2xl border-[#d7dce3] px-4 py-3 text-base focus-visible:ring-[#ff8a00]" required={showBroadcasterFields} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine1">Address line 1</Label>
                  <Input id="addressLine1" name="addressLine1" value={formData.addressLine1} onChange={handleChange} placeholder="123 Main Street" className={inputClassName} required={showBroadcasterFields} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine2">Address line 2</Label>
                  <Input id="addressLine2" name="addressLine2" value={formData.addressLine2} onChange={handleChange} placeholder="Suite, floor, or landmark" className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="Indianapolis" className={inputClassName} required={showBroadcasterFields} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">State / region</Label>
                  <Input id="region" name="region" value={formData.region} onChange={handleChange} placeholder="Indiana" className={inputClassName} required={showBroadcasterFields} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" value={formData.country} onChange={handleChange} placeholder="United States" className={inputClassName} required={showBroadcasterFields} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal code</Label>
                  <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder="46204" className={inputClassName} />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="interests">Audience interests</Label>
                  <Input id="interests" name="interests" value={formData.interests} onChange={handleChange} placeholder="coffee, students, commuters, fitness" className={inputClassName} />
                  {interestsPreview.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {interestsPreview.map((interest) => (
                        <span key={interest} className="rounded-full bg-[#fff3e0] px-3 py-1 text-xs font-medium text-[#9a4f00]">
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spaceType">Space type</Label>
                  <Input id="spaceType" name="spaceType" value={formData.spaceType} onChange={handleChange} placeholder="retail, outdoor, transit" className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayType">Display type</Label>
                  <Input id="displayType" name="displayType" value={formData.displayType} onChange={handleChange} placeholder="digital screen, poster, billboard" className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="widthPx">Width (px)</Label>
                  <Input id="widthPx" name="widthPx" type="number" min="0" value={formData.widthPx} onChange={handleChange} placeholder="1920" className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heightPx">Height (px)</Label>
                  <Input id="heightPx" name="heightPx" type="number" min="0" value={formData.heightPx} onChange={handleChange} placeholder="1080" className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sizeLabel">Size label</Label>
                  <Input id="sizeLabel" name="sizeLabel" value={formData.sizeLabel} onChange={handleChange} placeholder="16:9 landscape" className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpm">CPM</Label>
                  <Input id="cpm" name="cpm" type="number" min="0" value={formData.cpm} onChange={handleChange} placeholder="18" className={inputClassName} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estDailyImpressions">Estimated daily impressions</Label>
                  <Input id="estDailyImpressions" name="estDailyImpressions" type="number" min="0" value={formData.estDailyImpressions} onChange={handleChange} placeholder="2400" className={inputClassName} />
                </div>
              </div>
            </section>
          )}

          <section className={sectionClassName}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#18181b]">Submit intake form</h2>
              </div>

              <Button type="submit" className="h-12 rounded-xl bg-[#ff8a00] px-8 text-base font-medium text-white hover:bg-[#e77700]">
                Submit intake form
              </Button>
            </div>

            {isSubmitted && (
              <div className="mt-6 rounded-2xl border border-[#bfe3cb] bg-[#f2fbf5] p-5 text-[#1f5d38]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-semibold">Data stored successfully</p>
                    <p className="mt-1 text-sm leading-6">
                      Your intake information has been captured in the UI. The next step will be connecting this form to the backend endpoints and database writes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </form>
      </div>
    </div>
  );
};

export default OnboardingForm;
