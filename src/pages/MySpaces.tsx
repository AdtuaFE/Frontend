import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { CreateSpaceModal } from "@/components/CreateSpaceModal";
import { SpaceCard, type Space } from "@/pages/Browse";

const MySpaces = () => {
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
          <Button className="bg-[#ff8a00] hover:bg-[#e77700] text-white shrink-0" onClick={() => setSpaceModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />Add space
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-40 text-muted-foreground">Loading spaces…</div>
        ) : spaces.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {spaces.map(s => <SpaceCard key={s.id} space={s} />)}
            <button onClick={() => setSpaceModalOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d7dce3] p-6 text-sm text-muted-foreground transition hover:border-[#ff8a00] hover:text-[#ff8a00]">
              <Plus className="h-5 w-5" />New space
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
            <p>{q ? "No spaces match your search." : "You haven't added any spaces yet."}</p>
            {!q && (
              <Button onClick={() => setSpaceModalOpen(true)} className="bg-[#ff8a00] hover:bg-[#e77700] text-white">
                Add your first space
              </Button>
            )}
          </div>
        )}
      </div>

      <CreateSpaceModal open={spaceModalOpen} onOpenChange={setSpaceModalOpen} />
    </AppLayout>
  );
};

export default MySpaces;
