import { Skeleton, SkeletonCircle, SkeletonPill } from "@/components/Skeleton";

/**
 * Shown while home / category / brand pages fetch their data — all three
 * render the same `<Storefront>` shell (see Storefront.tsx), and that shell
 * lives entirely inside the async server component, header included. Without
 * this, the *entire* nav disappears until the fetch resolves, not just the
 * product grid — so this mirrors the nav + hero + category row + a product
 * row rather than just the grid.
 */
export function StorefrontSkeleton() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#FFFDF8] via-[#FFE1A8]/20 via-[#FFCBD9]/20 via-[#E4D6FF]/15 to-[#C7E9FF]/20">
      {/* nav */}
      <div className="mx-auto flex w-full max-w-[1240px] flex-col lg:flex-row items-center justify-between gap-2.5 px-2.5 sm:px-5 py-2.5 sm:py-3.5">
        <div className="flex w-full lg:w-auto items-center justify-between gap-3">
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 px-2.5 py-1.5 sm:px-3 sm:py-2">
            <Skeleton className="h-[36px] w-[36px] sm:h-[44px] sm:w-[44px] rounded-tile" />
            <Skeleton className="h-[22px] xs:h-[26px] sm:h-[38px] w-[110px] sm:w-[150px]" />
          </div>
        </div>
        <SkeletonPill className="my-1 h-[34px] w-full max-w-[240px] sm:max-w-[280px] lg:my-0 lg:max-w-[320px]" />
        <div className="hidden lg:flex items-center gap-2">
          <SkeletonCircle className="h-9 w-9" />
          <SkeletonCircle className="h-9 w-9" />
          <SkeletonCircle className="h-9 w-9" />
          <SkeletonCircle className="h-9 w-9" />
        </div>
      </div>

      {/* hero */}
      <div className="relative mx-auto max-w-[1240px] px-4 sm:px-5 pb-2 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 gap-5 md:gap-6 items-center md:grid-cols-[0.82fr_1.18fr]">
          <div>
            <SkeletonPill className="mb-3 h-8 w-[190px]" />
            <Skeleton className="mb-2.5 h-9 w-[85%] sm:h-11" />
            <Skeleton className="mb-4 h-9 w-[65%] sm:h-11" />
            <Skeleton className="mb-2 h-4 w-full max-w-[440px]" />
            <Skeleton className="mb-5 h-4 w-[70%] max-w-[440px]" />
            <div className="flex gap-3">
              <SkeletonPill className="h-11 w-[150px] sm:h-12 sm:w-[168px]" />
              <SkeletonPill className="h-11 w-[130px] sm:h-12 sm:w-[148px]" />
            </div>
          </div>
          <Skeleton className="h-[220px] w-full rounded-card sm:h-[320px]" />
        </div>
      </div>

      {/* category row */}
      <div className="mx-auto max-w-[1080px] px-5 pb-2 pt-3.5">
        <Skeleton className="mb-3.5 h-7 w-[160px]" />
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-[7px] rounded-tile-lg border-2.5 border-ink/15 px-2.5 py-4"
            >
              <SkeletonCircle className="h-[42px] w-[42px] sm:h-[54px] sm:w-[54px]" />
              <Skeleton className="h-3 w-[70%]" />
            </div>
          ))}
        </div>
      </div>

      {/* product row ("Fresh Picks") */}
      <div className="mx-auto max-w-[1240px] px-3 sm:px-5 my-5 sm:my-7">
        <Skeleton className="mb-3.5 h-7 w-[140px]" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="w-[145px] shrink-0 rounded-card border-2.5 border-ink/15 p-2.5 sm:w-[165px] sm:p-3"
            >
              <Skeleton className="mb-2 aspect-[5/3] w-full rounded-tile" />
              <Skeleton className="mb-1.5 h-3.5 w-[90%]" />
              <Skeleton className="h-3.5 w-[50%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
