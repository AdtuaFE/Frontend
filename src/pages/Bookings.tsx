import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

type AdvertiserBooking = {
  id: number;
  campaign_id: number;
  space_id: number;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number | null;
};

type BroadcasterBooking = {
  id: number;
  campaign_id: number;
  space_id: number;
  status: string;
  start_date: string;
  end_date: string;
  total_price: number | null;
  space_name?: string;
  campaign_name?: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  accepted:  "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-blue-100 text-blue-700",
};

const Bookings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdvertiser = user?.roles.includes("advertiser") ?? false;
  const isBroadcaster = user?.roles.includes("broadcaster") ?? false;
  const isDualRole = isAdvertiser && isBroadcaster;

  const { data: advertiserBookings = [], isLoading: loadingAdv } = useQuery<AdvertiserBooking[]>({
    queryKey: ["bookings-advertiser"],
    queryFn: () => api.get<AdvertiserBooking[]>("/api/bookings"),
    enabled: isAdvertiser,
  });

  const { data: broadcasterBookings = [], isLoading: loadingBc } = useQuery<BroadcasterBooking[]>({
    queryKey: ["broadcaster-bookings"],
    queryFn: () => api.get<BroadcasterBooking[]>("/api/broadcaster/bookings/incoming"),
    enabled: isBroadcaster,
  });

  const isLoading = loadingAdv || loadingBc;

  if (isLoading) {
    return (
      <AppLayout activeNav="bookings">
        <div className="flex items-center justify-center py-40 text-muted-foreground text-sm">
          Loading bookings…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeNav="bookings">
      <div className="max-w-6xl mx-auto space-y-10">
        <div>
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="mt-1 text-muted-foreground">All your ad space bookings in one place.</p>
        </div>

        {/* Advertiser: their outgoing bookings */}
        {isAdvertiser && (
          <section>
            {isDualRole && (
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                My bookings
                <span className="text-xs font-medium rounded-full px-2.5 py-0.5 bg-blue-100 text-blue-700">advertiser</span>
              </h2>
            )}
            {advertiserBookings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {advertiserBookings.map(b => (
                  <Card key={b.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                    onClick={() => navigate(`/bookings/${b.id}`)}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Booking #{b.id}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Space #{b.space_id}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[b.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{b.start_date} – {b.end_date}</p>
                      {b.total_price != null && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Total: <span className="font-medium text-foreground">${b.total_price.toLocaleString()}</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                No bookings yet. Browse spaces and book an ad slot to get started.
              </div>
            )}
          </section>
        )}

        {/* Broadcaster: incoming bookings on their spaces */}
        {isBroadcaster && (
          <section>
            {isDualRole && (
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                Incoming bookings
                <span className="text-xs font-medium rounded-full px-2.5 py-0.5 bg-purple-100 text-purple-700">broadcaster</span>
              </h2>
            )}
            {broadcasterBookings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {broadcasterBookings.map(b => (
                  <Card key={b.id} className="cursor-pointer hover:border-[#ff8a00] transition-colors"
                    onClick={() => navigate(`/bookings/${b.id}`)}>
                    <CardContent className="pt-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Booking #{b.id}</p>
                          <h3 className="font-semibold text-sm mt-0.5">{b.space_name ?? `Space #${b.space_id}`}</h3>
                          {b.campaign_name && <p className="text-xs text-muted-foreground mt-0.5">{b.campaign_name}</p>}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[b.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {b.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{b.start_date} – {b.end_date}</p>
                      {b.total_price != null && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Revenue: <span className="font-medium text-foreground">${b.total_price.toLocaleString()}</span>
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                No incoming bookings yet.
              </div>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default Bookings;
