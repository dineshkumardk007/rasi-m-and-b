"use client";

/**
 * Sticker-system primitives — pixel match of the approved reference:
 * cards 3px/r18/shadow4, pills 2.5px/r22/shadow2, buttons 3px/r22/shadow3,
 * modals 4px/r24/shadow6 (bottom sheet on phones), inputs 2.5px/r14.
 */
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { bannerUrlFor } from "@/lib/images";

export function Btn({
  children,
  onClick,
  bg = "#EC5D8A",
  color = "#fff",
  full,
  small,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  bg?: string;
  color?: string;
  full?: boolean;
  small?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ background: disabled ? "#D8D2E0" : bg, color: disabled ? "#8A8398" : color }}
      className={`btn-press rounded-pill border-3 border-ink font-display font-extrabold ${disabled ? "shadow-none" : "shadow-hard-3"
        } ${small ? "px-4 py-[7px] text-[13px]" : "px-5 py-[11px] text-[15px]"} ${full ? "w-full" : ""
        } min-h-[44px]`}
    >
      {children}
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
}: {
  children: ReactNode;
  onClick?: () => void;
  bg?: string;
  color?: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={active ? { background: "#2B2140", color: "#fff" } : { background: bg, color }}
      className={`btn-press whitespace-nowrap rounded-pill border-2.5 border-ink px-3.5 py-[7px] font-display text-[13px] font-extrabold shadow-hard-2 min-h-[38px] ${className}`}
    >
      {children}
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
  return (
    <div
      onClick={onClick}
      style={style}
      className={`rounded-card border-3 border-ink ${hasCustomBg ? "" : "bg-paper"} shadow-hard-4 ${className}`}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
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
        onChange={(e) => {
          let val = e.target.value;
          if (isPhone) {
            val = val.replace(/\D/g, "").slice(0, 10);
          }
          onChange(val);
        }}
        placeholder={placeholder}
        className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2.5 font-body text-[15px] text-ink outline-none min-h-[44px]"
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
}) {
  const src = image && ratio === "banner" ? bannerUrlFor(image) : image;
  const aspect = ratio === "banner" ? "aspect-[3/1]" : ratio === "tile" ? "aspect-[5/3]" : "";

  const box = (
    <div
      style={ratio ? { background: bg } : { height: h, background: bg, fontSize: h * 0.34 }}
      className={`relative flex w-full items-center justify-center overflow-hidden rounded-tile border-2.5 border-ink ${aspect}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt ?? ""}
          fill
          sizes={sizes}
          priority={priority}
          className={`${fit === "contain" ? "object-contain p-1.5 drop-shadow-sm" : "object-cover"} transition-transform duration-200 group-hover:scale-105`}
        />
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
        <span className="absolute left-1.5 top-1.5 rounded-xl border-2 border-ink bg-brand px-2 py-[2px] text-[10px] font-extrabold text-white">
          BUNDLE
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
}: {
  onClose: () => void;
  onChildren?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  hideClose?: boolean;
}) {
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
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: wide ? 680 : 460 }}
        className="animate-modal relative max-h-[92vh] w-full overflow-y-auto rounded-t-modal border-4 border-ink bg-[#FFF9F2] p-[22px] shadow-hard-6 sm:rounded-modal overflow-hidden"
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
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="btn-press absolute -right-1.5 -top-1.5 z-30 flex h-9 w-9 items-center justify-center rounded-full border-2.5 border-ink bg-[#FFE1A8] font-display text-[16px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFCBD9] active:scale-90 transition-all cursor-pointer"
            >
              ✕
            </button>
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
    >
      {message}
    </div>
  );
}
