import { Eye, KeyRound, LogOut, Mail, Monitor, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CampaignButton } from "@/components/campaigns/CampaignBits";
import { useAuth } from "@/context/AuthContext";
import { Pill, Row, RowList, Section } from "./SettingsBits";
import { boxCn } from "./settingsStyles";

/** "Chrome on macOS" from the browser's user agent. */
function thisDevice(): { label: string; phone: boolean } {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "this device";
  return { label: `${browser} on ${os}`, phone: os === "iPhone" || os === "Android" };
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#F25022" d="M2 2h9.5v9.5H2z" />
      <path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z" />
      <path fill="#00A4EF" d="M2 12.5h9.5V22H2z" />
      <path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z" />
    </svg>
  );
}

/**
 * The backend has no password change, two-step verification, social sign-in, session list or
 * sign-in history yet, so this tab shows the design with those controls switched off.
 */
export function SecurityTab() {
  const { user } = useAuth();
  const device = thisDevice();
  const soon = { disabled: true, title: "Coming soon" } as const;

  return (
    <div className="flex flex-col">
      <Section title="Password" soon>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className={`${boxCn()} max-w-[310px]`}>
            <span className="flex-1 py-3 tracking-widest text-[#1a1d25]" aria-label="Password hidden">••••••••••••</span>
            <Eye className="size-4 text-[#656972]" aria-hidden="true" />
          </div>
          <CampaignButton {...soon}>Change password</CampaignButton>
        </div>
      </Section>

      <Section title="Two-step verification" soon
        description="Ask for a code after your password, so a leaked password alone can't get anyone in.">
        <RowList>
          <Row icon={<Smartphone className="size-5" aria-hidden="true" />}
            title={<>Authenticator app <Pill tone="indigo">Recommended</Pill></>}
            sub="Google Authenticator, 1Password or any app that makes 6-digit codes"
            right={<CampaignButton {...soon}>Set up</CampaignButton>} />
          <Row icon={<Mail className="size-5" aria-hidden="true" />} title="Email code"
            sub={`We send a code to ${user?.email ?? "your email"} each time you sign in`}
            right={<CampaignButton {...soon}>Set up</CampaignButton>} />
        </RowList>
        <p className="text-[13px] leading-[18px] text-[#4a4d56]">Once it's on you'll get 10 backup codes. Keep them somewhere safe in case you lose your phone.</p>
      </Section>

      <Section title="Sign-in methods" soon description="Connect Google or Microsoft to sign in without a password.">
        <RowList>
          <Row icon={<KeyRound className="size-5" aria-hidden="true" />} title="Email and password" sub={user?.email}
            right={<Pill tone="neutral">Primary</Pill>} />
          <Row icon={<GoogleLogo />} title="Google" sub="Not connected" right={<CampaignButton {...soon}>Connect</CampaignButton>} />
          <Row icon={<MicrosoftLogo />} title="Microsoft" sub="Not connected" right={<CampaignButton {...soon}>Connect</CampaignButton>} />
        </RowList>
      </Section>

      <Section title="Where you're signed in" soon description="Sign out of any device you don't recognize, then change your password.">
        <RowList>
          <Row icon={device.phone ? <Smartphone className="size-5" aria-hidden="true" /> : <Monitor className="size-5" aria-hidden="true" />}
            title={device.label} sub="Active now" right={<Pill tone="green">This device</Pill>} />
        </RowList>
        <div><CampaignButton {...soon}><LogOut aria-hidden="true" />Sign out of all other devices</CampaignButton></div>
      </Section>

      <Section title="Recent sign-ins" soon description="The last 30 days of sign-in attempts on your account.">
        <div className="overflow-hidden rounded-xl border-[0.8px] border-[#e3e5ea]">
          <div className="grid grid-cols-3 bg-[#f8faff] px-4 py-2.5 text-[13px] font-medium text-[#656972]">
            <span>When</span><span>Device and location</span><span>Result</span>
          </div>
          <p className="border-t-[0.8px] border-[#e3e5ea] px-4 py-6 text-center text-sm text-[#656972]">Sign-in history will show here once it's available.</p>
        </div>
        <label className="flex items-start gap-3">
          <Switch checked disabled title="Coming soon" className="mt-0.5 data-[state=checked]:bg-[#3a47c2]" />
          <span className="flex flex-col">
            <span className="text-sm font-medium text-[#1a1d25]">Email me about sign-ins from a new device</span>
            <span className="text-[13px] leading-[18px] text-[#656972]">You'll get an email with a link to lock your account if it wasn't you.</span>
          </span>
        </label>
      </Section>
    </div>
  );
}
