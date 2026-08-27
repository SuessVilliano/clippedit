import { PageSkeleton } from "@/components/Skeletons";

export default function Loading() {
  return (
    <PageSkeleton
      title="Trending"
      subtitle="Streams accelerating fastest right now — ranked by momentum, not raw totals."
    />
  );
}
