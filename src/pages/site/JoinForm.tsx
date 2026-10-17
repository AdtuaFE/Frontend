import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api } from "@/lib/api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  id: string;
  tone: "onIndigo" | "onTint";
  onJoined: () => void;
  hint?: string;
};

/**
 * Waitlist email form. POST /api/waitlist returns 201 for a new address and 200 for one already on the
 * list; both show the same success state, as the design does.
 */
export function JoinForm({ id, tone, onJoined, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<"invalid" | "failed" | null>(null);
  const [sending, setSending] = useState(false);
  const errId = `${id}-err`;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    const email = inputRef.current?.value.trim() ?? "";
    if (!EMAIL.test(email)) {
      setError("invalid");
      inputRef.current?.focus();
      return;
    }
    setSending(true);
    setError(null);
    try {
      await api.post("/api/waitlist", { email });
      onJoined();
    } catch {
      setError("failed");
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" && error) setError(null);
  };

  return (
    <form noValidate onSubmit={submit} style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 16, marginTop: tone === "onIndigo" ? 8 : 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 6, background: "#FFFFFF", borderRadius: 16, border: tone === "onTint" ? "1px solid #7B82C2" : undefined }}>
        <label htmlFor={id} className="sr">Email address</label>
        <input
          ref={inputRef}
          id={id}
          type="email"
          placeholder="you@business.com"
          autoComplete="email"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errId : undefined}
          onKeyDown={onKeyDown}
          style={{ flex: "1 1 240px", minWidth: 0, height: 52, border: 0, borderRadius: 10, padding: "0 14px", font: "400 16px 'Instrument Sans', sans-serif", color: "#15173A", background: "#FFFFFF", outlineColor: "#3A47C2" }}
        />
        <button type="submit" className="btn" disabled={sending} style={{ flex: "0 0 auto", borderRadius: 10, background: "#3A47C2", color: "#FFFFFF" }}>
          {sending ? "Joining…" : "Join the waitlist"}
        </button>
      </div>
      {error && (
        <p id={errId} className="err" role="alert" style={{ color: tone === "onIndigo" ? "#FFFFFF" : "#B42318" }}>
          {error === "invalid"
            ? "Enter an email address like name@business.com."
            : "We couldn't add you just now. Try again in a moment."}
        </p>
      )}
      {hint && <p style={{ fontSize: 15, color: "#D3D8F8" }}>{hint}</p>}
    </form>
  );
}

export function Joined() {
  return (
    <div className="done" role="status" style={{ width: "100%", maxWidth: 560, background: "#FFFFFF", color: "#15173A", borderRadius: 16, padding: "18px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, textAlign: "left" }}>
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#3A47C2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
        <circle cx="12" cy="12" r="10" />
        <path className="tick-p" d="m7.5 12.5 3 3 6-7" />
      </svg>
      <div style={{ flex: "1 1 200px" }}>
        <b style={{ display: "block", fontSize: 17, fontWeight: 600 }}>You're on the list</b>
        <span style={{ fontSize: 15, color: "#4A4D66" }}>We'll email you the day sign-up opens.</span>
      </div>
    </div>
  );
}
