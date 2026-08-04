import { Skeleton, SkeletonBackLink, SkeletonCardShell } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-[720px] px-5 py-6">
      <SkeletonBackLink />
      <SkeletonCardShell>
        <Skeleton className="mb-2 h-7 w-[50%]" />
        <Skeleton className="mb-6 h-3.5 w-[35%]" />
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="mb-6">
            <Skeleton className="mb-2 h-5 w-[40%]" />
            <Skeleton className="mb-1.5 h-4 w-full" />
            <Skeleton className="mb-1.5 h-4 w-full" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        ))}
      </SkeletonCardShell>
    </main>
  );
}
