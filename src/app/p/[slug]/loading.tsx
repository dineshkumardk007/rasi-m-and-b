import { Skeleton, SkeletonBackLink, SkeletonCardShell, SkeletonPill } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-[720px] px-5 py-6">
      <SkeletonBackLink />
      <SkeletonCardShell>
        <Skeleton className="mb-4 aspect-[3/1] w-full rounded-card" />
        <Skeleton className="mb-2 h-6 w-[85%]" />
        <Skeleton className="mb-4 h-6 w-[55%]" />
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-7 w-[70px]" />
          <Skeleton className="h-5 w-[55px]" />
          <SkeletonPill className="h-6 w-[90px]" />
        </div>
        <Skeleton className="mb-2 h-4 w-full" />
        <Skeleton className="mb-6 h-4 w-[70%]" />
        <SkeletonPill className="h-12 w-full" />
      </SkeletonCardShell>
      <Skeleton className="mx-auto mt-6 h-4 w-[60%]" />
    </main>
  );
}
