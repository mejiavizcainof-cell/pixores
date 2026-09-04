import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

export type AuthSnapshotTracker = {
  hasAuthenticatedSession: boolean;
};

export function shouldApplyAuthSnapshot(
  tracker: AuthSnapshotTracker,
  event: AuthChangeEvent,
  session: Session | null,
) {
  if (session?.user) {
    tracker.hasAuthenticatedSession = true;
    return true;
  }

  if (event === "SIGNED_OUT") {
    tracker.hasAuthenticatedSession = false;
    return true;
  }

  if (event === "INITIAL_SESSION") {
    return !tracker.hasAuthenticatedSession;
  }

  return false;
}
