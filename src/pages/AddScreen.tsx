import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Steps } from "@/components/addspace/primitives";
import { StepScreens } from "@/components/addspace/StepScreens";
import { StepSchedule } from "@/components/addspace/StepSchedule";
import {
  emptyDraft, emptyScreen, screenNameError, slotErrors, toScreenRequests, type ScreenDraft,
} from "@/components/addspace/types";
import {
  SCREEN_ALLOWANCE_KEY, isVisibleScreen, limitMessage, screensLeft, useScreenAllowance,
} from "@/lib/screenAllowance";
import { useBilling } from "@/lib/billing";
import { BuyScreensButton } from "@/components/BuyScreensButton";

// Adds one screen to a space that already exists, with the same screen and schedule steps as
// the add-space wizard, and creates its time slots along with it.

const ADD_SCREEN_STEPS = [
  { key: "screen", label: "Screen" },
  { key: "schedule", label: "Pricing & Schedule" },
] as const;
type AddScreenStep = (typeof ADD_SCREEN_STEPS)[number]["key"];

type Space = { id: number; broadcaster_id: number; name: string; is_active: boolean };

const AddScreen = () => {
  const { id } = useParams<{ id: string }>();
  const spaceId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [screen, setScreen] = useState<ScreenDraft>(emptyScreen);
  const [step, setStep] = useState<AddScreenStep>("screen");
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: space, isLoading } = useQuery<Space>({
    queryKey: ["space", spaceId],
    queryFn: () => api.get<Space>(`/api/spaces/${spaceId}`),
    enabled: !!id,
  });
  const { data: allowance } = useScreenAllowance(!!user);
  const { data: billing } = useBilling(!!user);

  const isOwner = !!user && !!space && user.id === space.broadcaster_id;
  const takenNames = (allowance?.screens ?? [])
    .filter(s => s.space_id === spaceId && isVisibleScreen(s))
    .map(s => s.label);
  const left = allowance ? screensLeft(allowance) : 0;

  const validate = (which: AddScreenStep): boolean => {
    const e: Record<string, string> = {};
    if (which === "screen") {
      const nameError = screenNameError(screen.name, takenNames);
      if (nameError) e[`screen.${screen.id}.name`] = nameError;
      if (!screen.displayType) e[`screen.${screen.id}.displayType`] = "Pick a display type";
    } else {
      Object.assign(e, slotErrors(screen.slots));
      if (!screen.slots.some(s => s.days.length > 0)) e[`screen.${screen.id}.slots`] = "Pick at least one day";
    }
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error(Object.values(e)[0]);
      return false;
    }
    return true;
  };

  const goTo = (target: AddScreenStep) => {
    const index = ADD_SCREEN_STEPS.findIndex(s => s.key === target);
    if (index > furthest) return;
    setErrors({});
    setStep(target);
  };

  const toSchedule = () => {
    if (!validate("screen")) return;
    setFurthest(1);
    setStep("schedule");
  };

  const submit = async () => {
    if (!validate("screen")) { setStep("screen"); return; }
    if (!validate("schedule")) return;

    setSubmitting(true);
    const [request] = toScreenRequests({ ...emptyDraft(), screens: [screen] });
    let created: { id: number };
    try {
      created = await api.post<{ id: number }>(`/api/spaces/${spaceId}/screens`, { label: request.label });
    } catch (err) {
      toast.error("Couldn't add the screen", {
        description: err instanceof Error ? err.message : undefined,
        duration: 10_000,
      });
      setSubmitting(false);
      return;
    }

    // The screen exists from here on, so slot failures are reported rather than undone.
    const results = await Promise.allSettled(
      request.slots.map(slot => api.post(`/api/spaces/${spaceId}/screens/${created.id}/slots`, slot)),
    );
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["space-screens", spaceId] }),
      queryClient.invalidateQueries({ queryKey: SCREEN_ALLOWANCE_KEY }),
    ]);

    if (failed.length) {
      const reason = failed[0].reason;
      toast.error(`Screen added, but ${failed.length} time slot(s) failed to save.`, {
        description: reason instanceof Error ? reason.message : undefined,
        duration: 10_000,
      });
    } else {
      toast.success(`${request.label} added`);
    }
    navigate(`/spaces/${spaceId}`);
  };

  // Reasons this page can't be used, shown instead of the form.
  const blocked = !space
    ? isLoading ? "Loading…" : "Space not found."
    : !isOwner
      ? "Only the space's owner can add screens to it."
      : !space.is_active
        ? "This space is deactivated. Reactivate it before adding screens."
        : allowance && left === 0
          ? billing?.plan === "premium"
            ? `You're using all ${allowance.allowance} screens you've paid for.`
            : `${limitMessage(allowance.allowance)} You're using all of them.`
          : null;

  return (
    <AppLayout activeNav="spaces">
      <div className="mx-auto flex w-full max-w-[1164px] flex-col gap-6 pb-14">
        <nav className="flex items-center gap-2 text-sm">
          <button type="button" onClick={() => navigate("/spaces")}
            className="text-[#656972] transition-colors hover:text-[#3a47c2]">
            My Spaces
          </button>
          <ChevronRight className="size-3.5 text-[#8f929d]" />
          <button type="button" onClick={() => navigate(`/spaces/${spaceId}`)}
            className="text-[#656972] transition-colors hover:text-[#3a47c2]">
            {space?.name ?? "Space"}
          </button>
          <ChevronRight className="size-3.5 text-[#8f929d]" />
          <span className="font-medium text-[#1a1d25]">Add Screen</span>
        </nav>

        <h1 className="text-2xl font-semibold text-[#1a1d25]">Add Screen</h1>

        {blocked ? (
          <div className="flex flex-col items-start gap-3 rounded-[24px] border border-[#e8e8e8] bg-white p-8 text-sm text-[#4a5565]">
            <p>{blocked}</p>
            {allowance && left === 0 && isOwner && space?.is_active && (
              billing?.plan === "premium" && billing.block_purchase ? (
                <>
                  <p>Delete a screen from one of your spaces, or add more. You'll see the price before paying.</p>
                  {/* Once paid, the allowance refreshes and this page opens the form by itself. */}
                  <BuyScreensButton purchase={billing.block_purchase} />
                </>
              ) : (
                <p>
                  Delete a screen from one of your spaces, or{" "}
                  <Link to="/settings/upgrade/broadcaster" className="font-semibold text-[#3a47c2] underline">upgrade to Premium</Link>
                  {" "}to add another.
                </p>
              )
            )}
            <button type="button" onClick={() => navigate(`/spaces/${spaceId}`)}
              className="font-semibold text-[#3a47c2]">
              Back to the space
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8 px-0 lg:px-[212px]">
            <Steps<AddScreenStep> steps={ADD_SCREEN_STEPS} current={step} furthest={furthest} onStepClick={goTo} />

            {step === "screen" && (
              <StepScreens
                screens={[screen]}
                allowMultiple={false}
                errors={errors}
                onChange={([next]) => setScreen(next)}
                onBack={() => navigate(`/spaces/${spaceId}`)}
                onNext={toSchedule}
              />
            )}

            {step === "schedule" && (
              <StepSchedule
                screens={[screen]}
                errors={errors}
                onChange={([next]) => setScreen(next)}
                onBack={() => goTo("screen")}
                onNext={submit}
                nextLabel={submitting ? "Adding…" : "Add screen"}
                nextDisabled={submitting}
              />
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AddScreen;
