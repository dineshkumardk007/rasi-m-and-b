import { Skeleton, SkeletonBackLink, SkeletonCardShell } from "@/components/Skeleton";

export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-[720px] px-5 py-6">
      <SkeletonBackLink />
      <SkeletonCardShell>
        <Skeleton className="mb-3 h-7 w-[60%]" />
        <Skeleton className="mb-1.5 h-4 w-full" />
        <Skeleton className="mb-6 h-4 w-[80%]" />
        <Skeleton className="mb-2 h-5 w-[35%]" />
        <Skeleton className="mb-1.5 h-4 w-[90%]" />
        <Skeleton className="mb-6 h-4 w-[45%]" />
        <Skeleton className="mb-2 h-5 w-[35%]" />
        <Skeleton className="h-4 w-[70%]" />
      </SkeletonCardShell>
    </main>
  );
}
