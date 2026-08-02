"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PendingApproval } from "@/lib/types";
import { Card, Btn, Badge } from "@/components/ui";
import { approveActionRequestAction, rejectActionRequestAction } from "@/app/admin/actions";

export function ApprovalsTab({ pendingApprovals }: { pendingApprovals: PendingApproval[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setBusyId(id);
    await approveActionRequestAction(id);
    setBusyId(null);
    router.refresh();
  };

  const handleReject = async (id: string) => {
    setBusyId(id);
    await rejectActionRequestAction(id);
    setBusyId(null);
    router.refresh();
  };

  if (pendingApprovals.length === 0) {
    return (
      <Card className="p-8 text-center">
        <span className="text-[36px]">✓</span>
        <h3 className="mt-2 font-display text-[18px] font-extrabold text-ink">
          No Pending Staff Approvals
        </h3>
        <p className="mt-1 text-[13px] text-mute">
          All high-impact changes requested by store managers or staff have been reviewed.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[18px] font-extrabold text-ink">
          🔔 Master Approvals Queue ({pendingApprovals.length})
        </h3>
        <Badge bg="#FFE1A8">Owner Verification Required</Badge>
      </div>

      <div className="grid gap-3">
        {pendingApprovals.map((req) => (
          <Card key={req.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-display text-[15px] font-extrabold text-ink">
                  Requested by: {req.staff_name}
                </span>
                <Badge bg="#FBD0EA">{req.action_type}</Badge>
              </div>
              <p className="mt-1 font-display text-[14px] font-bold text-ink">
                {req.description}
              </p>
              <div className="mt-1 text-[12px] text-mute">
                Submitted: {new Date(req.created_at).toLocaleString("en-IN")}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={busyId === req.id}
                onClick={() => handleApprove(req.id)}
                className="btn-press rounded-pill border-2.5 border-ink bg-[#8CE0CE] px-4 py-1.5 font-display text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-[#6FD4BD] disabled:opacity-50"
              >
                {busyId === req.id ? "Processing…" : "✓ Approve Action"}
              </button>
              <button
                type="button"
                disabled={busyId === req.id}
                onClick={() => handleReject(req.id)}
                className="btn-press rounded-pill border-2.5 border-ink bg-[#FFCBD9] px-4 py-1.5 font-display text-[13px] font-extrabold text-ink shadow-hard-2 hover:bg-[#FFB8CC] disabled:opacity-50"
              >
                ✕ Reject
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
