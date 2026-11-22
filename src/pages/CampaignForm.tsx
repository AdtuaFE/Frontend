import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarSearch, MapPin, OctagonAlert, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, Breadcrumb, CampaignButton } from "@/components/campaigns/CampaignBits";
import {
  campaignFormErrors, fmtDate, parseDay, type Campaign, type CampaignFormValues as Form,
} from "@/components/campaigns/campaignData";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const EMPTY: Form = {
  name: "", objective: "", total_budget: "", start_date: "", end_date: "", location: "", visibility: "public", ad_type: "image",
};

const fromCampaign = (c: Campaign): Form => ({
  name: c.name ?? "",
  objective: c.objective ?? "",
  total_budget: String(c.total_budget ?? ""),
  start_date: c.start_date?.slice(0, 10) ?? "",
  end_date: c.end_date?.slice(0, 10) ?? "",
  location: c.location ?? "",
  visibility: c.visibility === "private" ? "private" : "public",
  ad_type: c.ad_type === "video" ? "video" : "image",
});

const FIELD_IDS: Partial<Record<keyof Form, string>> = { name: "c-name", total_budget: "c-budget", start_date: "c-start", end_date: "c-end" };
const FIELD_LABELS: Partial<Record<keyof Form, string>> = { name: "campaign name", total_budget: "budget", start_date: "start date", end_date: "end date" };

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const boxCn = (error?: string) =>
  cn(
    "flex min-h-[46px] w-full items-center gap-2 rounded-lg border bg-white p-3 text-sm text-text-primary transition-colors",
    "focus-within:border-text-brand focus-within:ring-1 focus-within:ring-text-brand",
    error ? "border-border-danger" : "border-border-default",
  );
const bareInputCn = "min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#8f929d]";

function Field({ label, htmlFor, hint, error, children }: { label: string; htmlFor?: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-3">
      <label htmlFor={htmlFor} className="text-sm font-medium text-text-secondary">{label}</label>
      <div className="flex w-full flex-col gap-1.5">
        {children}
        {error ? (
          <p className="flex items-center gap-1.5 text-xs leading-5 text-text-danger">
            <OctagonAlert className="size-4 shrink-0" aria-hidden="true" />{error}
          </p>
        ) : hint ? <p className="text-xs leading-5 text-text-tertiary">{hint}</p> : null}
      </div>
    </div>
  );
}

