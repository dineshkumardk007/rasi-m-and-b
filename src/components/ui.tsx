"use client";

/**
 * Sticker-system primitives — pixel match of the approved reference:
 * cards 3px/r18/shadow4, pills 2.5px/r22/shadow2, buttons 3px/r22/shadow3,
 * modals 4px/r24/shadow6 (bottom sheet on phones), inputs 2.5px/r14.
 */
import type { CSSProperties, ReactNode } from "react";

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
      className={`btn-press rounded-pill border-3 border-ink font-display font-extrabold ${
        disabled ? "shadow-none" : "shadow-hard-3"
      } ${small ? "px-4 py-[7px] text-[13px]" : "px-5 py-[11px] text-[15px]"} ${
        full ? "w-full" : ""
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
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`rounded-card border-3 border-ink bg-paper shadow-hard-4 ${className}`}
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
  return (
    <label className="mb-3 block">
      <span className="text-[12px] font-extrabold uppercase tracking-[.5px] text-mute font-display">
        {label}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-tile border-2.5 border-ink bg-paper px-3.5 py-2.5 font-body text-[15px] text-ink outline-none min-h-[44px]"
      />
    </label>
  );
}

/** Emoji product tile — the framed placeholder that real photos later fill. */
export function Art({
  emoji,
  bg,
  h = 150,
  isBundle,
  image,
  alt,
}: {
  emoji: string;
  bg: string;
  h?: number;
  isBundle?: boolean;
  image?: string;
  alt?: string;
}) {
  return (
    <div
      style={{ height: h, background: bg, fontSize: h * 0.34 }}
      className="relative flex items-center justify-center overflow-hidden rounded-tile border-2.5 border-ink"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- storage URLs are dynamic
        <img src={image} alt={alt ?? ""} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{emoji}</span>
      )}
      {isBundle && (
        <span className="absolute left-1.5 top-1.5 rounded-xl border-2 border-ink bg-brand px-2 py-[2px] text-[10px] font-extrabold text-white">
          BUNDLE
        </span>
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
}: {
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      style={{ background: "rgba(43,33,64,0.55)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: wide ? 640 : 440 }}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-modal border-4 border-ink bg-cream p-[22px] shadow-hard-6 sm:rounded-modal"
      >
        {children}
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
