import { Dashboard } from "@/components/Dashboard";
import { getEmergingData } from "@/lib/api-data";

export const dynamic = "force-dynamic";

export default async function EmergingPage() {
  const payload = await getEmergingData();
  return (
    <Dashboard
      payload={payload}
      title="Emerging"
      subtitle="Smaller streams punching above their usual audience — signal before the leaderboard catches up."
      metric="momentum"
    />
  );
}
