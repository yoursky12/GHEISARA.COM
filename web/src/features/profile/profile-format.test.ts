import { expect, test } from "vitest";
import { formatDraftTime, formatProfileCount } from "./profile-format";

test("formats compact counts in Indonesian", () => {
  expect(formatProfileCount(2400)).toBe("2,4\u00a0rb");
  expect(formatProfileCount(12000000)).toBe("12\u00a0jt");
});

test("formats valid dates relative to the time of viewing", () => {
  expect(
    formatDraftTime("2026-11-26T10:00:00Z", Date.parse("2026-11-26T10:10:00Z")),
  ).toBe("10 menit yang lalu");
  expect(formatDraftTime("invalid")).toBeNull();
});
