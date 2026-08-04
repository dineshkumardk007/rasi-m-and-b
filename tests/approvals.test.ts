import { describe, expect, it } from "vitest";
import { APPROVAL_ACTIONS, requiresApproval } from "@/lib/approvals";

describe("approval gating", () => {
  it("lets the owner act without approval", () => {
    expect(requiresApproval("owner")).toBe(false);
  });

  it("requires approval for every non-owner role", () => {
    expect(requiresApproval("manager")).toBe(true);
    expect(requiresApproval("staff")).toBe(true);
  });

  it("gives every sensitive action a human-readable label", () => {
    const entries = Object.entries(APPROVAL_ACTIONS);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, label] of entries) {
      expect(key).toContain("."); // "domain.verb"
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
