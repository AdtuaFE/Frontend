import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

type PairingCode = {
  screen_id: number;
  pairing_code: string;
  expires_at: string;
};

type Device = {
  device_id: string;
  screen_id: number | null;
};

function formatRemaining(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${Math.floor(totalSeconds / 60)}:${seconds}`;
}

// One row per screen: the broadcaster generates a code here, so the code is
// tied to this screen, then enters it on the physical device.
export function ScreenPairingCode({ spaceId, screen }: { spaceId: number; screen: { id: number; label: string } }) {
  const queryClient = useQueryClient();
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [expired, setExpired] = useState(false);
  const [generating, setGenerating] = useState(false);
  const knownDeviceIds = useRef(new Set<string>());

  const devicesQuery = {
    queryKey: ["space-devices", spaceId],
    queryFn: () => api.get<Device[]>(`/api/spaces/${spaceId}/devices`),
  };

  // Shares its cache with the page's device list, so polling here also
  // refreshes that list when the device comes online.
  const { data: devices = [] } = useQuery<Device[]>({
    ...devicesQuery,
    enabled: !!pairing,
    refetchInterval: pairing ? 5_000 : false,
  });

  useEffect(() => {
    if (!pairing) return;
    const paired = devices.some(d => d.screen_id === screen.id && !knownDeviceIds.current.has(d.device_id));
    if (paired) {
      setPairing(null);
      toast.success(`Device paired to ${screen.label}`);
    }
  }, [devices, pairing, screen.id, screen.label]);

  useEffect(() => {
    if (!pairing) return;
    const tick = () => {
      const remaining = new Date(pairing.expires_at).getTime() - Date.now();
      if (remaining <= 0) {
        setPairing(null);
        setExpired(true);
      } else {
        setRemainingMs(remaining);
      }
    };
    tick();
    const interval = setInterval(tick, 1_000);
    return () => clearInterval(interval);
  }, [pairing]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const [code, existing] = await Promise.all([
        api.post<PairingCode>(`/api/spaces/${spaceId}/screens/${screen.id}/pairing-code`),
        queryClient.fetchQuery(devicesQuery),
      ]);
      knownDeviceIds.current = new Set(existing.map(d => d.device_id));
      setExpired(false);
      setPairing(code);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate a pairing code");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">{screen.label}</p>
        {pairing ? (
          <p className="text-xs text-muted-foreground">Expires in {formatRemaining(remainingMs)}</p>
        ) : expired ? (
          <p className="text-xs text-muted-foreground">Code expired. Generate a new one.</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {pairing && (
          <p className="font-mono text-2xl font-bold tracking-[0.25em]" aria-label="Pairing code">
            {pairing.pairing_code}
          </p>
        )}
        <Button
          onClick={handleGenerate}
          disabled={generating}
          variant={pairing ? "outline" : "default"}
          className={pairing ? undefined : "bg-[#3a47c2] text-white hover:bg-[#2f3a9e]"}>
          {generating ? "Generating…" : pairing ? "New code" : "Generate code"}
        </Button>
      </div>
    </div>
  );
}
