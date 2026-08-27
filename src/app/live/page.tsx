import { Dashboard } from "@/components/Dashboard";
import { getLiveData } from "@/lib/api-data";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const payload = await getLiveData();
  return (
    <Dashboard
      payload={payload}
      title="Live Radar"
      subtitle="Who in the monitored universe is live right now, ranked by current audience."
      metric="viewers"
    />
  );
}
