import { Feed } from "@/components/Feed";
import { getEmergingData } from "@/lib/api-data";

export const dynamic = "force-dynamic";

export default async function EmergingPage() {
  const initial = await getEmergingData();
  return (
    <Feed
      initial={initial}
      endpoint="/api/emerging"
      variant="stream"
      title="Emerging"
      subtitle="Smaller streams punching above their usual audience — signal before the leaderboard catches up."
    />
  );
}
