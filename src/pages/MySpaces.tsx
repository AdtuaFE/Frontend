import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { SpaceCard, type Space } from "@/pages/Browse";

const MySpaces = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const addSpace = () => navigate("/spaces/new");

  const { data: mySpaces = [], isLoading } = useQuery<Space[]>({
    queryKey: ["spaces-mine"],
    queryFn: () => api.get<Space[]>("/api/spaces/mine"),
  });

  const q = searchQuery.trim().toLowerCase();
  const spaces = q
    ? mySpaces.filter(s => s.name.toLowerCase().includes(q) || (s.city ?? "").toLowerCase().includes(q))
    : mySpaces;

  return (
    <AppLayout activeNav="spaces" searchValue={searchQuery} onSearchChange={setSearchQuery}
      searchPlaceholder="Search your spaces">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My spaces</h1>
            <p className="mt-1 text-muted-foreground">Manage the screens you've listed for advertisers.</p>
          </div>
          <Button className="bg-[#3a47c2] hover:bg-[#2f3a9e] text-white shrink-0" onClick={addSpace}>
            <Plus className="h-4 w-4 mr-1.5" />Add space
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-40 text-muted-foreground">Loading spaces…</div>
        ) : spaces.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {spaces.map(s => <SpaceCard key={s.id} space={s} />)}
            <button onClick={addSpace}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d7dce3] p-6 text-sm text-muted-foreground transition hover:border-[#3a47c2] hover:text-[#3a47c2]">
              <Plus className="h-5 w-5" />New space
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <p>{q ? "No spaces match your search." : "You haven't added any spaces yet."}</p>
            {!q && (
              <Button onClick={addSpace} className="bg-[#3a47c2] hover:bg-[#2f3a9e] text-white">
                Add your first space
              </Button>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MySpaces;
