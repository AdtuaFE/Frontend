import { useRef, type ChangeEvent } from "react";
import { Upload, Star, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Field, StepNav, fieldCn, fieldErrCn } from "./primitives";
import { SPACE_TYPES, newId, type PhotoDraft, type SpaceDraft } from "./types";

const MAX_PHOTOS = 10;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

type Props = {
  draft: SpaceDraft;
  photos: PhotoDraft[];
  errors: Record<string, string>;
  onChange: (patch: Partial<SpaceDraft>) => void;
  onPhotosChange: (photos: PhotoDraft[]) => void;
  onFilesAdded: (files: File[]) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepBasics({
  draft, photos, errors, onChange, onPhotosChange, onFilesAdded, onBack, onNext,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!picked.length) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} images`);
      return;
    }

    const accepted: File[] = [];
    for (const file of picked.slice(0, room)) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name} is not a JPEG, PNG or WebP`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 5 MB`);
        continue;
      }
      accepted.push(file);
    }
    if (picked.length > room) toast.error(`Only ${room} more image${room === 1 ? "" : "s"} allowed`);
    if (accepted.length) onFilesAdded(accepted);
  };

  const setPrimary = (id: string) =>
    onPhotosChange(photos.map(p => ({ ...p, isPrimary: p.id === id })));

  const remove = (id: string) => {
    const next = photos.filter(p => p.id !== id);
    const removed = photos.find(p => p.id === id);
    if (removed?.isPrimary && next.length) next[0] = { ...next[0], isPrimary: true };
    URL.revokeObjectURL(removed?.previewUrl ?? "");
    onPhotosChange(next);
  };

  const wordCount = draft.description.trim() ? draft.description.trim().split(/\s+/).length : 0;

  return (
    <div className="flex w-full flex-col gap-8">
      <Field label="Space name" required error={errors.name}>
        <input
          className={errors.name ? fieldErrCn : fieldCn}
          placeholder="Downtown kiosk screen"
          value={draft.name}
          onChange={e => onChange({ name: e.target.value })}
        />
      </Field>

      <Field
        label="Description"
        error={errors.description}
        hint={`Max 100 words${wordCount ? ` · ${wordCount} used` : ""}`}>
        <textarea
          className={`${errors.description ? fieldErrCn : fieldCn} h-[100px] resize-none`}
          placeholder="Describe where the ad space lives, who sees it, and why it performs well."
          value={draft.description}
          onChange={e => onChange({ description: e.target.value })}
        />
      </Field>

      <div className="flex w-full items-start gap-8">
        <Field label="Space type" required error={errors.spaceType}>
          <Select value={draft.spaceType} onValueChange={v => onChange({ spaceType: v })}>
            <SelectTrigger className={`${errors.spaceType ? fieldErrCn : fieldCn} justify-between`}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {SPACE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Target audience">
          <input
            className={fieldCn}
            placeholder="Students, commuters, fitness"
            value={draft.audience}
            onChange={e => onChange({ audience: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[#4a5565]">Photos of your space</p>
          <div className="text-sm leading-[25px] tracking-[-0.15px] text-[#767676]">
            <p>Please upload clear photos of your space. We recommend including:</p>
            <ul className="list-disc ps-[21px]">
              <li>The full display</li>
              <li>Where the display is located</li>
              <li>The surrounding area</li>
            </ul>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-[#e3e5ea]">
                <img src={photo.previewUrl} alt={photo.name} className="size-full object-cover" />
                {photo.isPrimary && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-[#3a47c2] px-2 py-0.5 text-[11px] font-medium text-white">
                    <Star className="size-3 fill-current" />Primary
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {!photo.isPrimary && (
                    <button
                      type="button"
                      onClick={() => setPrimary(photo.id)}
                      className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-medium text-[#1a1d25] hover:bg-white">
                      Set primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(photo.id)}
                    title="Remove photo"
                    className="ml-auto rounded-md bg-white/90 p-1 text-[#1a1d25] hover:bg-white">
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[#e3e5ea] bg-white p-6">
          <span className="flex size-12 items-center justify-center rounded-full bg-[#f8faff]">
            <Upload className="size-6 text-[#3a47c2]" />
          </span>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-sm font-medium tracking-[-0.31px] text-[#4a4d56]">
              Upload maximum of {MAX_PHOTOS} images
            </p>
            <p className="text-xs tracking-[-0.15px] text-[#656972]">
              JPEG, PNG or WebP&nbsp; · &nbsp;Max 5 MB each
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={photos.length >= MAX_PHOTOS}
            className="flex h-8 items-center justify-center gap-1.5 rounded-lg border-[0.8px] border-[#d2d4d9]
              bg-white pl-[10.8px] pr-[12.8px] text-[13px] font-medium text-[#1a1d25] transition-colors
              hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50">
            <Upload className="size-4" />Upload image
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFiles}
          />
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}
