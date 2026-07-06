import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

type Creative = {
  url: string;
  signed_url?: string;
  mime_type: string;
};


type ViewState =
  | { tag: 'loading' }
  | { tag: 'unpaired'; code: string }
  | { tag: 'off_air' }
  | { tag: 'idle'; slot?: string }
  | { tag: 'playing'; url: string; mime: string; duration: number; booking_id?: number; asset_id?: number };

async function playerFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, opts);
  const body = await res.json();
  // BE wraps in { success, data } or returns fields directly
  return (body.data ?? body) as Record<string, unknown>;
}

async function reportPlayed(deviceId: string, bookingId: number, assetId: number, duration: number) {
  try {
    await fetch(`${BASE}/api/player/${deviceId}/played`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId, asset_id: assetId, duration_seconds: duration, completed: true }),
    });
  } catch { /* best effort */ }
}

function parsePlayerData(data: Record<string, unknown>): ViewState {
  if (data.pairing_code) return { tag: 'unpaired', code: String(data.pairing_code) };
  if (!data.active) return { tag: 'off_air' };
  const asset = data.asset as (Creative & { id?: number; booking_id?: number; duration_seconds?: number }) | null | undefined;
  if (!asset) return { tag: 'idle', slot: (data.slot as { label?: string } | undefined)?.label };
  const url = asset.signed_url ?? asset.url;
  return {
    tag: 'playing',
    url,
    mime: asset.mime_type,
    duration: asset.duration_seconds ?? 15,
    booking_id: asset.booking_id,
    asset_id: asset.id,
  };
}

// ─── Player ──────────────────────────────────────────────────────────────────

function Player({ deviceId }: { deviceId: string }) {
  const [view, setView] = useState<ViewState>({ tag: 'loading' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingUrl = useRef<string | null>(null);

  const clearTimer = () => { if (timer.current) clearTimeout(timer.current); };

  const poll = useCallback(async () => {
    clearTimer();
    try {
      const data = await playerFetch(`/api/player/${deviceId}`);
      const next = parsePlayerData(data);
      setView(next);

      if (next.tag === 'unpaired') {
        timer.current = setTimeout(poll, 5_000);
      } else if (next.tag === 'off_air' || next.tag === 'idle') {
        timer.current = setTimeout(poll, 30_000);
      } else if (next.tag === 'playing') {
        const { mime, duration } = next;
        if (!mime.startsWith('video/')) {
          // Images/GIFs: hold for duration then poll
          timer.current = setTimeout(async () => {
            if (next.booking_id && next.asset_id) {
              await reportPlayed(deviceId, next.booking_id, next.asset_id, duration);
            }
            poll();
          }, duration * 1_000);
        }
        // Videos: poll is triggered by onEnded
      }
    } catch {
      setView({ tag: 'off_air' });
      timer.current = setTimeout(poll, 30_000);
    }
  }, [deviceId]);

  useEffect(() => {
    poll();
    return clearTimer;
  }, [poll]);

  // ── Off air / idle ──────────────────────────────────────────────────────────
  if (view.tag === 'loading') return <Screen />;

  if (view.tag === 'off_air') {
    return (
      <Screen>
        <p className="text-white/20 text-sm font-medium uppercase tracking-[0.25em]">Off Air</p>
      </Screen>
    );
  }

  if (view.tag === 'idle') {
    return (
      <Screen>
        <p className="text-white/20 text-sm font-medium uppercase tracking-[0.25em]">
          {view.slot ?? 'Standby'}
        </p>
      </Screen>
    );
  }

  // ── Unpaired: show pairing code ─────────────────────────────────────────────
  if (view.tag === 'unpaired') {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-8">
          <div className="text-center space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/30">Adtua Player</p>
            <p className="text-white/60 text-sm">Enter this code in your space's device manager</p>
          </div>
          <div className="flex gap-2.5">
            {view.code.split('').map((d, i) => (
              <div key={i}
                className="w-14 h-16 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-3xl font-mono font-bold text-white">
                {d}
              </div>
            ))}
          </div>
          <p className="text-white/20 text-xs font-mono">device: {deviceId}</p>
        </div>
      </Screen>
    );
  }

  // ── Playing ─────────────────────────────────────────────────────────────────
  const { url, mime, duration, booking_id, asset_id } = view;
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
            if (booking_id && asset_id) await reportPlayed(deviceId, booking_id, asset_id, duration);
            poll();
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

// ─── Registration landing ─────────────────────────────────────────────────────

function RegisterLanding() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await playerFetch('/api/player/register', { method: 'POST' });
      const id = data.device_id as string | undefined;
      if (!id) throw new Error('No device_id in response');
      localStorage.setItem('adtua_player_device_id', id);
      navigate(`/player/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-white tracking-tight">Adtua Player</p>
          <p className="text-white/40 text-sm">Virtual browser display for testing</p>
        </div>
        <button
          onClick={handleRegister}
          disabled={busy}
          className="px-7 py-3 bg-[#ff8a00] hover:bg-[#e67700] text-white rounded-xl font-medium transition-colors disabled:opacity-50">
          {busy ? 'Registering…' : 'Register new device'}
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
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

  if (!deviceId) return <RegisterLanding />;
  return <Player deviceId={deviceId} />;
}
