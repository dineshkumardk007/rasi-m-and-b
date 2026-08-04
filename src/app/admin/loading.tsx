import { Skeleton, SkeletonPill } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-ink px-3 py-[9px] text-center text-[14px] font-extrabold text-ribbon">
        🛠️ Admin
      </div>
      <div className="mx-auto max-w-[1080px] px-5 pb-16 pt-[18px]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SkeletonPill className="h-8 w-[80px]" />
            <Skeleton className="h-7 w-[90px]" />
          </div>
          <SkeletonPill className="h-8 w-[120px]" />
        </div>

        <div className="mb-4 flex items-center gap-2 rounded-card border-3 border-ink/15 bg-[#FFFDF7] p-2">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonPill key={i} className="h-9 w-[100px] shrink-0" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-card border-2.5 border-ink/15 bg-paper p-4">
              <Skeleton className="mb-2 h-4 w-[60%]" />
              <Skeleton className="h-8 w-[40%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
