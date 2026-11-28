import { profileCopy } from "./profile-copy";

export type DraftChecklist = {
  title: string | null;
  styleCount: number;
  medium: string | null;
  hasThumbnail: boolean;
  objectCount: number;
  isCollaboration: boolean;
  hasAllApprovals: boolean;
};

export function draftReadiness(draft: DraftChecklist) {
  const copy = profileCopy.draft;
  const issue = [
    !draft.title?.trim() && copy.title,
    draft.styleCount < 1 && copy.style,
    !draft.medium?.trim() && copy.medium,
    !draft.hasThumbnail && copy.thumbnail,
    draft.objectCount < 1 && copy.canvas,
  ].find(Boolean);

  if (issue) return { status: "incomplete", message: issue } as const;
  if (draft.isCollaboration && !draft.hasAllApprovals) {
    return { status: "pending", message: copy.approval } as const;
  }
  return { status: "ready", message: copy.ready } as const;
}
