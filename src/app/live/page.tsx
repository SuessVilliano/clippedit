import { Feed } from "@/components/Feed";
import { getLiveData } from "@/lib/api-data";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const initial = await getLiveData();
  return (
    <Feed
      initial={initial}
      endpoint="/api/live"
      variant="stream"
      title="Live Radar"
      subtitle="Who's live right now across Twitch and Kick, ranked by current audience."
    />
  );
}
