/** Messages for `?notice=` after an admin action. A lookup, so arbitrary text can never be reflected. */
const NOTICES: Record<string, string> = {
  approved: "Approved. The member is now setting up.",
  rejected: "Rejected.",
  replied: "Ticked as emailed.",
  not_replied: "That one was already ticked, or is still pending.",
  live: "Marked live. They are in the ring.",
  updated: "Saved.",
  unchanged: "Nothing changed.",
  status_changed: "Status changed.",
  removed: "Member removed.",
  password_changed: "Password changed. Other sessions were signed out.",
  not_pending: "That application was already decided.",
  already_member: "That site is already a member, so nothing was changed.",
  not_setup: "That member isn't waiting to go live.",
  not_allowed: "That status change isn't allowed from the current status.",
  not_found: "That member no longer exists.",
  reason_required: "Say why you are suspending them (it is private and only shown in the log).",
  name_mismatch: "The name you typed didn't match, so nothing was removed.",
  invalid: "That request wasn't valid.",
};

export function noticeFor(code: unknown): string | undefined {
  return typeof code === "string" && Object.hasOwn(NOTICES, code) ? NOTICES[code] : undefined;
}
