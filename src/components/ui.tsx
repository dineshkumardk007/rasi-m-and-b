"use client";

/**
 * Sticker-system primitives — pixel match of the approved reference:
 * cards 3px/r18/shadow4, pills 2.5px/r22/shadow2, buttons 3px/r22/shadow3,
 * modals 4px/r24/shadow6 (bottom sheet on phones), inputs 2.5px/r14.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { bannerUrlFor } from "@/lib/images";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";

export function Btn({
  children,
  onClick,
  bg = "#BE3466", // matches the `brand` token; AA-contrast with white text
  color = "#fff",
  full,
  small,
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  onClick?: (e?: any) => any;
  bg?: string;
  color?: string;
  full?: boolean;
  small?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onClick || disabled || loading) return;
    try {
      setLoading(true);
      await onClick(e);
    } finally {
      setLoading(false);
    }
  };

  const isBtnDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isBtnDisabled}
      style={{ background: isBtnDisabled ? "#D8D2E0" : bg, color: isBtnDisabled ? "#8A8398" : color }}
      className={`btn-press inline-flex items-center justify-center gap-2 rounded-pill border-3 border-ink font-display font-extrabold transition-all ${
        isBtnDisabled ? "shadow-none opacity-85 cursor-not-allowed" : "shadow-hard-3 cursor-pointer hover:scale-[1.02] active:scale-95"
      } ${small ? "px-4 py-[7px] text-[13px]" : "px-5 py-[11px] text-[15px]"} ${full ? "w-full" : ""} ${
        loading ? "animate-pulse" : ""
      } min-h-[44px] ${className}`}
    >
      {loading ? (
        <>
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Pill({
  children,
  onClick,
  bg = "#F2EAE0",
  color = "#2B2140",
  active,
  className = "",
  disabled,
}: {
  children: ReactNode;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  onClick?: (e?: any) => any;
  bg?: string;
  color?: string;
  active?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onClick || disabled || loading) return;
    try {
      setLoading(true);
      await onClick(e);
    } finally {
      setLoading(false);
    }
  };

  const isPillDisabled = disabled || loading;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPillDisabled}
      style={active ? { background: "#2B2140", color: "#fff" } : { background: bg, color }}
      className={`btn-press inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-pill border-2.5 border-ink px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2 min-h-[38px] transition-all ${
        isPillDisabled ? "opacity-75 cursor-not-allowed scale-95" : "cursor-pointer hover:scale-105 active:scale-95"
      } ${loading ? "animate-pulse" : ""} ${className}`}
    >
      {loading ? (
        <>
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Saving...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function Badge({ children, bg = "#FFE1A8" }: { children: ReactNode; bg?: string }) {
  return (
    <span
      style={{ background: bg }}
      className="rounded-[20px] border-2 border-ink px-2.5 py-[3px] text-[12px] font-extrabold"
    >
      {children}
    </span>
  );
}

/** Visual breadcrumb trail — mirrors the BreadcrumbList JSON-LD already emitted
 * on category/brand/product pages so crawlers and sighted users see the same
 * hierarchy. Last item renders as plain text (current page, not a link). */
