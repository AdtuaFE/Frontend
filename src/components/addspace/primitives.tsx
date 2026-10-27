import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UiLabel } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { STEPS, type StepKey } from "./types";

/* Field shells sized from the design: 46px min height, 8px radius, #e3e5ea border. */
export const fieldCn =
  "w-full min-h-[46px] rounded-lg border border-[#e3e5ea] bg-white px-3 py-3 text-sm text-[#1a1d25] " +
  "placeholder:text-[#8f929d] outline-none transition-colors focus:border-[#3a47c2] " +
  "focus:ring-1 focus:ring-[#3a47c2] disabled:bg-[#f8faff] disabled:text-[#8f929d]";

export const fieldErrCn =
  "w-full min-h-[46px] rounded-lg border border-red-400 bg-white px-3 py-3 text-sm text-[#1a1d25] " +
  "placeholder:text-[#8f929d] outline-none transition-colors focus:ring-1 focus:ring-red-400";

/** The shared ui inputs, styled as the design's fields. Their focus ring is sized down to match. */
const controlCn = (invalid?: boolean) =>
  cn(
    invalid ? fieldErrCn : fieldCn,
    "focus-visible:ring-1 focus-visible:ring-offset-0",
    invalid ? "focus-visible:ring-red-400" : "focus-visible:ring-[#3a47c2]",
  );

type ControlProps = { invalid?: boolean };

export const TextInput = forwardRef<HTMLInputElement, ComponentProps<"input"> & ControlProps>(
  ({ invalid, className, ...props }, ref) => <Input ref={ref} className={cn(controlCn(invalid), className)} {...props} />,
);
TextInput.displayName = "TextInput";

export const TextArea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea"> & ControlProps>(
  ({ invalid, className, ...props }, ref) => <Textarea ref={ref} className={cn(controlCn(invalid), className)} {...props} />,
);
TextArea.displayName = "TextArea";

/**
 * A field with an icon or unit inside its box, like "$ 50" or "1920 px". The box draws the field
 * and its focus ring; the shared ui Input inside it is left bare.
 */
export const AdornedInput = forwardRef<HTMLInputElement, ComponentProps<"input"> & { start?: ReactNode; end?: ReactNode }>(
  ({ start, end, className, ...props }, ref) => (
    <div className={cn(fieldCn, "flex items-center gap-2 focus-within:border-[#3a47c2] focus-within:ring-1 focus-within:ring-[#3a47c2]")}>
      {start}
      <Input
        ref={ref}
        className={cn(
          "h-auto w-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-sm placeholder:text-[#8f929d]",
          "focus-visible:ring-0 focus-visible:ring-offset-0",
          className,
        )}
        {...props}
      />
      {end}
    </div>
  ),
);
AdornedInput.displayName = "AdornedInput";

export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <UiLabel className="flex items-center gap-1.5 text-sm font-semibold leading-5 text-[#4a4d56]">
      {children}
      {required && <span className="text-red-500">*</span>}
    </UiLabel>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      {label && <Label required={required}>{label}</Label>}
      <div className="flex w-full flex-col gap-1.5">
        {children}
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : hint ? (
          <p className="text-xs leading-5 text-[#9c9c9c]">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Primary / secondary buttons at the design's 40px height. */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <Button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-full rounded-lg bg-[#3a47c2] px-4 text-white hover:bg-[#2f3a9e]">
      {children}
    </Button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-10 rounded-lg border-[0.8px] border-[#d2d4d9] bg-white px-4 text-[#1a1d25] hover:bg-[#f8faff] hover:text-[#1a1d25]",
        className,
      )}>
      {children}
    </Button>
  );
}

export function StepNav({
  onBack,
  onNext,
  nextLabel = "Next",
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex w-full items-center justify-center gap-8">
      <div className="flex-1">
        <SecondaryButton onClick={onBack} className="w-full">
          Back
        </SecondaryButton>
      </div>
      <div className="flex-1">
        <PrimaryButton onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}

/** The 5-step progress bar. Completed steps collapse to a check, per the design. */
export function Steps({
  current,
  onStepClick,
  furthest,
}: {
  current: StepKey;
  onStepClick: (step: StepKey) => void;
  furthest: number;
}) {
  const currentIndex = STEPS.findIndex(s => s.key === current);

  return (
    <div className="flex w-full items-center gap-2">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        const reachable = i <= furthest;
        return (
          <div key={step.key} className="contents">
            {i > 0 && <div className="h-px min-w-[8px] flex-1 bg-[#e3e5ea]" />}
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onStepClick(step.key)}
              className={`flex shrink-0 items-center gap-3 py-2 ${
                reachable ? "cursor-pointer" : "cursor-default"
              }`}>
              {done ? (
                <span className="flex size-6 items-center justify-center rounded-full text-[#3a47c2]">
                  <Check className="size-[18px]" strokeWidth={2.5} />
                </span>
              ) : (
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                    active ? "bg-[#3a47c2] text-white" : "bg-[#f8faff] text-[#656972]"
                  }`}>
                  {i + 1}
                </span>
              )}
              <span
                className={`whitespace-nowrap text-sm font-medium ${
                  active || done ? "text-[#3a47c2]" : "text-[#656972]"
                }`}>
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
