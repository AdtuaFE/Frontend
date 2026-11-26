import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const DEVICE_ID_KEY = 'adtua_player_device_id';

type Creative = {
  url: string;
  signed_url?: string;
  mime_type: string;
};

type ViewState =
  | { tag: 'loading' }
  | { tag: 'unpaired' }
  | { tag: 'off_air' }
  | { tag: 'idle'; slot?: string }
  | { tag: 'filler' }
  | { tag: 'playing'; url: string; mime: string; duration: number; booking_id?: number; asset_id?: number; slot_id?: number; filler_seconds: number; idle_seconds: number; is_default: boolean };

async function fetchPlayerState(deviceId: string) {
  const res = await fetch(`${BASE}/api/player/${deviceId}`);
  const body = await res.json();
  // 404 means the device was removed — same outcome as losing its screen
  if (res.status === 404) return { paired: false } as Record<string, unknown>;
  // BE wraps in { success, data } or returns fields directly
  return (body.data ?? body) as Record<string, unknown>;
}

// Creates the device, already paired to the screen the code was generated for.
async function submitPairingCode(code: string): Promise<string> {
  const res = await fetch(`${BASE}/api/player/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pairing_code: code }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.errors?.[0] ?? body.error ?? 'Pairing failed');
  return body.data.device_id;
}

// The backend needs the slot a play belongs to, to pay the broadcaster and refund unplayed slots.
async function reportPlayed(deviceId: string, bookingId: number, assetId: number, slotId: number, duration: number) {
  try {
    await fetch(`${BASE}/api/player/${deviceId}/played`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, asset_id: assetId, slot_id: slotId, duration_seconds: duration, completed: true }),
    });
  } catch { /* best effort */ }
}

function parsePlayerData(data: Record<string, unknown>): ViewState {
  if (data.paired === false) return { tag: 'unpaired' };
  if (!data.active) return { tag: 'off_air' };
  const asset = data.asset as (Creative & {
    id?: number;
    booking_id?: number;
    duration_seconds?: number;
    filler_seconds?: number;
    idle_seconds?: number;
    is_default?: boolean;
  }) | null | undefined;
  if (!asset) return { tag: 'idle', slot: (data.slot as { label?: string } | undefined)?.label };
  const url = asset.signed_url ?? asset.url;
  return {
    tag: 'playing',
    url,
    mime: asset.mime_type,
    duration: asset.duration_seconds ?? 15,
    booking_id: asset.booking_id,
    asset_id: asset.id,
    slot_id: (data.slot as { id?: number } | null | undefined)?.id,
    filler_seconds: asset.filler_seconds ?? 0,
    idle_seconds: asset.idle_seconds ?? 0,
    is_default: asset.is_default ?? false,
  };
}

// ─── Player ──────────────────────────────────────────────────────────────────

function Player({ deviceId }: { deviceId: string }) {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewState>({ tag: 'loading' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingUrl = useRef<string | null>(null);

  const clearTimer = () => { if (timer.current) clearTimeout(timer.current); };

  const poll = useCallback(async () => {
    clearTimer();
    try {
      const data = await fetchPlayerState(deviceId);
      const next = parsePlayerData(data);
      setView(next);

      if (next.tag === 'unpaired') {
        // Screen deleted or device removed — it needs a new code to come back
        localStorage.removeItem(DEVICE_ID_KEY);
        navigate('/player', { replace: true });
      } else if (next.tag === 'off_air' || next.tag === 'idle') {
        timer.current = setTimeout(poll, 30_000);
      } else if (next.tag === 'playing') {
        const { mime, duration, filler_seconds, idle_seconds, is_default } = next;
        if (!mime.startsWith('video/')) {
          // Images/GIFs: hold for duration then finish
          timer.current = setTimeout(async () => {
            if (!is_default && next.booking_id && next.asset_id && next.slot_id) {
              await reportPlayed(deviceId, next.booking_id, next.asset_id, next.slot_id, duration);
            }
            if (is_default && idle_seconds > 0) {
              setView({ tag: 'off_air' });
              timer.current = setTimeout(poll, idle_seconds * 1_000);
            } else if (!is_default && filler_seconds > 0) {
              setView({ tag: 'filler' });
              timer.current = setTimeout(poll, filler_seconds * 1_000);
            } else {
              poll();
            }
          }, duration * 1_000);
        }
        // Videos: completion handled by onEnded
      }
    } catch {
      setView({ tag: 'off_air' });
      timer.current = setTimeout(poll, 30_000);
    }
  }, [deviceId, navigate]);

  useEffect(() => {
    poll();
    return clearTimer;
  }, [poll]);

  // ── Screens ──────────────────────────────────────────────────────────────────

  if (view.tag === 'loading' || view.tag === 'unpaired') return <Screen />;

  if (view.tag === 'off_air') return <OffAirScreen />;

  if (view.tag === 'idle') {
    return (
      <Screen>
        <p className="text-white/20 text-sm font-medium uppercase tracking-[0.25em]">
          {view.slot ?? 'Standby'}
        </p>
      </Screen>
    );
  }

  if (view.tag === 'filler') {
    return (
      <Screen>
        <p className="text-white/40 text-lg font-bold tracking-widest uppercase">adtua</p>
      </Screen>
    );
  }

  // ── Playing ─────────────────────────────────────────────────────────────────
  const { url, mime, duration, booking_id, asset_id, slot_id, filler_seconds, idle_seconds, is_default } = view;
  const isVideo = mime.startsWith('video/');

  if (isVideo) {
    return (
      <Screen>
        <video
          key={url}
          src={url}
          className="w-full h-full object-contain"
          autoPlay
          muted
          playsInline
          onPlay={e => { (e.target as HTMLVideoElement).muted = false; }}
          onEnded={async () => {
            if (!is_default && booking_id && asset_id && slot_id) {
              await reportPlayed(deviceId, booking_id, asset_id, slot_id, duration);
            }
            if (is_default && idle_seconds > 0) {
              setView({ tag: 'off_air' });
              clearTimer();
              timer.current = setTimeout(poll, idle_seconds * 1_000);
            } else if (!is_default && filler_seconds > 0) {
              setView({ tag: 'filler' });
              clearTimer();
              timer.current = setTimeout(poll, filler_seconds * 1_000);
            } else {
              poll();
            }
          }}
        />
        <Watermark />
      </Screen>
    );
  }

  // Image / GIF
  if (playingUrl.current !== url) playingUrl.current = url;
  return (
    <Screen>
      <img key={url} src={url} alt="" className="w-full h-full object-contain" />
      <Watermark />
    </Screen>
  );
}

// ─── Pairing landing ──────────────────────────────────────────────────────────

function PairingLanding() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Already paired on this device (e.g. after a reboot) — a new code would
  // create a second device record for the same screen.
  useEffect(() => {
    const storedId = localStorage.getItem(DEVICE_ID_KEY);
    if (storedId) navigate(`/player/${storedId}`, { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const id = await submitPairingCode(code);
      localStorage.setItem(DEVICE_ID_KEY, id);
      navigate(`/player/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pairing failed');
      setCode('');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-6 text-center">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-white tracking-tight">Adtua Player</p>
          <p className="text-white/40 text-sm">Enter the code from your screen's page in the Adtua dashboard</p>
        </div>
        <InputOTP maxLength={6} pattern={REGEXP_ONLY_DIGITS} value={code} onChange={setCode} autoFocus>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <InputOTPSlot key={i} index={i} className="h-14 w-12 border-white/20 text-2xl font-mono text-white" />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="px-7 py-3 bg-[#3a47c2] hover:bg-[#e67700] text-white rounded-xl font-medium transition-colors disabled:opacity-50">
          {busy ? 'Pairing…' : 'Pair this device'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </form>
    </Screen>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Screen({ children }: { children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden">
      {children}
    </div>
  );
}

function OffAirScreen() {
  return (
    <Screen>
      <div className="flex flex-col items-center gap-5 select-none">
        <span className="text-[#3a47c2]/60 text-3xl font-bold tracking-[0.2em] uppercase">adtua</span>
        <div className="flex items-center gap-3">
          <span className="block h-px w-8 bg-white/10" />
          <p className="text-white/20 text-xs font-semibold uppercase tracking-[0.35em]">Off Air</p>
          <span className="block h-px w-8 bg-white/10" />
        </div>
      </div>
    </Screen>
  );
}

function Watermark() {
  return (
    <span className="absolute bottom-3 right-4 text-white/15 text-xs font-semibold tracking-widest select-none pointer-events-none uppercase">
      adtua
    </span>
  );
}

// ─── Route entry ─────────────────────────────────────────────────────────────

export default function PlayerPage() {
  const { deviceId } = useParams<{ deviceId?: string }>();

  if (!deviceId) return <PairingLanding />;
  return <Player deviceId={deviceId} />;
}
