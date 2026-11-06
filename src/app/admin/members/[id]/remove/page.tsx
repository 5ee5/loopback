import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadAdminMember } from "@/server/admin-data";
import { requireAdmin } from "@/server/auth";
import { memberIdSchema } from "@/validation/ids";
import { AdminShell } from "../../../admin-shell";
import { removeMemberAction } from "../../../actions";
import { noticeFor } from "../../../notices";

export default function RemoveMemberPage(props: PageProps<"/admin/members/[id]/remove">) {
  return (
    <AdminShell current="members">
      <Suspense fallback={<p className="text-muted">loading...</p>}>
        <Confirm {...props} />
      </Suspense>
    </AdminShell>
  );
}

async function Confirm({ params, searchParams }: PageProps<"/admin/members/[id]/remove">) {
  const admin = await requireAdmin();
  const id = memberIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const member = loadAdminMember(admin, id.data);
  if (!member) notFound();
  const notice = noticeFor((await searchParams).notice);

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-2xl text-red-300">Remove {member.displayName}?</h2>
      {notice && (
        <p role="alert" className="border border-red-400/60 bg-raised px-3 py-2 text-sm text-red-300">
          {notice}
        </p>
      )}
      <p>
        This permanently deletes the member ({member.url}). Their embed will keep working from its old position
        until they take it down, and they can apply again. The audit log keeps a record of the removal.
      </p>
      <form action={removeMemberAction} className="card space-y-4 p-5">
        <input type="hidden" name="id" value={member.id} />
        <label className="block text-sm text-accent" htmlFor="confirm">
          <span aria-hidden="true" className="text-muted">$ </span>
          Type <strong>{member.displayName}</strong> to confirm
        </label>
        <input
          id="confirm"
          name="confirm"
          required
          autoComplete="off"
          className="w-full border border-line bg-surface px-3 py-2 text-foreground focus:border-accent"
        />
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn">remove permanently</button>
          <Link href={`/admin/members/${member.id}`}>cancel</Link>
        </div>
      </form>
    </div>
  );
}
