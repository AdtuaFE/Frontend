import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, ImageIcon, Megaphone, Monitor, Plus, Trash2, Upload } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CampaignButton } from "@/components/campaigns/CampaignBits";
import { useAuth, type User } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getPlanState, isPaid } from "@/lib/plans";
import { userRoles } from "@/lib/roles";
import { Field, Pill, Row, RowList, Section, SoonTag } from "./SettingsBits";
import { bareInputCn, boxCn } from "./settingsStyles";

/** "Eastern Time, Indianapolis" from the browser's time zone. */
function timeZoneLabel(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "long" })
    .formatToParts(new Date())
    .find(p => p.type === "timeZoneName")?.value ?? tz;
  return `${name.replace(/ (Standard|Daylight) Time$/, " Time")}, ${city}`;
}

const businessName = (u: User) => u.company_name ?? u.org_name ?? "";

export function GeneralTab() {
  const { user, refreshUser } = useAuth();
  const { isAdvertiser, isBroadcaster, isDual } = userRoles(user);

  const [person, setPerson] = useState({ first_name: "", last_name: "", phone: "" });
  const [initialPerson, setInitialPerson] = useState(person);
  const [business, setBusiness] = useState({ name: "", address_line1: "", city: "", region: "", postal_code: "" });
  const [initialBusiness, setInitialBusiness] = useState(business);
  const [savingPerson, setSavingPerson] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [errors, setErrors] = useState<{ first_name?: string; last_name?: string }>({});

  const personDirty = person.first_name !== initialPerson.first_name
    || person.last_name !== initialPerson.last_name || person.phone !== initialPerson.phone;
  const businessDirty = business.name !== initialBusiness.name
    || (isBroadcaster && (business.address_line1 !== initialBusiness.address_line1 || business.city !== initialBusiness.city
      || business.region !== initialBusiness.region || business.postal_code !== initialBusiness.postal_code));

  // `user` gets a new object on every refreshUser() call, including the one saving a
  // section triggers — only resync a section from it when it has no unsaved edits, so
  // saving Person (say) can't wipe an in-progress edit to Business, or vice versa.
  useEffect(() => {
    if (!user) return;
    if (!personDirty) {
      const fromUser = { first_name: user.first_name ?? "", last_name: user.last_name ?? "", phone: user.phone ?? "" };
      setPerson(fromUser);
      setInitialPerson(fromUser);
    }
    if (!businessDirty) {
      const fromUser = {
        name: businessName(user),
        address_line1: user.address_line1 ?? "",
        city: user.city ?? "",
        region: user.region ?? "",
        postal_code: user.postal_code ?? "",
      };
      setBusiness(fromUser);
      setInitialBusiness(fromUser);
    }
  }, [user]);

  if (!user) return null;

  const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  const roleLabel = isDual ? "Advertiser and broadcaster" : isAdvertiser ? "Advertiser" : "Broadcaster";
  const paid = (["advertiser", "broadcaster"] as const)
    .filter(r => user.roles.includes(r))
    .some(r => isPaid(getPlanState(user.id, r).tier));

  const savePerson = async () => {
    const e: typeof errors = {};
    if (!person.first_name.trim()) e.first_name = "Enter your first name";
    if (!person.last_name.trim()) e.last_name = "Enter your last name";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSavingPerson(true);
    try {
      await api.patch("/api/user/profile", {
        first_name: person.first_name.trim(),
        last_name: person.last_name.trim(),
        phone: person.phone.trim() || null,
      });
      await refreshUser();
      toast.success("Changes saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your changes");
    } finally {
      setSavingPerson(false);
    }
  };

  // One business for both roles: the advertiser profile keeps it as org_name, the broadcaster
  // profile as company_name along with the address.
  const saveBusiness = async () => {
    setSavingBusiness(true);
    try {
      const name = business.name.trim() || null;
      await api.patch("/api/user/profile", {
        ...(isAdvertiser ? { org_name: name } : {}),
        ...(isBroadcaster ? {
          company_name: name,
          address_line1: business.address_line1.trim() || null,
          city: business.city.trim() || null,
          region: business.region.trim() || null,
          postal_code: business.postal_code.trim() || null,
        } : {}),
      });
      await refreshUser();
      toast.success("Business details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save your business details");
    } finally {
      setSavingBusiness(false);
    }
  };

  const text = (id: string, value: string, onChange: (v: string) => void, opts: { error?: string; disabled?: boolean; placeholder?: string } = {}) => (
    <div className={boxCn(opts.error)}>
      <input id={id} className={bareInputCn} value={value} disabled={opts.disabled} placeholder={opts.placeholder}
        title={opts.disabled ? "Coming soon" : undefined} onChange={e => onChange(e.target.value)} />
    </div>
  );

  return (
    <div className="flex flex-col">
      <Section title="Profile" description="Advertisers and broadcasters see this on bookings, messages and reviews.">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[rgba(58,71,194,0.1)] text-xl font-semibold text-[#3a47c2]" aria-hidden="true">{initials}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-semibold leading-6 text-[#1a1d25]">{user.first_name} {user.last_name}</span>
              <span className="text-[13px] leading-[18px] text-[#656972]">{roleLabel} · {paid ? "Premium" : "Free plan"}</span>
            </div>
            <CampaignButton disabled title="Coming soon"><Plus aria-hidden="true" />Upload photo</CampaignButton>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-xs leading-5 text-[#656972]">
            PNG or JPG, at least 200 × 200 px. Your initials show until you add one. <SoonTag />
          </p>
        </div>
      </Section>

      <Section title="Personal information" description="Your name shows on receipts and anything you send through Adtua.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="s-first" error={errors.first_name}>
            {text("s-first", person.first_name, v => setPerson(p => ({ ...p, first_name: v })), { error: errors.first_name })}
          </Field>
          <Field label="Last name" htmlFor="s-last" error={errors.last_name}>
            {text("s-last", person.last_name, v => setPerson(p => ({ ...p, last_name: v })), { error: errors.last_name })}
          </Field>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-[#4a5565]">Email</span>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex flex-wrap items-center gap-2 text-sm text-[#1a1d25]">
              {user.email}
              <Pill tone="green" icon={<Check className="size-3.5" aria-hidden="true" />}>Verified</Pill>
            </span>
            <button type="button" disabled title="Coming soon" className="text-sm font-medium text-[#3a47c2] disabled:cursor-not-allowed disabled:opacity-50">Change email</button>
          </div>
        </div>
        <Field label="Phone (optional)" htmlFor="s-phone" hint="Only used if someone on a booking with you or Adtua support needs to reach you.">
          {text("s-phone", person.phone, v => setPerson(p => ({ ...p, phone: v })), { placeholder: "(317) 555-0148" })}
        </Field>
        <div className="flex justify-end">
          <CampaignButton size="md" variant="primary" disabled={!personDirty || savingPerson} onClick={savePerson}>
            {savingPerson ? "Saving…" : "Save changes"}
          </CampaignButton>
        </div>
      </Section>

      <Section
        title="Business details"
        description={isDual
          ? "One business for both roles. Broadcasters see it on your booking requests. Advertisers see it on your listings and proposals."
          : isAdvertiser ? "Broadcasters see it on your booking requests." : "Advertisers see it on your listings and proposals."}>
        {isBroadcaster && (
          <Field label="Business logo">
            <div className="flex items-center gap-4">
              <span className="grid size-14 place-items-center rounded-lg border-[0.8px] border-[#e3e5ea] bg-[#f8faff] text-[#656972]"><ImageIcon className="size-5" aria-hidden="true" /></span>
              <div className="flex flex-col items-start gap-1.5">
                <CampaignButton disabled title="Coming soon"><Upload aria-hidden="true" />Upload logo</CampaignButton>
                <span className="flex items-center gap-2 text-xs text-[#656972]">Square PNG or SVG works best. <SoonTag /></span>
              </div>
            </div>
          </Field>
        )}
        <div className={`grid grid-cols-1 gap-4 ${isBroadcaster ? "sm:grid-cols-2" : ""}`}>
          <Field label="Business name" htmlFor="s-business">
            {text("s-business", business.name, v => setBusiness(b => ({ ...b, name: v })), { placeholder: "Your business name" })}
          </Field>
          {isBroadcaster && (
            <Field label="Business type" htmlFor="s-type">{text("s-type", "", () => {}, { disabled: true, placeholder: "Coming soon" })}</Field>
          )}
        </div>
        {isBroadcaster && (
          <Field label="Website (optional)" htmlFor="s-web">{text("s-web", "", () => {}, { disabled: true, placeholder: "Coming soon" })}</Field>
        )}
        <label className="flex items-start gap-3">
          <Switch disabled title="Coming soon" className="mt-0.5" />
          <span className="flex flex-col">
            <span className="flex items-center gap-2 text-sm font-medium text-[#1a1d25]">I book ads for other brands <SoonTag /></span>
            <span className="text-[13px] leading-[18px] text-[#656972]">Turn this on if you're an agency. Broadcasters will see you book on behalf of clients.</span>
          </span>
        </label>
        {isBroadcaster && (
          <>
            <Field label="Business address" htmlFor="s-address">
              {text("s-address", business.address_line1, v => setBusiness(b => ({ ...b, address_line1: v })), { placeholder: "Street address" })}
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="City" htmlFor="s-city">{text("s-city", business.city, v => setBusiness(b => ({ ...b, city: v })), { placeholder: "City" })}</Field>
              <Field label="State" htmlFor="s-state">{text("s-state", business.region, v => setBusiness(b => ({ ...b, region: v })), { placeholder: "State" })}</Field>
              <Field label="ZIP/Postal Code" htmlFor="s-zip">{text("s-zip", business.postal_code, v => setBusiness(b => ({ ...b, postal_code: v })), { placeholder: "ZIP" })}</Field>
            </div>
          </>
        )}
        <div className="flex justify-end">
          <CampaignButton size="md" variant="primary" disabled={!businessDirty || savingBusiness} onClick={saveBusiness}>
            {savingBusiness ? "Saving…" : "Save changes"}
          </CampaignButton>
        </div>
      </Section>

      <Section title="Roles" soon
        description={isDual ? "You use both. Removing a role keeps your account and the other role as they are." : "Add the other role whenever you're ready. Your account stays the same."}>
        <RowList>
          <Row icon={<Megaphone className="size-5" aria-hidden="true" />} title="Advertiser" sub="Book screens and run campaigns"
            right={isAdvertiser
              ? <><Pill tone="green">Active</Pill>{isDual && <button type="button" disabled title="Coming soon" className="text-[13px] font-medium text-[#3a47c2] disabled:cursor-not-allowed disabled:opacity-50">Remove role</button>}</>
              : <CampaignButton disabled title="Coming soon">Become an advertiser</CampaignButton>} />
          <Row icon={<Monitor className="size-5" aria-hidden="true" />} title="Broadcaster" sub="List your spaces and earn from bookings"
            right={isBroadcaster
              ? <><Pill tone="green">Active</Pill>{isDual && <button type="button" disabled title="Coming soon" className="text-[13px] font-medium text-[#3a47c2] disabled:cursor-not-allowed disabled:opacity-50">Remove role</button>}</>
              : <CampaignButton disabled title="Coming soon">Become a broadcaster</CampaignButton>} />
        </RowList>
      </Section>

      <Section title="Time zone" soon description="Booking dates, slot times and reports follow this time zone.">
        <Field label="Time zone" htmlFor="s-tz" hint="Detected from your browser. Change it if you manage screens in another time zone.">
          {text("s-tz", timeZoneLabel(), () => {}, { disabled: true })}
        </Field>
      </Section>

      <Section title="Your data" soon description="Download a copy of your account or close it for good.">
        <RowList>
          <Row icon={<Trash2 className="size-5 text-[#c92324]" aria-hidden="true" />} title="Delete account"
            sub="Removes your account and data permanently. Active bookings need to end or be cancelled first."
            right={<CampaignButton disabled title="Coming soon" className="border-[#d2d4d9] text-[#c92324]">Delete account</CampaignButton>} />
        </RowList>
      </Section>
    </div>
  );
}
