import { Feed } from "@/components/Feed";
import { getClipsData } from "@/lib/api-data";

export const dynamic = "force-dynamic";

export default async function ClipsPage() {
  const initial = await getClipsData();
  return (
    <Feed
      initial={initial}
      endpoint="/api/clips"
      variant="clip"
      title="Most Clipped"
      subtitle="The clips gaining views fastest across the hottest categories right now — ranked by velocity, not lifetime totals."
    />
  );
}
