/**
 * Static pulse placeholders for `loading.tsx` fallbacks.
 *
 * Deliberately not "use client" — these have zero interactivity, so they
 * paint on the server before any client JS ships, which is the whole point
 * of a loading state: something on screen instantly, not another wait.
 *
 * Coloured off the same `ink` token every real border/text uses, not a
 * generic gray, so the pulse reads as "this site, loading" rather than a
 * default framework skeleton.
 */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-tile bg-ink/10 ${className}`} />;
}

export function SkeletonPill({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-pill bg-ink/10 ${className}`} />;
}

export function SkeletonCircle({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-ink/10 ${className}`} />;
}

/** The back-link pill every simple content page (PDP, contact, legal) opens with. */
export function SkeletonBackLink() {
  return <SkeletonPill className="mb-4 h-[31px] w-[140px]" />;
}

/**
 * The `rounded-card border-3 border-ink bg-paper shadow-hard-4` box that PDP,
 * contact and legal pages all wrap their content in — same shell, so this one
 * skeleton covers all three without duplicating the border/shadow classes.
 */
export function SkeletonCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border-3 border-ink bg-paper p-4 shadow-hard-4 sm:p-[22px]">
      {children}
    </div>
  );
}
