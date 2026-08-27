import { Feed } from "@/components/Feed";
import { getMomentsData } from "@/lib/api-data";

export const dynamic = "force-dynamic";

export default async function RadarPage() {
  const initial = await getMomentsData();
  return (
    <Feed
      initial={initial}
      endpoint="/api/moments"
      variant="moment"
      title="Clip Radar"
      subtitle="The best moments to clip right now — live breakouts to capture and clips already going viral to ride — scored from current momentum and velocity."
    />
  );
}
