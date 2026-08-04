"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StaffAccountPublic, StaffRole } from "@/lib/types";
import { Card, Btn, Badge } from "@/components/ui";
import {
  createStaffAccountAction,
  resetStaffPasswordAction,
  toggleStaffStatusAction,
} from "@/app/admin/actions";

export function StaffTab({ staffAccounts }: { staffAccounts: StaffAccountPublic[] }) {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<StaffRole>("staff");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resetId, setResetId] = useState<string | null>(null);
  const [newPass, setNewPass] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (phone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setSubmitting(true);
    const res = await createStaffAccountAction(username, phone, role, password);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error ?? "Failed to create account");
      return;
    }
    setUsername("");
    setPhone("");
    setPassword("");
    router.refresh();
  };

  const handleResetPassword = async (staffId: string) => {
    if (!newPass.trim()) return;
    setError(null);
    const res = await resetStaffPasswordAction(staffId, newPass);
    if (!res.ok) {
      setError(res.error ?? "Failed to reset password");
      return;
    }
    setResetId(null);
    setNewPass("");
    router.refresh();
  };

  return (
    <div className="grid gap-6">
      {/* Registration Card */}
      <Card className="p-5">
        <h3 className="font-display text-[18px] font-extrabold text-ink mb-1">
          👥 Register New Staff / Manager
        </h3>
        <p className="text-[13px] text-mute mb-4">
          Create credentials for employees. Managers have management access; Staff focus on order packing and labels.
        </p>

        {error && (
          <div className="mb-3 rounded-tile border-2 border-ink bg-[#FFCBD9] p-2.5 text-[13px] font-bold text-ink">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="block text-[12px] font-extrabold uppercase text-mute mb-1">
              Username / ID
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="rahul_sales"
              className="w-full rounded-tile border-2.5 border-ink bg-paper px-3 py-2 text-[14px] outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-extrabold uppercase text-mute mb-1">
              Phone Number (10 Digits)
            </label>
            <input
              type="tel"
              required
              inputMode="numeric"
              maxLength={10}
              pattern="[0-9]{10}"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              className="w-full rounded-tile border-2.5 border-ink bg-paper px-3 py-2 text-[14px] outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-extrabold uppercase text-mute mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full rounded-tile border-2.5 border-ink bg-paper px-3 py-2 text-[14px] outline-none"
            >
              <option value="staff">Staff (Fulfillment & Labels)</option>
              <option value="manager">Manager (Catalog & Operations)</option>
              <option value="owner">Owner / Main Admin (Full Control)</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-extrabold uppercase text-mute mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-tile border-2.5 border-ink bg-paper px-3 py-2 text-[14px] outline-none"
            />
          </div>

          <div className="sm:col-span-2 md:col-span-4 mt-1">
            <Btn type="submit" disabled={submitting}>
              {submitting ? "Registering Account…" : "+ Create Staff Account"}
            </Btn>
          </div>
        </form>
      </Card>

      {/* Staff Accounts List */}
      <div>
        <h3 className="font-display text-[18px] font-extrabold text-ink mb-3">
          Existing Accounts ({staffAccounts.length})
        </h3>
        <div className="grid gap-3">
          {staffAccounts.map((acc) => (
            <Card key={acc.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[16px] font-extrabold text-ink">
                    {acc.username}
                  </span>
                  <Badge bg={acc.role === "manager" ? "#FFE1A8" : "#C7E9FF"}>
                    {acc.role.toUpperCase()}
                  </Badge>
                  <Badge bg={acc.status === "active" ? "#D6E8B0" : "#FFCBD9"}>
                    {acc.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="mt-1 text-[13px] text-mute">
                  Phone: <span className="font-bold text-ink">{acc.phone || "N/A"}</span> · Registered:{" "}
                  {new Date(acc.created_at).toLocaleDateString("en-IN")}
                  {acc.last_login_at && (
                    <> · Last Active: {new Date(acc.last_login_at).toLocaleString("en-IN")}</>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {resetId === acc.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="New password"
                      className="rounded-pill border-2 border-ink bg-paper px-3 py-1 text-[13px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleResetPassword(acc.id)}
                      className="btn-press rounded-pill border-2 border-ink bg-[#8CE0CE] px-3 py-1 font-display text-[12px] font-extrabold shadow-hard-1"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetId(null)}
                      className="text-[12px] font-bold text-mute underline px-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setResetId(acc.id)}
                    className="btn-press rounded-pill border-2 border-ink bg-white px-3 py-1 font-display text-[12px] font-extrabold text-ink shadow-hard-1 hover:bg-cream"
                  >
                    🔑 Reset Password
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    const res = await toggleStaffStatusAction(
                      acc.id,
                      acc.status === "active" ? "disabled" : "active",
                    );
                    if (!res.ok) {
                      setError(res.error ?? "Failed to update staff status");
                      return;
                    }
                    router.refresh();
                  }}
                  className={`btn-press rounded-pill border-2 border-ink px-3 py-1 font-display text-[12px] font-extrabold text-ink shadow-hard-1 ${
                    acc.status === "active"
                      ? "bg-[#FFCBD9] hover:bg-[#FFB8CC]"
                      : "bg-[#D6E8B0] hover:bg-[#C2E094]"
                  }`}
                >
                  {acc.status === "active" ? "🔒 Disable Account" : "🔓 Unlock Account"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
