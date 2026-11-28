import { expect, test } from "vitest";
import { draftReadiness, type DraftChecklist } from "./draft-readiness";

const complete: DraftChecklist = {
  title: "Senja",
  styleCount: 1,
  medium: "Digital",
  hasThumbnail: true,
  objectCount: 2,
  isCollaboration: false,
  hasAllApprovals: false,
};

test("shows the first missing requirement for a draft", () => {
  expect(draftReadiness({ ...complete, title: " ", styleCount: 0 })).toEqual({
    status: "incomplete",
    message: "Judul karya belum diisi",
  });
  expect(draftReadiness({ ...complete, objectCount: 0 }).status).toBe(
    "incomplete",
  );
});

test("requires approval for collaboration drafts only", () => {
  expect(draftReadiness(complete).status).toBe("ready");
  const shared = { ...complete, isCollaboration: true };
  expect(draftReadiness(shared).status).toBe("pending");
  expect(draftReadiness({ ...shared, hasAllApprovals: true }).status).toBe(
    "ready",
  );
});
