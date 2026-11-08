"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  approveApplication,
  markApplicantReplied,
  markMemberLive,
  rejectApplication,
  removeMember,
  setMemberStatus,
  updateMember,
} from "@/server/admin-service";
import { getAuth, requireAdmin } from "@/server/auth";
import { applicationIdSchema, memberIdSchema } from "@/validation/ids";
import { parseMemberEditForm, statusChangeSchema } from "@/validation/member";
import type { MemberEditField, MemberEditState } from "./member-form-state";

/*
 * Every action starts with requireAdmin(): a hidden form field or a hand-made
 * POST proves nothing, so the check is repeated here on the server.
 */

const noteSchema = z.string().trim().max(500);

function done(code: string, path = "/admin"): never {
  redirect(`${path}?notice=${code}`);
}

export async function approveApplicationAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = applicationIdSchema.safeParse(form.get("id"));
  if (!id.success) done("invalid");

  const result = approveApplication(admin, id.data);
  if (result.status === "approved") updateTag("members"); // show up on the site now
  done(result.status);
}

export async function rejectApplicationAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = applicationIdSchema.safeParse(form.get("id"));
  const note = noteSchema.safeParse(form.get("note") ?? "");
  if (!id.success || !note.success) done("invalid");

  done(rejectApplication(admin, id.data, note.data || null).status);
}

export async function markRepliedAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = applicationIdSchema.safeParse(form.get("id"));
  if (!id.success) done("invalid");

  done(markApplicantReplied(admin, id.data).status === "replied" ? "replied" : "not_replied");
}

export async function markLiveAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = memberIdSchema.safeParse(form.get("id"));
  if (!id.success) done("invalid");

  const result = markMemberLive(admin, id.data);
  if (result.status === "live") updateTag("members");
  done(result.status);
}

const MEMBER_FIELDS: MemberEditField[] = ["displayName", "url", "description", "tags", "accentColor", "avatarUrl"];

export async function updateMemberAction(_previous: MemberEditState, form: FormData): Promise<MemberEditState> {
  const admin = await requireAdmin();
  const id = memberIdSchema.safeParse(form.get("id"));
  if (!id.success) done("invalid", "/admin/members");

  const parsed = parseMemberEditForm(form);
  const values = Object.fromEntries(
    MEMBER_FIELDS.map((field) => [field, typeof form.get(field) === "string" ? (form.get(field) as string) : ""]),
  ) as Record<MemberEditField, string>;
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values };

  const result = updateMember(admin, id.data, parsed.data);
  switch (result.status) {
    case "updated":
      updateTag("members");
      return done("updated", `/admin/members/${id.data}`);
    case "unchanged":
      return done("unchanged", `/admin/members/${id.data}`);
    case "url_taken":
      return { fieldErrors: { url: "Another member already uses that address." }, values };
    case "not_found":
      return done("not_found", "/admin/members");
  }
}

export async function setMemberStatusAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = memberIdSchema.safeParse(form.get("id"));
  if (!id.success) done("invalid", "/admin/members");
  const back = `/admin/members/${id.data}`;

  const change = statusChangeSchema.safeParse({ status: form.get("status"), reason: form.get("reason") ?? "" });
  if (!change.success) {
    done(change.error.issues.some((issue) => issue.path[0] === "reason") ? "reason_required" : "invalid", back);
  }

  const result = setMemberStatus(admin, id.data, change.data.status, change.data.reason);
  if (result.status === "changed") updateTag("members");
  if (result.status === "not_found") done("not_found", "/admin/members");
  done(result.status === "changed" ? "status_changed" : result.status, back);
}

export async function removeMemberAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = memberIdSchema.safeParse(form.get("id"));
  const typed = z.string().max(200).safeParse(form.get("confirm") ?? "");
  if (!id.success || !typed.success) done("invalid", "/admin/members");

  const result = removeMember(admin, id.data, typed.data);
  if (result.status === "removed") updateTag("members");
  if (result.status === "name_mismatch") done("name_mismatch", `/admin/members/${id.data}/remove`);
  done(result.status === "removed" ? "removed" : "not_found", "/admin/members");
}

export async function signOutAction(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
