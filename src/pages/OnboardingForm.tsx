import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { CheckCircle2, MapPin, Megaphone, MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { loadWizardData } from "@/pages/Onboarding";
import { toast } from "sonner";
import {
  validateProfileSection,
  validateAdvertiserSection,
  validateBroadcasterSection,
  type FieldErrors,
} from "@/utils/validators";

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

const inputCn = "h-12 rounded-xl border-[#d7dce3] bg-white text-base shadow-none focus-visible:ring-[#ff8a00]";
const inputErrCn = "h-12 rounded-xl border-red-400 bg-white text-base shadow-none focus-visible:ring-red-400";
const sectionCn = "rounded-[28px] border border-[#e5e8ed] bg-white p-6 sm:p-8 shadow-[0_24px_60px_rgba(15,23,42,0.06)]";

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="mt-1 text-xs text-red-500">{msg}</p> : null;

const OnboardingForm = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const wizard = loadWizardData();

  const defaultRole: Role =
    user?.roles.includes("broadcaster") && user?.roles.includes("advertiser")
      ? "both"
      : user?.roles.includes("broadcaster")
        ? "broadcaster"
        : "advertiser";

  const [formData, setFormData] = useState<FormData>({
    firstName: user?.first_name ?? "",
    lastName: user?.last_name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    role: defaultRole,
    orgName: user?.org_name ?? "",
    advertiserNotes: "",
    campaignName: "",
    objective: wizard.businessTypes.length > 0
      ? `Business type: ${[...wizard.businessTypes, wizard.customBusiness].filter(Boolean).join(", ")}`
      : "",
    totalBudget: wizard.adBudget ?? "",
    budgetPeriod: "",
    campaignLocation: "",
    adType: "",
    startDate: "",
    endDate: "",
    companyName: user?.company_name ?? "",
    addressLine1: user?.address_line1 ?? "",
    addressLine2: "",
    city: user?.city ?? "",
    region: user?.region ?? "",
    country: user?.country ?? "",
    postalCode: user?.postal_code ?? "",
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
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Tracks which API calls already succeeded so retries don't create duplicate records.
  const [completedSteps, setCompletedSteps] = useState<Set<"profile" | "campaign" | "space">>(new Set());

  const showAdvertiserFields = formData.role === "advertiser" || formData.role === "both";
  const showBroadcasterFields = formData.role === "broadcaster" || formData.role === "both";

  const interestsPreview = useMemo(
    () => formData.interests.split(",").map((i) => i.trim()).filter(Boolean),
    [formData.interests],
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value as Role }));
    setFieldErrors({});
    setIsSubmitted(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Run all three section validators and merge errors before touching the network
    const errors: FieldErrors = {
      ...validateProfileSection({ firstName: formData.firstName, lastName: formData.lastName }),
      ...(showAdvertiserFields ? validateAdvertiserSection({
        campaignName: formData.campaignName,
        totalBudget: formData.totalBudget,
        startDate: formData.startDate,
        endDate: formData.endDate,
      }) : {}),
      ...(showBroadcasterFields ? validateBroadcasterSection({
        spaceName: formData.spaceName,
        spaceType: formData.spaceType,
        displayType: formData.displayType,
        city: formData.city,
        country: formData.country,
        cpm: formData.cpm,
      }) : {}),
    };

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors)[0];
      document.getElementById(firstKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1 — profile patch (idempotent; still skip if already done)
      if (!completedSteps.has("profile")) {
        const profilePatch: Record<string, unknown> = {
          first_name: formData.firstName,
          last_name: formData.lastName || undefined,
          phone: formData.phone || undefined,
        };
        if (showAdvertiserFields) {
          profilePatch.org_name = formData.orgName || undefined;
          profilePatch.notes = formData.advertiserNotes || undefined;
        }
        if (showBroadcasterFields) {
          profilePatch.company_name = formData.companyName || undefined;
          profilePatch.address_line1 = formData.addressLine1 || undefined;
          profilePatch.address_line2 = formData.addressLine2 || undefined;
          profilePatch.city = formData.city || undefined;
          profilePatch.region = formData.region || undefined;
          profilePatch.country = formData.country || undefined;
          profilePatch.postal_code = formData.postalCode || undefined;
        }
        await api.patch("/api/user/profile", profilePatch);
        setCompletedSteps((prev) => new Set([...prev, "profile"]));
      }

      // Step 2 — campaign (POST; skip on retry to avoid duplicates)
      if (showAdvertiserFields && formData.campaignName && !completedSteps.has("campaign")) {
        await api.post("/api/campaigns", {
          name: formData.campaignName,
          objective: formData.objective || undefined,
          total_budget: formData.totalBudget ? Number(formData.totalBudget) : undefined,
          budget_period: formData.budgetPeriod || undefined,
          location: formData.campaignLocation || undefined,
          ad_type: formData.adType || undefined,
          start_date: formData.startDate || undefined,
          end_date: formData.endDate || undefined,
          status: "draft",
        });
        setCompletedSteps((prev) => new Set([...prev, "campaign"]));
      }

      // Step 3 — space (POST; skip on retry to avoid duplicates)
      if (showBroadcasterFields && !completedSteps.has("space")) {
        const interestsList = formData.interests.split(",").map((i) => i.trim()).filter(Boolean);
        await api.post("/api/spaces", {
          name: formData.spaceName,
          description: formData.spaceDescription || undefined,
          space_type: formData.spaceType,
          display_type: formData.displayType,
          city: formData.city,
          country: formData.country,
          cpm: Number(formData.cpm),
          width_px: formData.widthPx ? Number(formData.widthPx) : undefined,
          height_px: formData.heightPx ? Number(formData.heightPx) : undefined,
          size_label: formData.sizeLabel || undefined,
          est_daily_impressions: formData.estDailyImpressions ? Number(formData.estDailyImpressions) : undefined,
          interests: interestsList.length > 0 ? interestsList : undefined,
          venue_type: wizard.venueType || undefined,
          address_line1: formData.addressLine1 || undefined,
          region: formData.region || undefined,
          postal_code: formData.postalCode || undefined,
        });
        setCompletedSteps((prev) => new Set([...prev, "space"]));
      }

      await refreshUser();
      setIsSubmitted(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong — fix any issues and resubmit");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#f6f8fb_28%,#eef3f8_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
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
                This form mirrors the backend data model for users, advertiser profiles, broadcaster profiles, campaigns, and spaces.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 backdrop-blur">
              <p className="text-sm font-semibold text-[#18181b]">What this collects</p>
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

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Section 1 — Basic profile */}
          <section className={sectionCn}>
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c26600]">Section 1</p>
              <h2 className="mt-2 text-2xl font-semibold text-[#18181b]">Basic profile</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6368]">These fields match the shared user account data in the backend.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name <span className="text-red-500">*</span></Label>
                <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange}
                  placeholder="Honey" className={fieldErrors.firstName ? inputErrCn : inputCn} />
                <FieldError msg={fieldErrors.firstName} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange}
                  placeholder="Patel" className={fieldErrors.lastName ? inputErrCn : inputCn} />
                <FieldError msg={fieldErrors.lastName} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange}
                  placeholder="name@company.com" className={inputCn} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange}
                  placeholder="+1 (555) 000-0000" className={inputCn} />
              </div>
            </div>
            <div className="mt-8 space-y-4">
              <Label>How will you use Adtua?</Label>
              <RadioGroup value={formData.role} onValueChange={handleRoleChange} className="grid gap-4 md:grid-cols-3">
                {[
                  { value: "advertiser", title: "Advertiser", desc: "I want to create campaigns and book ad space." },
                  { value: "broadcaster", title: "Broadcaster", desc: "I want to list spaces and manage incoming bookings." },
                  { value: "both", title: "Both", desc: "I need advertiser and broadcaster onboarding in one pass." },
                ].map((opt) => (
                  <Label key={opt.value} htmlFor={`role-${opt.value}`}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#d7dce3] p-4 transition hover:border-[#ffb25c] hover:bg-[#fffaf3]">
                    <RadioGroupItem value={opt.value} id={`role-${opt.value}`} className="mt-1" />
                    <div>
                      <p className="font-medium text-[#18181b]">{opt.title}</p>
                      <p className="mt-1 text-sm text-[#5f6368]">{opt.desc}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </section>

          {/* Section 2 — Advertiser */}
          {showAdvertiserFields && (
            <section className={sectionCn}>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c26600]">Section 2</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#18181b]">Advertiser setup</h2>
                <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                  Based on <code>advertiser_profile</code> and <code>campaigns</code> in the backend schema.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input id="orgName" name="orgName" value={formData.orgName} onChange={handleChange}
                    placeholder="Adtua Coffee Co." className={inputCn} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign name</Label>
                  <Input id="campaignName" name="campaignName" value={formData.campaignName} onChange={handleChange}
                    placeholder="Spring launch" className={inputCn} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="objective">Campaign objective</Label>
                  <Textarea id="objective" name="objective" value={formData.objective} onChange={handleChange}
                    placeholder="What are you trying to achieve with this campaign?"
                    className="min-h-[120px] rounded-2xl border-[#d7dce3] px-4 py-3 text-base focus-visible:ring-[#ff8a00]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalBudget">Total budget</Label>
                  <Input id="totalBudget" name="totalBudget" type="number" min="0" value={formData.totalBudget}
                    onChange={handleChange} placeholder="2500" className={fieldErrors.totalBudget ? inputErrCn : inputCn} />
                  <FieldError msg={fieldErrors.totalBudget} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budgetPeriod">Budget period</Label>
                  <Input id="budgetPeriod" name="budgetPeriod" value={formData.budgetPeriod} onChange={handleChange}
                    placeholder="monthly" className={inputCn} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignLocation">Target location</Label>
                  <Input id="campaignLocation" name="campaignLocation" value={formData.campaignLocation}
                    onChange={handleChange} placeholder="Indianapolis, IN" className={inputCn} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adType">Ad type</Label>
                  <Input id="adType" name="adType" value={formData.adType} onChange={handleChange}
                    placeholder="image, video, static billboard" className={inputCn} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" name="startDate" type="date" value={formData.startDate}
                    onChange={handleChange} className={fieldErrors.startDate ? inputErrCn : inputCn} />
                  <FieldError msg={fieldErrors.startDate} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End date</Label>
                  <Input id="endDate" name="endDate" type="date" value={formData.endDate}
                    onChange={handleChange} className={fieldErrors.endDate ? inputErrCn : inputCn} />
                  <FieldError msg={fieldErrors.endDate} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="advertiserNotes">Notes</Label>
                  <Textarea id="advertiserNotes" name="advertiserNotes" value={formData.advertiserNotes}
                    onChange={handleChange}
                    placeholder="Anything else we should know before building your advertiser dashboard?"
                    className="min-h-[120px] rounded-2xl border-[#d7dce3] px-4 py-3 text-base focus-visible:ring-[#ff8a00]" />
                </div>
              </div>
            </section>
          )}

          {/* Section 3 — Broadcaster */}
          {showBroadcasterFields && (
            <section className={sectionCn}>
              <div className="mb-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#c26600]">Section 3</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#18181b]">Broadcaster setup</h2>
                <p className="mt-2 text-sm leading-6 text-[#5f6368]">
                  Based on <code>broadcaster_profile</code> and <code>spaces</code> in the backend schema.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name</Label>
                  <Input id="companyName" name="companyName" value={formData.companyName} onChange={handleChange}
                    placeholder="Adtua Media Group" className={inputCn} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spaceName">Space name <span className="text-red-500">*</span></Label>
                  <Input id="spaceName" name="spaceName" value={formData.spaceName} onChange={handleChange}
                    placeholder="Downtown kiosk screen" className={fieldErrors.spaceName ? inputErrCn : inputCn} />
                  <FieldError msg={fieldErrors.spaceName} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="spaceDescription">Space description</Label>
                  <Textarea id="spaceDescription" name="spaceDescription" value={formData.spaceDescription}
                    onChange={handleChange}
                    placeholder="Describe where the ad space lives, who sees it, and why it performs well."
                    className="min-h-[120px] rounded-2xl border-[#d7dce3] px-4 py-3 text-base focus-visible:ring-[#ff8a00]" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine1">Address line 1</Label>
                  <Input id="addressLine1" name="addressLine1" value={formData.addressLine1} onChange={handleChange}
                    placeholder="123 Main Street" className={inputCn} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="addressLine2">Address line 2</Label>
                  <Input id="addressLine2" name="addressLine2" value={formData.addressLine2} onChange={handleChange}
                    placeholder="Suite, floor, or landmark" className={inputCn} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                  <Input id="city" name="city" value={formData.city} onChange={handleChange}
                    placeholder="Indianapolis" className={fieldErrors.city ? inputErrCn : inputCn} />
                  <FieldError msg={fieldErrors.city} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">State / region</Label>
                  <Input id="region" name="region" value={formData.region} onChange={handleChange}
                    placeholder="Indiana" className={inputCn} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                  <Input id="country" name="country" value={formData.country} onChange={handleChange}
                    placeholder="US" className={fieldErrors.country ? inputErrCn : inputCn} />
                  <FieldError msg={fieldErrors.country} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal code</Label>
                  <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange}
                    placeholder="46204" className={inputCn} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="interests">Audience interests</Label>
                  <Input id="interests" name="interests" value={formData.interests} onChange={handleChange}
                    placeholder="coffee, students, commuters, fitness" className={inputCn} />
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
                  <Label htmlFor="spaceType">Space type <span className="text-red-500">*</span></Label>
                  <Input id="spaceType" name="spaceType" value={formData.spaceType} onChange={handleChange}
                    placeholder="digital_screen, billboard, transit_shelter"
                    className={fieldErrors.spaceType ? inputErrCn : inputCn} />
                  <FieldError msg={fieldErrors.spaceType} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayType">Display type <span className="text-red-500">*</span></Label>
                  <Input id="displayType" name="displayType" value={formData.displayType} onChange={handleChange}
                    placeholder="digital_led, static, backlit"
                    className={fieldErrors.displayType ? inputErrCn : inputCn} />
                  <FieldError msg={fieldErrors.displayType} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="widthPx">Width (px)</Label>
                  <Input id="widthPx" name="widthPx" type="number" min="0" value={formData.widthPx}
                    onChange={handleChange} placeholder="1920" className={inputCn} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heightPx">Height (px)</Label>
                  <Input id="heightPx" name="heightPx" type="number" min="0" value={formData.heightPx}
                    onChange={handleChange} placeholder="1080" className={inputCn} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sizeLabel">Size label</Label>
                  <Input id="sizeLabel" name="sizeLabel" value={formData.sizeLabel} onChange={handleChange}
                    placeholder="16:9 landscape" className={inputCn} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpm">CPM <span className="text-red-500">*</span></Label>
                  <Input id="cpm" name="cpm" type="number" min="0" value={formData.cpm}
                    onChange={handleChange} placeholder="18"
                    className={fieldErrors.cpm ? inputErrCn : inputCn} />
                  <FieldError msg={fieldErrors.cpm} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estDailyImpressions">Estimated daily impressions</Label>
                  <Input id="estDailyImpressions" name="estDailyImpressions" type="number" min="0"
                    value={formData.estDailyImpressions} onChange={handleChange}
                    placeholder="2400" className={inputCn} />
                </div>
              </div>
            </section>
          )}

          {/* Submit */}
          <section className={sectionCn}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#18181b]">Submit intake form</h2>
                {completedSteps.size > 0 && !isSubmitted && (
                  <p className="mt-1 text-sm text-amber-600">
                    {completedSteps.size} step{completedSteps.size > 1 ? "s" : ""} saved. Fix the error above and resubmit to finish.
                  </p>
                )}
              </div>
              <Button type="submit" disabled={isSubmitting}
                className="h-12 rounded-xl bg-[#ff8a00] px-8 text-base font-medium text-white hover:bg-[#e77700]">
                {isSubmitting
                  ? "Saving…"
                  : completedSteps.size > 0 && !isSubmitted
                    ? "Retry submission"
                    : "Submit intake form"}
              </Button>
            </div>

            {isSubmitted && (
              <div className="mt-6 rounded-2xl border border-[#bfe3cb] bg-[#f2fbf5] p-5 text-[#1f5d38]">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="font-semibold">Data saved successfully</p>
                    <p className="mt-1 text-sm leading-6">
                      Your profile and setup have been saved. Redirecting to your dashboard…
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
