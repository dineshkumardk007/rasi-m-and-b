"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAdminAction } from "@/app/admin/actions";

export function AdminLoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true);
    setError(null);

    const res = await loginAdminAction(pin);
    setLoading(false);

    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error ?? "Invalid Admin PIN");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-6 text-ink">
      <div className="w-full max-w-[420px] rounded-modal border-4 border-ink bg-paper p-8 shadow-hard-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-3 border-ink bg-[#FFE1A8] text-[30px] shadow-hard-3">
            🔐
          </div>
          <h1 className="font-display text-[26px] font-extrabold text-ink">Rasi Store Admin</h1>
          <p className="mt-1.5 text-[14px] text-mute">
            Enter your Admin PIN / Passcode to access store settings, orders, and customer details.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6">
          <label className="mb-1.5 block font-display text-[13px] font-extrabold uppercase text-ink">
            Admin PIN / Passcode
          </label>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter passcode (e.g. 1234)"
            className="w-full rounded-pill border-2.5 border-ink bg-white px-4 py-3 font-body text-[15px] outline-none shadow-hard-2 focus:border-brand"
            autoFocus
          />

          {error && (
            <p className="mt-2 text-[13px] font-bold text-[#E24B4A] text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="btn-press mt-5 w-full rounded-pill border-2.5 border-ink bg-brand py-3 font-display text-[15px] font-extrabold text-white shadow-hard-3 hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Unlock Admin Dashboard 🔑"}
          </button>
        </form>

        <div className="mt-6 text-center border-t-2 border-dashed border-[#E5DBCC] pt-4">
          <Link
            href="/"
            className="text-[13px] font-bold text-mute hover:text-ink underline transition-colors"
          >
            ← Back to Storefront
          </Link>
        </div>
      </div>
    </main>
  );
}
