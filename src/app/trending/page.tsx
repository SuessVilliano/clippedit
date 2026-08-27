import { Dashboard } from "@/components/Dashboard";
import { getTrendingData } from "@/lib/api-data";

export const dynamic = "force-dynamic";

export default async function TrendingPage() {
  const payload = await getTrendingData();
  return (
    <Dashboard
      payload={payload}
      title="Trending"
      subtitle="Streams accelerating fastest right now, ranked by momentum rather than raw totals."
      metric="momentum"
    />
  );
}
