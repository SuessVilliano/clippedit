import { Feed } from "@/components/Feed";
import { getTrendingData } from "@/lib/api-data";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const initial = await getTrendingData();
  return (
    <Feed
      initial={initial}
      endpoint="/api/trending"
      variant="stream"
      title="Trending"
      subtitle="Streams accelerating fastest right now — ranked by momentum, not raw totals."
    />
  );
}
