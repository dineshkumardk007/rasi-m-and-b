import type { StaffRole } from "@/lib/types";

/**
 * Sensitive admin actions — destructive or financial — that a non-owner staff
 * member cannot perform unilaterally. When a manager or staff account invokes
 * one it is recorded as a pending approval for the owner to review, and the
 * mutation does NOT take effect until the owner approves it. An owner performs
 * them immediately.
 *
 * The keys are the `action_type` stored on a pending_approvals row; the dispatcher
 * in `src/lib/data/admin.ts` (executeApprovedAction) maps each back to its real
 * mutation on approval. Keep the two in sync.
 */
export const APPROVAL_ACTIONS = {
  "coupon.add": "Create a discount coupon",
  "coupon.delete": "Delete a discount coupon",
  "product.archive": "Archive a product",
  "brand.delete": "Delete a brand",
  "banner.delete": "Delete a banner",
  "order.refund": "Refund an order",
} as const;

export type ApprovalActionType = keyof typeof APPROVAL_ACTIONS;

/**
 * Only the owner can perform a sensitive action without a second sign-off.
 * Everyone else (manager, staff) has it queued for owner approval.
 */
export function requiresApproval(role: StaffRole): boolean {
  return role !== "owner";
}
