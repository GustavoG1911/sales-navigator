import { describe, expect, it } from "vitest";
import {
  combineFollowUpDateTime,
  getDefaultFollowUpParts,
  getFollowUpState,
} from "@/lib/prospect-follow-up";

describe("prospect follow-up helpers", () => {
  it("uses the next available 09:00 as default", () => {
    expect(getDefaultFollowUpParts(new Date(2026, 6, 16, 8, 0))).toEqual({
      date: "2026-07-16",
      time: "09:00",
    });
    expect(getDefaultFollowUpParts(new Date(2026, 6, 16, 10, 0))).toEqual({
      date: "2026-07-17",
      time: "09:00",
    });
  });

  it("combines a local date and time into a valid ISO timestamp", () => {
    const result = combineFollowUpDateTime("2026-07-20", "14:30");
    expect(result).not.toBeNull();
    expect(new Date(result!).getTime()).not.toBeNaN();
  });

  it("identifies overdue, upcoming and missing reminders", () => {
    const now = new Date("2026-07-16T15:00:00.000Z");
    expect(getFollowUpState(null, now)).toBe("none");
    expect(getFollowUpState("2026-07-16T14:59:00.000Z", now)).toBe("overdue");
    expect(getFollowUpState("2026-07-18T15:00:00.000Z", now)).toBe("upcoming");
  });
});
