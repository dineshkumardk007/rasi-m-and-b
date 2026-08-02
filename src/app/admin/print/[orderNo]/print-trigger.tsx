"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    // Automatically open print dialog on page load
    const timer = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mb-4 flex items-center justify-center gap-3 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full bg-black px-5 py-2 font-mono text-sm font-bold text-white shadow hover:bg-gray-800"
      >
        🖨️ Print Label (4&quot; × 6&quot;)
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="rounded-full border border-gray-400 bg-white px-4 py-2 font-mono text-sm font-bold text-black hover:bg-gray-100"
      >
        Close
      </button>
    </div>
  );
}
