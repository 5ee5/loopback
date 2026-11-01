"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { approveApplication, markMemberLive, rejectApplication } from "@/server/admin-service";
import { getAuth, requireAdmin } from "@/server/auth";
import { applicationIdSchema, memberIdSchema } from "@/validation/ids";
import { headers } from "next/headers";

/*
 * Every action starts with requireAdmin(): a hidden form field or a hand-made
 * POST proves nothing, so the check is repeated here on the server.
 */

const noteSchema = z.string().trim().max(500);

function done(code: string): never {
  redirect(`/admin?notice=${code}`);
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

export async function markLiveAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = memberIdSchema.safeParse(form.get("id"));
  if (!id.success) done("invalid");

  const result = markMemberLive(admin, id.data);
  if (result.status === "live") updateTag("members");
  done(result.status);
}

export async function signOutAction(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
