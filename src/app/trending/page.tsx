import { Feed } from "@/components/Feed";
import { getTrendingData } from "@/lib/api-data";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const initial = await getTrendingData();
  return (
    <Feed
      initial={initial}
      endpoint="/api/trending/runtime"
      variant="stream"
      title="Trending"
      subtitle="Fetch Twitch and Kick on demand — no background polling."
    />
  );
}
