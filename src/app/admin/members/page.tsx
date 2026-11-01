import Link from "next/link";
import { Suspense } from "react";
import type { MemberStatus } from "@/domain/member";
import { loadAdminMembers } from "@/server/admin-data";
import { requireAdmin } from "@/server/auth";
import { AdminShell } from "../admin-shell";
import { noticeFor } from "../notices";

const FILTERS = ["all", "active", "setup", "inactive", "suspended"] as const;
type Filter = (typeof FILTERS)[number];

const STATUS_STYLE: Record<MemberStatus, string> = {
  active: "text-accent",
  setup: "text-muted",
  inactive: "text-muted",
  suspended: "text-red-300",
};

export default function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  return (
    <AdminShell current="members">
      <Suspense fallback={<p className="text-muted">loading...</p>}>
        <Members searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}

async function Members({ searchParams }: { searchParams: PageProps<"/admin/members">["searchParams"] }) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const requested = params.status;
  const filter: Filter =
    typeof requested === "string" && (FILTERS as readonly string[]).includes(requested) ? (requested as Filter) : "all";
  const { members, counts } = loadAdminMembers(admin, filter === "all" ? undefined : filter);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const notice = noticeFor(params.notice);

  return (
    <div className="space-y-6">
      {notice && (
        <p role="status" className="border border-line bg-raised px-3 py-2 text-sm text-accent">
          {notice}
        </p>
      )}

      <nav aria-label="Filter by status" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {FILTERS.map((f) => {
          const n = f === "all" ? total : counts[f];
          return (
            <Link
              key={f}
              href={f === "all" ? "/admin/members" : `/admin/members?status=${f}`}
              aria-current={f === filter ? "page" : undefined}
              className={f === filter ? "text-accent" : "text-muted no-underline hover:text-accent"}
            >
              {f} <span className="text-muted/70">({n})</span>
            </Link>
          );
        })}
      </nav>

      <h2 className="prompt">
        $ ls members/{filter === "all" ? "" : filter}
        <span className="ml-3 text-muted/70"># {members.length}</span>
      </h2>
      {members.length === 0 ? (
        <p className="text-muted">No members here.</p>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <h3 className="text-lg">
                  <Link href={`/admin/members/${m.id}`} className="text-accent no-underline hover:text-foreground">
                    {m.displayName}
                  </Link>
                </h3>
                <p className="mt-1 break-all text-sm text-muted">{m.url}</p>
              </div>
              <p className="text-sm">
                <span className={STATUS_STYLE[m.status]}>{m.status}</span>
                <span className="ml-3 text-muted">joined {m.joinedAt}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
