import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, CalendarRange, DollarSign, Monitor } from "lucide-react";

type Campaign = {
  id: number;
  advertiser_id: number;
  name: string;
  objective: string | null;
  total_budget: number | null;
  budget_period: string | null;
  location: string | null;
  ad_type: string | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  visibility: string;
};

const fmt = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

function MetaChip({ icon: Icon, label }: { icon: typeof MapPin; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

const BrowseCampaigns = () => {
  const navigate = useNavigate();

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns-public"],
    queryFn: () => api.get<Campaign[]>("/api/campaigns/public"),
  });

  if (isLoading) {
    return (
      <AppLayout activeNav="campaigns">
        <div className="flex items-center justify-center py-40 text-muted-foreground">
          Loading campaigns…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activeNav="campaigns">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="mt-1 text-muted-foreground">
            Browse active campaigns looking for ad spaces.
          </p>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            No active public campaigns right now. Check back soon.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map(c => (
              <Card
                key={c.id}
                className="cursor-pointer hover:border-[#ff8a00] transition-colors flex flex-col"
                onClick={() => navigate(`/campaigns/${c.id}`)}>
                <CardContent className="pt-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-tight">{c.name}</h3>
                    <span className="shrink-0 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-medium capitalize">
                      {c.status}
                    </span>
                  </div>

                  {c.objective && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{c.objective}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                    {c.location && <MetaChip icon={MapPin} label={c.location} />}
                    {c.total_budget != null && (
                      <MetaChip
                        icon={DollarSign}
                        label={`$${c.total_budget.toLocaleString()}${c.budget_period ? ` / ${c.budget_period}` : ""}`}
                      />
                    )}
                    {c.ad_type && <MetaChip icon={Monitor} label={fmt(c.ad_type)} />}
                    {(c.start_date || c.end_date) && (
                      <MetaChip
                        icon={CalendarRange}
                        label={[c.start_date, c.end_date].filter(Boolean).join(" → ")}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BrowseCampaigns;