export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  if (items.length === 0) return null;
  const jsonLd = breadcrumbJsonLd(items.map((i) => ({ name: i.name, item: i.href })));
  // Escape markup-significant characters so a breadcrumb name containing
  // "</script>" cannot break out of the JSON-LD block. Same mitigation as
  // p/[slug]/page.tsx applies to its product + breadcrumb JSON-LD.
  const jsonLdHtml = JSON.stringify(jsonLd)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml }}
      />
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 px-5 pt-3 text-[13px] font-bold text-mute">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={item.href} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">›</span>}
              {isLast ? (
                <span className="text-ink" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-ink hover:underline">
                  {item.name}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}

export function Card({
  children,
  className = "",
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  const hasCustomBg = Boolean(style && ("background" in style || "backgroundColor" in style));
  // When a Card is clickable it must be operable by keyboard too. Every product
  // carousel (Buy Again, Recently Viewed, Baby Club, Bought Together, deal/bundle
  // tiles) opens the quick-view through this onClick — as a bare <div> those were
  // unreachable by keyboard and invisible to assistive tech as interactive.
  const interactive = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={style}
      className={`rounded-card border-3 border-ink ${hasCustomBg ? "" : "bg-paper"} shadow-hard-4 ${interactive ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  maxLength,
  list,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
  /** id of a <datalist> to offer as suggestions, e.g. existing brand names. */
  list?: string;
}) {
  const isPhone = inputMode === "tel" || label.toLowerCase().includes("phone") || label.toLowerCase().includes("mobile");
  return (
    <label className="mb-3 block">
      <span className="text-[12px] font-extrabold uppercase tracking-[.5px] text-mute font-display">
        {label}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        maxLength={maxLength ?? (isPhone ? 10 : undefined)}
        value={value}
        list={list}
        onChange={(e) => {
          let val = e.target.value;
          if (isPhone) {
            val = val.replace(/\D/g, "").slice(0, 10);
          }
          onChange(val);
        }}
        placeholder={placeholder}
        className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2.5 font-body text-[15px] text-ink outline-none min-h-[44px] focus:border-brand"
      />
    </label>
  );
}

/**
 * Product tile — a real photo when one exists, the emoji placeholder until then.
 *
 * `ratio` is what makes the automated uploader work. Uploads are rendered to
 * exact 3:1 and 5:3 files, so the box that displays them has to hold that same
 * ratio at every viewport; a fixed pixel height with a fluid width would let
 * object-cover crop the carefully-centred product back off the edges on phones.
 * Pass `ratio` on anything showing a product photo, and leave it off for the
 * small fixed-height list thumbnails where a crop is harmless.
 *
 * Products store only the tile URL, so the banner box derives its own source
 * here rather than making every call site remember to.
 */
export function Art({
  emoji,
  bg,
  h = 150,
  ratio,
  isBundle,
  image,
  alt,
  priority,
  sizes = "(max-width: 640px) 45vw, 260px",
  fit = "cover",
  photoCount,
}: {
  emoji: string;
  bg: string;
  /** Fixed height, used only when `ratio` is absent. */
  h?: number;
  /** Locks the box to a storefront rendition's aspect ratio. */
  ratio?: "banner" | "tile";
  isBundle?: boolean;
  image?: string;
  alt?: string;
  /** Set on above-the-fold tiles so the browser fetches them first. */
  priority?: boolean;
  /** Widths this tile occupies, so Next serves an appropriately sized file. */
  sizes?: string;
  fit?: "cover" | "contain";
  photoCount?: number;
}) {
  const src = image && ratio === "banner" ? bannerUrlFor(image) : image;
  const aspect = ratio === "banner" ? "aspect-[3/1]" : ratio === "tile" ? "aspect-[5/3]" : "";

  const box = (
    <div
      style={ratio ? { background: bg } : { height: h, background: bg, fontSize: h * 0.34 }}
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-tile border-2.5 border-ink ${aspect}`}
    >
      {src ? (
        src.endsWith(".mp4") || src.endsWith(".webm") ? (
          <video
            src={src}
            autoPlay
            muted
            loop
            playsInline
            className={`${fit === "contain" ? "object-contain p-1.5 drop-shadow-sm" : "object-cover"} h-full w-full`}
          />
        ) : (
          <Image
            src={src}
            alt={alt ?? ""}
            fill
            sizes={sizes}
            priority={priority}
            className={`${fit === "contain" ? "object-contain p-1.5 drop-shadow-sm" : "object-cover"} transition-transform duration-200 group-hover:scale-105`}
          />
        )
      ) : (
        <span
          aria-hidden
          // The cqw values reproduce the 0.34-of-height proportion the
          // fixed-height boxes get from `h`, measured off the container width.
          style={ratio ? { fontSize: ratio === "banner" ? "11cqw" : "20cqw" } : undefined}
        >
          {emoji}
        </span>
      )}
      {isBundle && (
        <span className="absolute left-1.5 top-1.5 rounded-xl border-2 border-ink bg-brand px-2 py-[2px] text-[12px] font-extrabold text-white">
          BUNDLE
        </span>
      )}
      {photoCount && photoCount > 1 && (
        <span className="absolute right-1.5 top-1.5 rounded-xl border-2 border-ink bg-white/95 px-1.5 py-[1px] text-[12px] font-extrabold text-ink shadow-sm">
          📷 {photoCount}
        </span>
      )}
    </div>
  );

  if (!ratio) return box;

  /**
   * The container has to be an ancestor of whatever reads `cqw`, never the same
   * element: an element cannot query itself, so `20cqw` set alongside
   * `container-type` silently measures the viewport instead — which rendered a
   * 256px emoji inside a 144px tile. Sizing containment on the aspect box also
   * stopped `aspect-ratio` resolving, so the wrapper carries the container and
   * the box below stays a plain ratio box.
   */
  return (
    <div style={{ containerType: "inline-size" }} className="w-full">
      {box}
    </div>
  );
}

/**
 * Interactive product image slider/carousel.
 * Shows fixed main image first, then auto-slides through remaining images with
 * navigation arrows (◀/▶), touch swipe support, and indicator dots / thumbnails.
 */
export function ProductImageSlider({
  images,
  emoji,
  bg,
  alt,
  ratio = "banner",
  autoPlayInterval = 3500,
  showThumbnails = true,
}: {
  images?: string[];
  emoji: string;
  bg: string;
  alt?: string;
  ratio?: "banner" | "tile";
  autoPlayInterval?: number;
  showThumbnails?: boolean;
}) {
  const list = images && images.length > 0 ? images : [];
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Keep index within bounds if list changes
  useEffect(() => {
    if (index >= list.length) {
      setIndex(0);
    }
  }, [list.length, index]);

  // Auto slide timer
  useEffect(() => {
    if (list.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % list.length);
    }, autoPlayInterval);
    return () => clearInterval(timer);
  }, [list.length, isPaused, autoPlayInterval]);

  const goPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (list.length <= 1) return;
    setIndex((prev) => (prev - 1 + list.length) % list.length);
  };

  const goNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (list.length <= 1) return;
    setIndex((prev) => (prev + 1) % list.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const clientX = e.touches[0]?.clientX;
    if (clientX !== undefined) {
      setTouchStart(clientX);
      setIsPaused(true);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const clientX = e.changedTouches[0]?.clientX;
    if (clientX !== undefined) {
      const diff = touchStart - clientX;
      if (diff > 40) {
        goNext();
      } else if (diff < -40) {
        goPrev();
      }
    }
    setTouchStart(null);
    setIsPaused(false);
  };

  const currentImage = list[index];

  return (
    <div className="w-full select-none">
      <div
        className="group relative w-full overflow-hidden rounded-card"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Art
          emoji={emoji}
          bg={bg}
          ratio={ratio}
          image={currentImage}
          alt={alt}
        />

        {/* Navigation Arrows for multi-images */}
        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous photo"
              className="btn-press absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2.5 border-ink bg-white/95 font-display text-[14px] sm:text-[16px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFE1A8] active:scale-95 transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next photo"
              className="btn-press absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border-2.5 border-ink bg-white/95 font-display text-[14px] sm:text-[16px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFE1A8] active:scale-95 transition-all cursor-pointer opacity-90 sm:opacity-0 sm:group-hover:opacity-100"
            >
              ▶
            </button>

            {/* Photo Counter Badge */}
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1">
              <span className="rounded-full border-2 border-ink bg-white/95 px-2 py-0.5 font-display text-[12px] font-extrabold text-ink shadow-sm">
                📷 {index + 1}/{list.length} {index === 0 ? "· MAIN" : ""}
              </span>
            </div>

            {/* Auto slide indicator progress dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border border-ink/40 bg-black/40 px-2 py-1 backdrop-blur-xs">
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(i);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === index
                      ? "w-5 bg-brand"
                      : "w-2 bg-white/70 hover:bg-white"
                  }`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail Bar (if showThumbnails & >1 images) */}
      {showThumbnails && list.length > 1 && (
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {list.map((imgUrl, i) => (
            <button
              key={imgUrl + i}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative h-12 w-16 sm:h-14 sm:w-20 shrink-0 overflow-hidden rounded-tile border-2 transition-all cursor-pointer ${
                i === index
                  ? "border-brand scale-105 shadow-hard-2 ring-2 ring-brand/30"
                  : "border-ink/40 opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgUrl} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-0.5 top-0.5 rounded bg-brand px-1 text-[8px] font-extrabold text-white">
                  MAIN
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: "#F59E0B", letterSpacing: 1 }} aria-label={`${n} out of 5 stars`}>
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

export function Modal({
  onClose,
  children,
  wide,
  hideClose,
  resetScrollKey,
}: {
  onClose: () => void;
  onChildren?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  hideClose?: boolean;
  /**
   * A multi-step modal (e.g. checkout's address → pay) reuses this same
   * scrollable div across steps, so scrolling down on one step leaves the
   * next step's content scrolled down too. Pass the current step as this
   * key and it snaps back to the top whenever it changes.
   */
  resetScrollKey?: string | number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resetScrollKey !== undefined) scrollRef.current?.scrollTo({ top: 0 });
  }, [resetScrollKey]);

  return (
    <div
      className="animate-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: "rgba(43,33,64,0.6)" }}
      onMouseDown={(e) => {
        // Only close if the mouse click started directly on the backdrop layer itself.
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={scrollRef}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: wide ? 680 : 460 }}
        className="sticker-scrollbar animate-modal relative max-h-[92vh] w-full overflow-y-auto rounded-t-modal border-4 border-ink bg-[#FFF9F2] p-[22px] shadow-hard-6 sm:rounded-modal overflow-hidden"
      >
        {/* Soft Pastel Mesh Base Canvas */}
        <div className="absolute inset-0 -z-20 min-h-full w-full bg-gradient-to-br from-[#FFEAF2] via-[#FFF6E5] to-[#E2F0FF] pointer-events-none" />

        {/* Smooth Ambient Color Glow Blobs — scaled for desktop & mobile */}
        <div className="absolute -top-20 -right-20 -z-10 h-[380px] sm:h-[480px] w-[380px] sm:w-[480px] rounded-full bg-[#FFB8CC]/80 blur-2xl pointer-events-none" />
        <div className="absolute top-1/4 -left-20 -z-10 h-[350px] sm:h-[450px] w-[350px] sm:w-[450px] rounded-full bg-[#FFD68A]/80 blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[350px] sm:h-[450px] w-[350px] sm:w-[450px] rounded-full bg-[#D4C2FF]/75 blur-2xl pointer-events-none" />
        <div className="absolute top-3/4 -right-20 -z-10 h-[350px] sm:h-[450px] w-[350px] sm:w-[450px] rounded-full bg-[#B2E2FF]/85 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 -z-10 h-[380px] sm:h-[480px] w-[380px] sm:w-[480px] rounded-full bg-[#FFC7D9]/80 blur-2xl pointer-events-none" />

        {/* Smooth Floating Doodle Objects Layer */}
        <div
          className="absolute inset-0 -z-10 min-h-full w-full pointer-events-none opacity-[0.48]"
          style={{
            backgroundImage: "url('/modal-doodle-pattern.svg')",
            backgroundRepeat: "repeat",
            backgroundSize: "320px 320px",
          }}
        />

        <div className="relative z-10">
          {!hideClose && (
            <div className="absolute -right-1.5 -top-1.5 z-30 flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal (Esc)"
                className="btn-press flex h-9 w-9 items-center justify-center rounded-full border-2.5 border-ink bg-[#FFE1A8] font-display text-[16px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFCBD9] active:scale-90 transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-modal border-2.5 border-ink bg-ink px-[22px] py-3 font-display font-extrabold text-ribbon"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