function DateField({ id, label, value, error, onChange, disabledBefore }: {
  id: string; label: string; value: string; error?: string; onChange: (iso: string) => void; disabledBefore?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Field label={label} htmlFor={id} error={error}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button id={id} type="button" className={cn(boxCn(error), "text-left")}>
            <CalendarSearch className="size-5 shrink-0 text-[#7d808a]" aria-hidden="true" />
            <span className={value ? "" : "text-[#8f929d]"}>{value ? fmtDate(value) : "mm/dd/yyyy"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value ? parseDay(value) : undefined}
            defaultMonth={value ? parseDay(value) : disabledBefore ? parseDay(disabledBefore) : undefined}
            disabled={disabledBefore ? { before: parseDay(disabledBefore) } : undefined}
            onSelect={d => { if (d) { onChange(isoOf(d)); setOpen(false); } }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function Choice({ name, checked, onChange, title, children }: { name: string; checked: boolean; onChange: () => void; title: string; children: ReactNode }) {
  return (
    <label className="flex w-full cursor-pointer items-start gap-3">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          "mt-px grid size-[18px] shrink-0 place-items-center rounded-full border-[0.8px] peer-focus-visible:ring-2 peer-focus-visible:ring-[#3a47c2] peer-focus-visible:ring-offset-2",
          checked ? "border-[#3a47c2]" : "border-[#8f929d]",
        )}>
        {checked && <span className="size-2 rounded-full bg-[#3a47c2]" />}
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-sm font-medium leading-5 text-text-primary">{title}</span>
        <span className="text-[13px] leading-[18px] text-text-tertiary">{children}</span>
      </span>
    </label>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-4 rounded-xl border-[0.8px] border-border-default bg-white p-5">
      <h2 className="text-base font-semibold leading-6 text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

/** /campaigns/new creates a draft; /campaigns/:id/edit changes an existing campaign. */
export default function CampaignForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: campaign } = useQuery<Campaign>({
    queryKey: ["campaign", Number(id)],
    queryFn: () => api.get<Campaign>(`/api/campaigns/${id}`),
    enabled: editing,
  });

  const [form, setForm] = useState<Form>(EMPTY);
  const [initial, setInitial] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  /** Set when saving fails; message is the API's reason, or null when the request never got through. */
  const [failure, setFailure] = useState<{ message: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const failureRef = useRef<HTMLDivElement>(null);

  // The banner sits under the title; scroll the app's own panel (not the window) back up to it.
  useEffect(() => {
    if (failure) failureRef.current?.closest("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [failure]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  // `campaign` gets a new object on every refetch (e.g. a window-focus refetch while
  // editing), so only resync from it when there's nothing unsaved to lose.
  useEffect(() => {
    if (!campaign || dirty) return;
    setForm(fromCampaign(campaign));
    setInitial(fromCampaign(campaign));
  }, [campaign]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  };
  const backTo = editing ? `/campaigns/${id}` : "/campaigns";

  const submit = async () => {
    const e = campaignFormErrors(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setFailure(null);
    const body = {
      name: form.name.trim(),
      objective: form.objective.trim() || null,
      total_budget: Number(form.total_budget),
      start_date: form.start_date,
      end_date: form.end_date,
      location: form.location.trim() || null,
      visibility: form.visibility,
      ad_type: form.ad_type,
    };
    try {
      if (editing) {
        await api.put(`/api/campaigns/${id}`, body);
        await queryClient.invalidateQueries({ queryKey: ["campaign", Number(id)] });
        await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        navigate(`/campaigns/${id}`, { state: { toast: "Changes saved" } });
      } else {
        const created = await api.post<Campaign>("/api/campaigns", body);
        await queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        navigate(`/campaigns/${created.id}`, { state: { toast: "Campaign created" } });
      }
    } catch (err) {
      // A failed request leaves everything in place; the banner says what to do next.
      setFailure({ message: err instanceof Error && !(err instanceof TypeError) ? err.message : null });
      setSaving(false);
    }
  };

  const title = editing ? "Edit campaign" : "Create new campaign";
  const errorFields = (Object.keys(FIELD_IDS) as (keyof Form)[]).filter(k => errors[k]).map(k => [k, FIELD_LABELS[k] as string] as const);

  return (
    <AppLayout activeNav="campaigns">
      <div className="mx-auto flex w-full max-w-[1164px] flex-col gap-6 pb-14 pt-2">
        <Breadcrumb
          current={title}
          parent={editing ? { label: campaign?.name ?? "Campaign", to: `/campaigns/${id}` } : undefined}
        />
        <h1 className="min-h-10 text-2xl font-semibold text-text-primary">{title}</h1>

        {errorFields.length > 0 && (
          <Alert tone="error" title={`Fix ${errorFields.length} ${errorFields.length === 1 ? "field" : "fields"} to ${editing ? "save your changes" : "create your campaign"}`}>
            Check{" "}
            {errorFields.map(([key, label], i) => (
              <span key={key}>
                {i > 0 && (i === errorFields.length - 1 ? " and " : ", ")}
                <a
                  href={`#${FIELD_IDS[key]}`}
                  onClick={e => { e.preventDefault(); document.getElementById(FIELD_IDS[key])?.focus(); }}
                  className="font-medium underline underline-offset-2">
                  {label}
                </a>
              </span>
            ))}
            , then {editing ? "save again" : "create the campaign again"}.
          </Alert>
        )}

        {failure && (
          <div ref={failureRef}>
            <Alert tone="error" title={editing ? "We couldn't save your changes" : "We couldn't create your campaign"}>
              {editing
                ? failure.message ?? "Everything you entered is still here. Check your connection and select Save changes again."
                : "Something went wrong on our side and nothing was saved. Your details are still here. Try again in a moment."}
            </Alert>
          </div>
        )}

        <div className="grid w-full grid-cols-1 gap-x-20 gap-y-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col gap-6">
              <Field label="Campaign name" htmlFor="c-name" error={errors.name}>
                <div className={boxCn(errors.name)}>
                  <input id="c-name" className={bareInputCn} placeholder="Campaign name" value={form.name} onChange={e => set("name", e.target.value)} />
                </div>
              </Field>
              <Field label="Description (optional)" htmlFor="c-desc" hint="Shown to broadcasters on public campaigns.">
                <div className={cn(boxCn(), "h-[100px] items-start")}>
                  <textarea id="c-desc" className={cn(bareInputCn, "h-full resize-none")} placeholder="What you're promoting and where you'd like it seen."
                    value={form.objective} onChange={e => set("objective", e.target.value)} />
                </div>
              </Field>
            </div>

            <div className="flex flex-col gap-6">
              <h2 className="text-base font-semibold leading-6 text-text-primary">Budget and dates</h2>
              <Field label="Total budget" htmlFor="c-budget" hint="The most you'll spend across every booking." error={errors.total_budget}>
                <div className={boxCn(errors.total_budget)}>
                  <input id="c-budget" inputMode="decimal" className={cn(bareInputCn, "tabular-nums")} placeholder="$ 0.00" value={form.total_budget}
                    onChange={e => set("total_budget", e.target.value.replace(/[^\d.]/g, ""))} />
                </div>
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DateField id="c-start" label="Start date" value={form.start_date} error={errors.start_date} onChange={v => set("start_date", v)} disabledBefore={isoOf(new Date())} />
                <DateField id="c-end" label="End date" value={form.end_date} error={errors.end_date} onChange={v => set("end_date", v)} disabledBefore={form.start_date || undefined} />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <h2 className="text-base font-semibold leading-6 text-text-primary">Location and ad</h2>
              <Field label="Where should people see it" htmlFor="c-where">
                <div className={boxCn()}>
                  <MapPin className="size-5 shrink-0 text-[#7d808a]" aria-hidden="true" />
                  <input id="c-where" className={bareInputCn} placeholder="Bloomington, IN" value={form.location} onChange={e => set("location", e.target.value)} />
                </div>
              </Field>
              <fieldset className="flex flex-col gap-4">
                <legend className="mb-4 text-sm font-medium text-text-secondary">Ad type</legend>
                <Choice name="ad-type" checked={form.ad_type === "image"} onChange={() => set("ad_type", "image")} title="Image">
                  A still graphic that plays for the length of each spot.
                </Choice>
                <Choice name="ad-type" checked={form.ad_type === "video"} onChange={() => set("ad_type", "video")} title="Video">
                  MP4 or MOV, up to 100MB.
                </Choice>
              </fieldset>
            </div>
          </div>

          <div className="flex flex-col gap-5 self-start lg:sticky lg:top-0">
            <Card title="Visibility">
              <div className="flex flex-col gap-3">
                <Choice name="visibility" checked={form.visibility === "public"} onChange={() => set("visibility", "public")} title="Public">
                  Broadcasters can find it once it's live and send you offers.
                </Choice>
                <Choice name="visibility" checked={form.visibility === "private"} onChange={() => set("visibility", "private")} title="Private">
                  Only you. You book every screen yourself.
                </Choice>
              </div>
            </Card>
          </div>
        </div>

        <div className="flex items-center justify-end gap-8">
          <CampaignButton size="md" onClick={() => (dirty ? setConfirmLeave(true) : navigate(backTo))}>Cancel</CampaignButton>
          <CampaignButton size="md" variant="primary" disabled={saving} onClick={submit}>
            {saving ? (editing ? "Saving…" : "Creating…") : editing ? "Save changes" : "Create campaign"}
          </CampaignButton>
        </div>
      </div>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent className="max-w-[480px] gap-2 rounded-xl p-6">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setConfirmLeave(false)}
            className="absolute right-4 top-4 rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-muted hover:text-text-primary">
            <X className="size-5" aria-hidden="true" />
          </button>
          <AlertDialogHeader className="space-y-2 text-left">
            <AlertDialogTitle className="pr-8 text-xl font-semibold leading-7 text-text-primary">
              {editing ? "Discard your changes?" : "Discard this campaign?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-5 text-text-secondary">
              {editing ? "You'll lose the changes you made." : "You haven't created it yet. If you leave now, the details you entered won't be saved."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-8">
            <CampaignButton size="md" onClick={() => setConfirmLeave(false)}>Keep editing</CampaignButton>
            <CampaignButton size="md" variant="danger" onClick={() => navigate(backTo)}>Discard</CampaignButton>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
