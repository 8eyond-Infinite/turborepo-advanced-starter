import { describe, expect, it } from "vitest";
import {
  formatAuditTimestamp,
  getAuditActionMeta,
} from "./audit-log.presentation";

describe("audit log presentation", () => {
  it("maps known and unknown actions to readable metadata", () => {
    expect(getAuditActionMeta("SESSION_REVOKE_OTHERS")).toMatchObject({
      label: "Thu hồi các phiên khác",
      type: "warning",
    });
    expect(getAuditActionMeta("CUSTOM_ACTION")).toMatchObject({
      label: "CUSTOM ACTION",
      type: "neutral",
    });
  });

  it("preserves an invalid timestamp instead of rendering Invalid Date", () => {
    expect(formatAuditTimestamp("not-a-date")).toBe("not-a-date");
  });
});
