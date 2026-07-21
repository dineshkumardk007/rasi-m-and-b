"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginAdminAction } from "@/app/admin/actions";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    const res = await loginAdminAction(username, password);
    setLoading(false);

    if (res.ok) {
      router.refresh();
    } else {
      setError(res.error ?? "Invalid Username or Password");
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
            Sign in with your Admin Username & Password to access store management.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block font-display text-[13px] font-extrabold uppercase text-ink">
              Admin Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin"
              className="w-full rounded-pill border-2.5 border-ink bg-white px-4 py-2.5 font-body text-[15px] outline-none shadow-hard-2 focus:border-brand"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block font-display text-[13px] font-extrabold uppercase text-ink">
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-pill border-2.5 border-ink bg-white px-4 py-2.5 font-body text-[15px] outline-none shadow-hard-2 focus:border-brand"
            />
          </div>

          {error && (
            <p className="text-[13px] font-bold text-[#E24B4A] text-center pt-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="btn-press mt-2 w-full rounded-pill border-2.5 border-ink bg-brand py-3 font-display text-[15px] font-extrabold text-white shadow-hard-3 hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
