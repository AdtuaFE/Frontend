import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** What the advertiser's wallet has free to spend, or null while it loads. No wallet yet reads as $0. */
export function useWalletAvailable(enabled = true): number | null {
  const { data, error } = useQuery<{ available: number | string }>({
    queryKey: ["wallet"],
    queryFn: () => api.get<{ available: number | string }>("/api/wallet"),
    enabled,
    retry: false,
  });
  return data ? Number(data.available) : error?.message === "Wallet not found" ? 0 : null;
}
