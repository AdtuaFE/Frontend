import { useState } from "react";
import { ChevronUp, Plus, Info, Trash2, Check } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Field, StepNav, fieldCn, fieldErrCn } from "./primitives";
import { AD_FORMATS, DISPLAY_TYPES, emptyScreen, type ScreenDraft } from "./types";

type Props = {
  screens: ScreenDraft[];
  errors: Record<string, string>;
  onChange: (screens: ScreenDraft[]) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepScreens({ screens, errors, onChange, onBack, onNext }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const patch = (id: string, p: Partial<ScreenDraft>) =>
    onChange(screens.map(s => (s.id === id ? { ...s, ...p } : s)));

  const remove = (id: string) =>
    onChange(
      screens
        .filter(s => s.id !== id)
        // Any screen mirroring the removed one falls back to its own copy of the slots.
        .map(s => (s.sameScheduleAs === id ? { ...s, sameScheduleAs: null } : s)),
    );

  return (
    <div className="flex w-full flex-col gap-8">
      {screens.map((screen, i) => {
        const isOpen = !collapsed[screen.id];
        const title = screen.name.trim() || (screens.length > 1 ? `Screen ${i + 1}` : "Screen");
        return (
          <div
            key={screen.id}
            className="flex w-full flex-col gap-8 rounded-[24px] border border-[#e8e8e8] bg-white p-8">
            <div className="flex w-full items-center justify-between">
              <p className="text-lg font-semibold text-[#4a5565]">{title}</p>
              <div className="flex items-center gap-1">
                {screens.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(screen.id)}
                    title="Remove screen"
                    className="rounded-md p-1 text-[#8f929d] transition-colors hover:bg-[#f8faff] hover:text-red-500">
                    <Trash2 className="size-[18px]" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCollapsed(c => ({ ...c, [screen.id]: isOpen }))}
                  title={isOpen ? "Collapse" : "Expand"}
                  className="rounded-md p-1 text-[#4a5565] transition-colors hover:bg-[#f8faff]">
                  <ChevronUp className={`size-5 transition-transform ${isOpen ? "" : "rotate-180"}`} />
                </button>
              </div>
            </div>

            {isOpen && (
              <>
                <div className="grid w-full grid-cols-2 gap-8">
                  <Field label="Screen name" required error={errors[`screen.${screen.id}.name`]}>
                    <input
                      className={errors[`screen.${screen.id}.name`] ? fieldErrCn : fieldCn}
                      placeholder="Sports Screen"
                      value={screen.name}
                      onChange={e => patch(screen.id, { name: e.target.value })}
                    />
                  </Field>

                  <Field label="Display type" required error={errors[`screen.${screen.id}.displayType`]}>
                    <Select
                      value={screen.displayType}
                      onValueChange={v => patch(screen.id, { displayType: v })}>
                      <SelectTrigger
                        className={`${
                          errors[`screen.${screen.id}.displayType`] ? fieldErrCn : fieldCn
                        } justify-between`}>
                        <SelectValue placeholder="Select display type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISPLAY_TYPES.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="Width">
                    <div className={`${fieldCn} flex items-center gap-2 py-0`}>
                      <input
                        type="number"
                        min={1}
                        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8f929d]"
                        placeholder="1920"
                        value={screen.widthPx}
                        onChange={e => patch(screen.id, { widthPx: e.target.value })}
                      />
                      <span className="shrink-0 text-right text-sm text-[#8f929d]">px</span>
                    </div>
                  </Field>

                  <Field label="Height">
                    <div className={`${fieldCn} flex items-center gap-2 py-0`}>
                      <input
                        type="number"
                        min={1}
                        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8f929d]"
                        placeholder="1020"
                        value={screen.heightPx}
                        onChange={e => patch(screen.id, { heightPx: e.target.value })}
                      />
                      <span className="shrink-0 text-right text-sm text-[#8f929d]">px</span>
                    </div>
                  </Field>
                </div>

                <Field label="Size label">
                  <input
                    className={fieldCn}
                    placeholder="16:9 landscape"
                    value={screen.sizeLabel}
                    onChange={e => patch(screen.id, { sizeLabel: e.target.value })}
                  />
                </Field>

                <Field label="Acceptable formats">
                  <FormatPicker
                    value={screen.formats}
                    onChange={formats => patch(screen.id, { formats })}
                  />
                </Field>

                <Field
                  label={
                    <>
                      Screen orientation
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-[#8f929d]">
                            <Info className="size-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[260px]">
                          Which way the screen faces. Helps advertisers judge who walks or drives past it.
                        </TooltipContent>
                      </Tooltip>
                    </>
                  }>
                  <input
                    className={fieldCn}
                    placeholder="Faces main street"
                    value={screen.orientation}
                    onChange={e => patch(screen.id, { orientation: e.target.value })}
                  />
                </Field>
              </>
            )}
          </div>
        );
      })}

      <div className="flex w-full flex-col items-start justify-center">
        <button
          type="button"
          onClick={() =>
            onChange([
              ...screens,
              // Mirrors the first screen by default — most spaces price their screens alike.
              { ...emptyScreen(), sameScheduleAs: screens[0]?.id ?? null },
            ])
          }
          className="flex items-center justify-center gap-1.5 rounded-md bg-[#f9f9f9] px-3 py-[9px]
            text-sm font-semibold text-[#4a5565] transition-colors hover:bg-[#f2f5ff] hover:text-[#3a47c2]">
          <Plus className="size-4" />Add Screen
        </button>
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

/** Multi-select rendered as the design's single field — a summary line plus a checklist. */
function FormatPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (fmt: string) =>
    onChange(value.includes(fmt) ? value.filter(f => f !== fmt) : [...value, fmt]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`${fieldCn} flex items-center justify-between gap-2 text-left`}>
          <span className={value.length ? "text-[#1a1d25]" : "text-[#8f929d]"}>
            {value.length ? value.join(", ") : "MP4"}
          </span>
          <ChevronUp className="size-5 shrink-0 rotate-180 text-[#8f929d]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1">
        {AD_FORMATS.map(fmt => {
          const checked = value.includes(fmt);
          return (
            <button
              key={fmt}
              type="button"
              onClick={() => toggle(fmt)}
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm
                text-[#1a1d25] transition-colors hover:bg-[#f8faff]">
              {fmt}
              {checked && <Check className="size-4 text-[#3a47c2]" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
