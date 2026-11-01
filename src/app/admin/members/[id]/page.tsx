import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { allowedTransitions } from "@/domain/member-status";
import { loadAdminMember } from "@/server/admin-data";
import { requireAdmin } from "@/server/auth";
import { memberIdSchema } from "@/validation/ids";
import { AdminShell } from "../../admin-shell";
import { markLiveAction, setMemberStatusAction } from "../../actions";
import { noticeFor } from "../../notices";
import { MemberEditForm } from "./member-edit-form";

export default function AdminMemberPage(props: PageProps<"/admin/members/[id]">) {
  return (
    <AdminShell current="members">
      <Suspense fallback={<p className="text-muted">loading...</p>}>
        <Member {...props} />
      </Suspense>
    </AdminShell>
  );
}

async function Member({ params, searchParams }: PageProps<"/admin/members/[id]">) {
  const admin = await requireAdmin();
  const id = memberIdSchema.safeParse((await params).id);
  if (!id.success) notFound();
  const member = loadAdminMember(admin, id.data);
  if (!member) notFound();
  const notice = noticeFor((await searchParams).notice);
  const moves = allowedTransitions(member.status);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/members" className="back-link">
          &larr; all members
        </Link>
        <h2 className="mt-4 text-2xl text-accent">{member.displayName}</h2>
        <p className="mt-1 text-sm text-muted">
          {member.id} · {member.status} · joined {member.joinedAt}
        </p>
      </div>

      {notice && (
        <p role="status" className="border border-line bg-raised px-3 py-2 text-sm text-accent">
          {notice}
        </p>
      )}

      <section aria-labelledby="details">
        <h3 id="details" className="prompt">$ vi details</h3>
        <MemberEditForm
          id={member.id}
          initialValues={{
            displayName: member.displayName,
            url: member.url,
            description: member.description,
            tags: member.tags.join(", "),
            accentColor: member.accentColor ?? "",
            avatarUrl: member.avatarUrl ?? "",
          }}
        />
      </section>

      <section aria-labelledby="status" className="space-y-4">
        <h3 id="status" className="prompt">$ chstatus</h3>
        {member.status === "setup" && (
          <form action={markLiveAction}>
            <input type="hidden" name="id" value={member.id} />
            <button type="submit" className="btn">mark live</button>
          </form>
        )}
        <form action={setMemberStatusAction} className="card flex flex-wrap items-end gap-4 p-5">
          <input type="hidden" name="id" value={member.id} />
          <label className="text-sm text-muted">
            Change status to
            <select name="status" className="mt-1 block border border-line bg-surface px-2 py-2 text-foreground">
              {moves.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-muted">
            Reason (private; required to suspend)
            <input
              name="reason"
              maxLength={300}
              className="mt-1 block w-72 max-w-full border border-line bg-surface px-2 py-2 text-foreground"
            />
          </label>
          <button type="submit" className="btn">change status</button>
        </form>
      </section>

      <section aria-labelledby="danger">
        <h3 id="danger" className="prompt">$ rm</h3>
        <p className="mb-3 text-sm text-muted">
          Removing deletes the member for good. To hide someone temporarily, suspend them instead.
        </p>
        <Link href={`/admin/members/${member.id}/remove`} className="btn">
          remove member...
        </Link>
      </section>
    </div>
  );
}
