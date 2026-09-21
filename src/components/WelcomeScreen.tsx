import {
  Megaphone, MonitorCheck, FileCheck, CircleCheck,
  Settings2, Monitor, MapPinned, BadgeDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Step = { icon: typeof Megaphone; title: string; description: string };

function Badge({ icon: Icon, text }: { icon: typeof Megaphone; text: string }) {
  return (
    <div className="bg-[rgba(255,127,17,0.1)] flex items-center gap-2 px-4 py-2 rounded-full">
      <Icon className="h-5 w-5 text-[#ff7f11]" />
      <p className="text-xs font-medium text-[#ff7f11]">{text}</p>
    </div>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  return (
    <div className="bg-white border-[0.8px] border-[#e8e8e8] flex flex-col gap-4 items-start p-5 rounded-2xl w-[215px]">
      <div className="bg-[rgba(255,127,17,0.1)] flex items-center justify-center rounded-[10px] size-[38px]">
        <Icon className="h-5 w-5 text-[#ff7f11]" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-[#9c9c9c]">Step {index + 1}</p>
        <h3 className="text-base font-semibold text-[#4a5565]">{step.title}</h3>
        <p className="text-xs text-[#767676]">{step.description}</p>
      </div>
    </div>
  );
}

function SingleRoleWelcome({
  badgeIcon, badgeText, headline, subtext, steps, ctaLabel, onCta, caption,
}: {
  badgeIcon: typeof Megaphone;
  badgeText: string;
  headline: string;
  subtext: string;
  steps: Step[];
  ctaLabel: string;
  onCta: () => void;
  caption: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8 items-center">
      <div className="flex flex-col gap-5 items-center">
        <Badge icon={badgeIcon} text={badgeText} />
        <div className="flex flex-col gap-3 items-center text-center">
          <h1 className="text-[28px] font-semibold text-[#4a5565] leading-[38px] max-w-[560px]">{headline}</h1>
          <p className="text-[15px] text-[#767676] leading-6 max-w-[480px]">{subtext}</p>
        </div>
      </div>
      <div className="flex gap-5 items-start">
        {steps.map((step, i) => <StepCard key={step.title} step={step} index={i} />)}
      </div>
      <div className="flex flex-col gap-3 items-center">
        <Button
          className="bg-[#ff7f11] hover:bg-[#e77700] text-white px-6 py-5 rounded-xl text-[15px] font-semibold"
          onClick={onCta}>
          {ctaLabel}
        </Button>
        <p className="text-xs text-[#9c9c9c] text-center">{caption}</p>
      </div>
    </div>
  );
}

function DualRoleChoiceCard({
  icon, title, description, steps, ctaLabel, onCta,
}: {
  icon: typeof Megaphone;
  title: string;
  description: string;
  steps: { icon: typeof Megaphone; label: string }[];
  ctaLabel: string;
  onCta: () => void;
}) {
  const Icon = icon;
  return (
    <div className="bg-white border border-[#e8e8e8] flex flex-col gap-7 items-start p-6 rounded-2xl w-[370px]">
      <div className="flex flex-col gap-3 items-start w-full">
        <div className="bg-[rgba(255,127,17,0.1)] flex items-center justify-center rounded-[10px] size-[38px]">
          <Icon className="h-5 w-5 text-[#ff7f11]" />
        </div>
        <div className="flex flex-col gap-1 w-full">
          <h3 className="text-base font-semibold text-[#4a5565]">{title}</h3>
          <p className="text-xs text-[#767676]">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-10 items-start w-full">
        <div className="flex flex-col gap-5 items-start w-full">
          {steps.map(s => {
            const StepIcon = s.icon;
            return (
              <div key={s.label} className="flex gap-4 items-center w-full">
                <StepIcon className="h-5 w-5 text-[#ff7f11] shrink-0" />
                <p className="text-xs text-[#4a5565]">{s.label}</p>
              </div>
            );
          })}
        </div>
        <Button
          className="bg-[#ff7f11] hover:bg-[#e77700] text-white w-full py-5 rounded-xl text-[15px] font-semibold"
          onClick={onCta}>
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}

export function WelcomeScreen({ isAdvertiser, isBroadcaster, onCreateCampaign, onAddSpace }: {
  isAdvertiser: boolean;
  isBroadcaster: boolean;
  onCreateCampaign: () => void;
  onAddSpace: () => void;
}) {
  let content: React.ReactNode;

  if (isAdvertiser && isBroadcaster) {
    content = (
      <div className="flex flex-col gap-8 items-center">
        <div className="flex flex-col gap-5 items-center">
          <Badge icon={CircleCheck} text="You're set up as an Advertiser and a Broadcaster" />
          <div className="flex flex-col gap-3 items-center text-center">
            <h1 className="text-[28px] font-semibold text-[#4a5565] leading-[38px] max-w-[560px]">
              What do you want to do first?
            </h1>
            <p className="text-[15px] text-[#767676] leading-6 max-w-[480px]">
              You can switch between roles anytime from your dashboard.
            </p>
          </div>
        </div>
        <div className="flex gap-6 items-start">
          <DualRoleChoiceCard
            icon={Megaphone}
            title="Run a campaign"
            description="Put your ad on a space and reach a real audience."
            steps={[
              { icon: Settings2, label: "Set your budget, dates, and creative." },
              { icon: Monitor, label: "Choose a space, by hand or by category." },
              { icon: CircleCheck, label: "Your ad goes live once the broadcaster accepts." },
            ]}
            ctaLabel="Create your first campaign"
            onCta={onCreateCampaign}
          />
          <DualRoleChoiceCard
            icon={MonitorCheck}
            title="List a space"
            description="Turn a screen you own into income."
            steps={[
              { icon: MapPinned, label: "Location, size, and a few photos." },
              { icon: BadgeDollarSign, label: "CPM and daily impressions decide what you earn." },
              { icon: FileCheck, label: "Accept requests, or list on the open marketplace." },
            ]}
            ctaLabel="Add your first space"
            onCta={onAddSpace}
          />
        </div>
      </div>
    );
  } else if (isBroadcaster) {
    content = (
      <SingleRoleWelcome
        badgeIcon={MonitorCheck}
        badgeText="You're set up as a Broadcaster"
        headline="Turn your screen into a paycheck"
        subtext="Set your rate once. Get paid automatically every time an advertiser books your space."
        steps={[
          { icon: Megaphone, title: "Add your space", description: "Location, size, display type and a few photos." },
          { icon: BadgeDollarSign, title: "Set your rate", description: "CPM and daily impressions decide what you earn." },
          { icon: FileCheck, title: "Get booked and paid", description: "Accept requests, or list on the open marketplace." },
        ]}
        ctaLabel="Add your first space"
        onCta={onAddSpace}
        caption={<>Free plan includes one display. Premium adds more for $50 each, or $450 for ten. <span className="font-semibold text-[#ff7f11]">See plans</span></>}
      />
    );
  } else {
    content = (
      <SingleRoleWelcome
        badgeIcon={Megaphone}
        badgeText="You're set up as an Advertiser"
        headline="Put your ad in front of real screens, priced by the view"
        subtext="Every campaign runs on cost per thousand impressions. You only pay for what people actually see, not a flat fee for the space."
        steps={[
          { icon: Megaphone, title: "Create a campaign", description: "Set your budget, dates, and creative." },
          { icon: MonitorCheck, title: "Pick a space", description: "Choose where your ad runs, by hand or by category." },
          { icon: FileCheck, title: "Launch and track", description: "Your campaign goes live once the broadcaster accepts." },
        ]}
        ctaLabel="Create your first campaign"
        onCta={onCreateCampaign}
        caption={<>Free plan includes one space each month. <span className="font-semibold text-[#ff7f11]">See plans</span></>}
      />
    );
  }

  return <div className="h-full min-h-[560px] flex items-center justify-center py-10">{content}</div>;
}
