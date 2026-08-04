import { Skeleton, SkeletonCircle, SkeletonPill } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen pb-16 pt-6">
      <div className="mx-auto max-w-[960px] px-4">
        <div className="rounded-card border-3 border-ink bg-paper p-6 text-center shadow-hard-4">
          <SkeletonCircle className="mx-auto mb-3 h-14 w-14" />
          <Skeleton className="mx-auto mb-2 h-6 w-[60%]" />
          <Skeleton className="mx-auto h-4 w-[40%]" />
          <SkeletonPill className="mx-auto mt-4 h-9 w-[220px]" />
        </div>

        <Skeleton className="mb-3 mt-7 h-6 w-[180px]" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-card border-2.5 border-ink/15 bg-paper p-3"
            >
              <Skeleton className="h-12 w-12 shrink-0 rounded-tile" />
              <div className="flex-1">
                <Skeleton className="mb-1.5 h-4 w-[80%]" />
                <Skeleton className="h-3.5 w-[40%]" />
              </div>
              <SkeletonPill className="h-8 w-[90px] shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
