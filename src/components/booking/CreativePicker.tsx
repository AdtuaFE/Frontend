import { useRef, useState } from "react";
import { Film, ImageIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CREATIVE_TYPES, SPOT_SECONDS, creativeError, isVideoFile, measureVideoDuration, spotsFor } from "@/lib/creative";

export type Creative = { file: File; seconds: number; video: boolean };

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Picks the ad file and, for a video, reads its length so the price can be worked out up front. */
export function CreativePicker({ id, value, onChange, error }: {
  id: string;
  value: Creative | null;
  onChange: (creative: Creative | null) => void;
  /** Shown when the form needs a file and none is picked. */
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [pickError, setPickError] = useState("");

  const pick = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    const problem = creativeError(file);
    if (problem) { setPickError(problem); return; }
    setPickError("");
    if (!isVideoFile(file)) { onChange({ file, seconds: SPOT_SECONDS, video: false }); return; }
    setReading(true);
    try {
      onChange({ file, seconds: await measureVideoDuration(file), video: true });
    } catch (e) {
      setPickError(e instanceof Error ? e.message : "We couldn't read that video.");
    } finally {
      setReading(false);
    }
  };

  const shownError = pickError || error;
  const spots = value ? spotsFor(value.seconds) : 1;

  return (
    <div className="space-y-1.5">
      <input ref={inputRef} id={id} type="file" accept={CREATIVE_TYPES} className="sr-only"
        onChange={e => pick(e.target.files?.[0])} />
      {value ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            {value.video ? <Film className="size-4" aria-hidden="true" /> : <ImageIcon className="size-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{value.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {value.video
                ? `Video · ${value.seconds} sec · ${spots} spot${spots === 1 ? "" : "s"} per play`
                : `Image · shows for ${SPOT_SECONDS} sec per play`} · {fmtSize(value.file.size)}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" disabled={reading} onClick={() => inputRef.current?.click()}>
            {reading ? "Reading…" : "Change"}
          </Button>
        </div>
      ) : (
        <button type="button" disabled={reading} onClick={() => inputRef.current?.click()}
          className={`flex w-full flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center transition-colors hover:bg-muted/50 disabled:cursor-wait ${shownError ? "border-red-400" : "border-[#d7dce3]"}`}>
          <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-medium">{reading ? "Reading your video…" : "Choose your ad"}</span>
          <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF, MP4 or MOV · up to 100 MB</span>
        </button>
      )}
      {shownError
        ? <p className="text-xs text-red-500">{shownError}</p>
        : value?.video && spots > 1 && (
          <p className="text-xs text-muted-foreground">
            Slots are sold in {SPOT_SECONDS}-second spots, so each play of this video uses {spots}.
          </p>
        )}
    </div>
  );
}
