import { PageSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <PageSkeleton
      title="Live Radar"
      subtitle="Who's live right now across Twitch and Kick, ranked by current audience."
    />
  );
}
