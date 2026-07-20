"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-press rounded-pill border-3 border-ink bg-brand px-5 py-2.5 font-display font-extrabold text-white shadow-hard-3"
    >
      🖨️ Print / Save PDF
    </button>
  );
}
