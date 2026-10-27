import { useState } from "react";
import { ChevronUp, Plus, Clock, DollarSign, X, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatDate } from "@/lib/dates";
import { AdornedInput, Field, StepNav, TextInput } from "./primitives";
import { SlotGrid } from "./SlotGrid";
import {
  DAYS, effectiveSlots, emptySlot, formatDays, slotLabel, slotMinutes, slotPlays, slotPricePerPlay,
  type DayKey, type ScreenDraft, type TimeSlot,
} from "./types";

type Props = {
  screens: ScreenDraft[];
  errors: Record<string, string>;
  onChange: (screens: ScreenDraft[]) => void;
  onBack: () => void;
  onNext: () => void;
};

export function StepSchedule({ screens, errors, onChange, onBack, onNext }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const patchScreen = (id: string, p: Partial<ScreenDraft>) =>
    onChange(screens.map(s => (s.id === id ? { ...s, ...p } : s)));

  return (
    <div className="flex w-full flex-col gap-8">
      {screens.map((screen, index) => {
        const isOpen = !collapsed[screen.id];
        const title = screen.name.trim() || `Screen ${index + 1}`;
        const mirrors = screen.sameScheduleAs
          ? screens.find(s => s.id === screen.sameScheduleAs)
          : null;
        // Every later screen can only mirror screen 1, which never mirrors anything, so the chain can't loop.
        const mirrorTarget = index > 0 ? screens[0] : null;

        return (
          <div
            key={screen.id}
            className="flex w-full flex-col gap-8 rounded-[24px] border border-[#e8e8e8] bg-white p-8">
            <div className="flex w-full items-center justify-between">
              <p className="text-lg font-semibold text-[#4a5565]">{title}</p>
              <button
                type="button"
                onClick={() => setCollapsed(c => ({ ...c, [screen.id]: isOpen }))}
                title={isOpen ? "Collapse" : "Expand"}
                className="rounded-md p-1 text-[#4a5565] transition-colors hover:bg-[#f8faff]">
                <ChevronUp className={`size-5 transition-transform ${isOpen ? "" : "rotate-180"}`} />
              </button>
            </div>

            {isOpen && (
              <>
                {mirrorTarget && (
                  <div className="flex w-full items-start gap-3">
                    <Switch
                      checked={screen.sameScheduleAs !== null}
                      onCheckedChange={on =>
                        patchScreen(screen.id, {
                          sameScheduleAs: on ? mirrorTarget.id : null,
                          // Turning it off starts this screen from a copy of what it mirrored.
                          slots: on
                            ? screen.slots
                            : mirrorTarget.slots.map(s => ({ ...s, id: Math.random().toString(36).slice(2, 10) })),
                        })
                      }
                    />
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-[#1a1d25]">
                        Same slots and prices as {mirrorTarget.name.trim() || "Screen 1"}
                      </p>
                      <p className="text-sm text-[#767676]">
                        Turn off to set this screen's own. It starts from a copy.
                      </p>
                    </div>
                  </div>
                )}

                {mirrors ? (
                  <SlotGrid slots={effectiveSlots(screen, screens)} />
                ) : (
                  <>
                    <div className="flex w-full flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-[#4a4d56]">Time slots</p>
                        <p className="text-sm leading-5 text-[#767676]">
                          When ads can run and what you charge for each window. Advertisers buy
                          15-second plays and pay their share of the price.
                        </p>
                      </div>

                      {screen.slots.map((slot, slotIndex) => (
                        <TimeSlotCard
                          key={slot.id}
                          slot={slot}
                          index={slotIndex}
                          canRemove={screen.slots.length > 1}
                          error={errors[`slot.${slot.id}`]}
                          timeError={errors[`slot.${slot.id}.time`]}
                          onChange={next =>
                            patchScreen(screen.id, {
                              slots: screen.slots.map(s => (s.id === slot.id ? next : s)),
                            })
                          }
                          onRemove={() =>
                            patchScreen(screen.id, {
                              slots: screen.slots.filter(s => s.id !== slot.id),
                            })
                          }
                        />
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          patchScreen(screen.id, {
                            slots: [...screen.slots, emptySlot(screen.slots.length)],
                          })
                        }
                        className="flex h-8 w-fit items-center gap-1.5 rounded-md px-2 text-sm
                          font-medium text-[#3a47c2] transition-colors hover:bg-[#f2f5ff]">
                        <Plus className="size-4" />Add time slot
                      </button>
                    </div>

                    <BlockedDates
                      dates={screen.blockedDates}
                      onChange={blockedDates => patchScreen(screen.id, { blockedDates })}
                    />
                  </>
                )}
              </>
            )}
          </div>
        );
      })}

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

function TimeSlotCard({
  slot, index, canRemove, error, timeError, onChange, onRemove,
}: {
  slot: TimeSlot;
  index: number;
  canRemove: boolean;
  error?: string;
  timeError?: string;
  onChange: (slot: TimeSlot) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);

  const toggleDay = (day: DayKey) =>
    onChange({
      ...slot,
      days: slot.days.includes(day) ? slot.days.filter(d => d !== day) : [...slot.days, day],
    });

  const minutes = slotMinutes(slot);
  const hours = minutes / 60;
  const plays = slotPlays(slot);
  const perPlay = slotPricePerPlay(slot);
  const price = Number(slot.pricePerDay);

  return (
    <div className="w-full rounded-xl border border-[#e8e8e8] bg-white">
      <div className="flex w-full items-center gap-4 py-3.5 pl-5 pr-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-semibold leading-5 text-[#4a4d56]">
            {slotLabel(slot, index)}
          </p>
          <div className="flex items-center gap-1.5 text-sm leading-5 text-[#767676]">
            <span>{slot.days.length ? formatDays(slot.days) : "No days"}</span>
            <span>·</span>
            <span>{price > 0 ? `$${price}` : "No price"}</span>
          </div>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove time slot"
            className="rounded-md p-1.5 text-[#8f929d] transition-colors hover:bg-[#f8faff] hover:text-red-500">
            <Trash2 className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          title={open ? "Collapse" : "Expand"}
          className="flex size-8 items-center justify-center rounded-md text-[#4a5565] transition-colors hover:bg-[#f8faff]">
          <ChevronUp className={`size-4 transition-transform ${open ? "" : "rotate-180"}`} />
        </button>
      </div>

      {open && (
        <div className="flex w-full flex-col gap-5 border-t border-[#e8e8e8] p-5">
          <Field label="Name">
            <TextInput
              placeholder={`Time Slot ${index + 1}`}
              value={slot.name}
              onChange={e => onChange({ ...slot, name: e.target.value })}
            />
          </Field>

          <div className="flex w-full flex-col gap-3">
            <p className="text-sm font-semibold leading-[17px] text-[#4a4d56]">Days</p>
            <div className="flex w-full gap-2">
              {DAYS.map(day => {
                const on = slot.days.includes(day.key);
                return (
                  <button
                    key={day.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(day.key)}
                    className={`flex size-14 min-h-14 min-w-14 flex-col items-center justify-center
                      rounded-lg px-3 text-sm font-medium transition-colors ${
                        on
                          ? "bg-[#3a47c2] text-white"
                          : "border border-[#e3e5ea] bg-white text-[#656972] hover:bg-[#f8faff]"
                      }`}>
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex w-full flex-col gap-3">
            <div className="flex w-full items-start gap-6">
              <Field label="Starts">
                <AdornedInput
                  type="time"
                  step={1800}
                  className="time-input"
                  value={slot.startTime}
                  onChange={e => onChange({ ...slot, startTime: e.target.value })}
                  end={<Clock className="size-5 shrink-0 text-[#8f929d]" />}
                />
              </Field>

              <Field label="Ends" error={timeError}>
                <AdornedInput
                  type="time"
                  step={1800}
                  className="time-input"
                  value={slot.endTime}
                  onChange={e => onChange({ ...slot, endTime: e.target.value })}
                  end={<Clock className="size-5 shrink-0 text-[#8f929d]" />}
                />
              </Field>

              <Field label="Price per day" error={error}>
                <AdornedInput
                  type="number"
                  min={0}
                  step="0.01"
                  className="no-spinner"
                  placeholder="50"
                  value={slot.pricePerDay}
                  onChange={e => onChange({ ...slot, pricePerDay: e.target.value })}
                  start={<DollarSign className="size-5 shrink-0 text-[#8f929d]" />}
                />
              </Field>
            </div>

            {minutes > 0 && (
              <div className="flex items-center gap-1.5 text-sm leading-5 text-[#767676]">
                <span>{hours % 1 === 0 ? `${hours} hours` : `${hours.toFixed(1)} hours`}</span>
                <span>·</span>
                <span>{plays.toLocaleString()} plays of 15 seconds</span>
                {perPlay > 0 && (
                  <>
                    <span>·</span>
                    <span>about ${perPlay.toFixed(2)} a play</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BlockedDates({
  dates, onChange,
}: {
  dates: string[];
  onChange: (dates: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const add = (date: Date | undefined) => {
    if (!date) return;
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    if (!dates.includes(iso)) onChange([...dates, iso].sort());
    setOpen(false);
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-sm font-semibold text-[#4a4d56]">Blocked dates (holidays or closures)</p>
      <div className="flex flex-wrap items-center gap-2">
        {dates.map(iso => (
          <span
            key={iso}
            className="flex h-8 items-center gap-2 rounded-lg border border-[#e3e5ea] bg-white px-3 text-sm text-[#1a1d25]">
            {formatDate(iso)}
            <button
              type="button"
              onClick={() => onChange(dates.filter(d => d !== iso))}
              title="Remove blocked date"
              className="text-[#8f929d] transition-colors hover:text-red-500">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium
                text-[#3a47c2] transition-colors hover:bg-[#f2f5ff]">
              <Plus className="size-4" />Add block date
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              mode="single"
              onSelect={add}
              disabled={{ before: new Date() }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
