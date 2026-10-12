import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getPlanState, isPaid as isPaidTier } from "@/lib/plans";
import { AppLayout } from "@/components/AppLayout";
import { loadWizardData } from "@/pages/Onboarding";
import { SecondaryButton, Steps } from "@/components/addspace/primitives";
import { StepBasics } from "@/components/addspace/StepBasics";
import { StepLocation } from "@/components/addspace/StepLocation";
import { StepScreens } from "@/components/addspace/StepScreens";
import { StepSchedule } from "@/components/addspace/StepSchedule";
import { StepReview } from "@/components/addspace/StepReview";
import {
  STEPS, clearDraft, emptyDraft, loadDraft, newId, saveDraft, toCreateSpacePayload,
  type PhotoDraft, type ScreenDraft, type SpaceDraft, type StepKey,
} from "@/components/addspace/types";

const MAX_DESCRIPTION_WORDS = 100;

const AddSpace = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [draft, setDraft] = useState<SpaceDraft>(emptyDraft);
  const [step, setStep] = useState<StepKey>("basics");
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [locationSearch, setLocationSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Photo files never reach localStorage — only the space's text survives a reload.
   * They're uploaded after the space exists, since the images endpoint needs its id.
   */
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const filesRef = useRef<Map<string, File>>(new Map());

  const broadcasterPaid = user ? isPaidTier(getPlanState(user.id, "broadcaster").tier) : false;

  useEffect(() => {
    const saved = loadDraft();
    if (!saved) return;
    setDraft(saved.draft);
    setStep(saved.step);
    setFurthest(STEPS.findIndex(s => s.key === saved.step));
  }, []);

  useEffect(() => {
    saveDraft(draft, step);
  }, [draft, step]);

  // Object URLs are revoked only when leaving the flow — individual removals handle their own.
  useEffect(() => {
    const urls = filesRef.current;
    return () => {
      urls.clear();
    };
  }, []);

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const goTo = (next: StepKey) => {
    setStep(next);
    setErrors({});
    setFurthest(f => Math.max(f, STEPS.findIndex(s => s.key === next)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const patchDraft = (p: Partial<SpaceDraft>) => setDraft(d => ({ ...d, ...p }));
  const setScreens = (screens: ScreenDraft[]) => setDraft(d => ({ ...d, screens }));

  const handleFilesAdded = (files: File[]) => {
    const added = files.map((file, i) => {
      const id = newId();
      filesRef.current.set(id, file);
      return {
        id,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        isPrimary: photos.length === 0 && i === 0,
      };
    });
    setPhotos(p => [...p, ...added]);
  };

  const handlePhotosChange = (next: PhotoDraft[]) => {
    for (const [id] of filesRef.current) {
      if (!next.some(p => p.id === id)) filesRef.current.delete(id);
    }
    setPhotos(next);
  };

  /* ---------- validation ---------- */

  const validate = (which: StepKey): boolean => {
    const e: Record<string, string> = {};

    if (which === "basics") {
      if (!draft.name.trim()) e.name = "Space name is required";
      if (!draft.spaceType) e.spaceType = "Pick a space type";
      const words = draft.description.trim() ? draft.description.trim().split(/\s+/).length : 0;
      if (words > MAX_DESCRIPTION_WORDS) {
        e.description = `Description is ${words} words — the limit is ${MAX_DESCRIPTION_WORDS}`;
      }
    }

    if (which === "location") {
      if (!draft.addressLine1.trim()) e.addressLine1 = "Address line 1 is required";
      if (!draft.city.trim()) e.city = "City is required";
      if (!draft.country.trim()) e.country = "Country is required";
    }

    if (which === "screens") {
      draft.screens.forEach(screen => {
        if (!screen.name.trim()) e[`screen.${screen.id}.name`] = "Screen name is required";
        if (!screen.displayType) e[`screen.${screen.id}.displayType`] = "Pick a display type";
      });
    }

    if (which === "schedule") {
      draft.screens.forEach(screen => {
        if (screen.sameScheduleAs) return;
        screen.slots.forEach(slot => {
          const price = Number(slot.pricePerDay);
          if (!slot.pricePerDay.trim() || !Number.isFinite(price) || price <= 0) {
            e[`slot.${slot.id}`] = "Set a price above $0";
          }
        });
        if (!screen.slots.some(s => s.days.length > 0)) {
          e[`screen.${screen.id}.slots`] = "Pick at least one day";
        }
      });
    }

    setErrors(e);
    if (Object.keys(e).length) {
      toast.error(Object.values(e)[0]);
      return false;
    }
    return true;
  };

  const next = () => {
    if (!validate(step)) return;
    const target = STEPS[stepIndex + 1];
    if (target) goTo(target.key);
  };

  const back = () => {
    const target = STEPS[stepIndex - 1];
    if (target) goTo(target.key);
    else navigate("/spaces");
  };

  const saveAsDraft = () => {
    saveDraft(draft, step);
    toast.success("Draft saved on this device");
  };

  /* ---------- publish ---------- */

  const publish = async () => {
    for (const s of STEPS.slice(0, 4)) {
      if (!validate(s.key)) {
        goTo(s.key);
        return;
      }
    }

    setSubmitting(true);
    try {
      const wizard = loadWizardData();
      const created = await api.post<{ id: number }>(
        "/api/spaces",
        toCreateSpacePayload(draft, wizard.venueType || undefined),
      );

      // Images need the space id, so they go up after creation. A failed upload
      // shouldn't discard a space that already exists — report and carry on.
      const ordered = [...photos].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
      let uploaded = 0;
      for (const photo of ordered) {
        const file = filesRef.current.get(photo.id);
        if (!file) continue;
        try {
          const fd = new FormData();
          fd.append("image", file);
          await api.postMultipart(`/api/spaces/${created.id}/images`, fd);
          uploaded += 1;
        } catch {
          /* collected below */
        }
      }
      if (uploaded < photos.length) {
        toast.error(
          `Space published, but ${photos.length - uploaded} photo(s) failed to upload. Add them from the space page.`,
        );
      }

      for (const photo of photos) URL.revokeObjectURL(photo.previewUrl);
      clearDraft();
      await queryClient.invalidateQueries({ queryKey: ["spaces-mine"] });
      toast.success("Space published");
      navigate(`/spaces/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout activeNav="spaces">
      <div className="mx-auto flex w-full max-w-[1164px] flex-col gap-6 pb-14">
        <nav className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate("/spaces")}
            className="text-[#656972] transition-colors hover:text-[#3a47c2]">
            My Spaces
          </button>
          <ChevronRight className="size-3.5 text-[#8f929d]" />
          <span className="font-medium text-[#1a1d25]">Add Space</span>
        </nav>

        <div className="flex min-h-10 items-center gap-4">
          <h1 className="flex-1 text-2xl font-semibold text-[#1a1d25]">Add Space</h1>
          <SecondaryButton onClick={saveAsDraft} className="h-8 text-[13px]">
            Save as draft
          </SecondaryButton>
        </div>

        <div className="flex flex-col gap-8 px-0 lg:px-[212px]">
          <Steps current={step} furthest={furthest} onStepClick={goTo} />

          {step === "basics" && (
            <StepBasics
              draft={draft}
              photos={photos}
              errors={errors}
              onChange={patchDraft}
              onPhotosChange={handlePhotosChange}
              onFilesAdded={handleFilesAdded}
              onBack={back}
              onNext={next}
            />
          )}

          {step === "location" && (
            <StepLocation
              draft={draft}
              search={locationSearch}
              errors={errors}
              onSearchChange={setLocationSearch}
              onChange={patchDraft}
              onBack={back}
              onNext={next}
            />
          )}

          {step === "screens" && (
            <StepScreens
              screens={draft.screens}
              errors={errors}
              onChange={setScreens}
              onBack={back}
              onNext={next}
            />
          )}

          {step === "schedule" && (
            <StepSchedule
              screens={draft.screens}
              errors={errors}
              onChange={setScreens}
              onBack={back}
              onNext={next}
            />
          )}

          {step === "review" && (
            <StepReview
              draft={draft}
              photos={photos}
              isPaid={broadcasterPaid}
              submitting={submitting}
              onEdit={goTo}
              onBack={back}
              onPublish={publish}
            />
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AddSpace;
