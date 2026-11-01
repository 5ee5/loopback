import type { MemberEdit } from "@/validation/member";

export type MemberEditField = keyof MemberEdit;

export type MemberEditState = {
  fieldErrors?: Partial<Record<MemberEditField, string>>;
  /** Echoed back on error so the form keeps what was typed (tags as comma text). */
  values?: Record<MemberEditField, string>;
};
