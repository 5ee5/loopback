import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";
import { loadAdminEvents } from "@/server/admin-data";
import { requireAdmin } from "@/server/auth";
import { AdminShell } from "../admin-shell";
import { when } from "../format";

const pageSchema = z.coerce.number().int().min(1).max(100_000).catch(1);

export default function AdminLogPage({ searchParams }: PageProps<"/admin/log">) {
  return (
    <AdminShell current="log">
      <Suspense fallback={<p className="text-muted">loading...</p>}>
        <Log searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}

async function Log({ searchParams }: { searchParams: PageProps<"/admin/log">["searchParams"] }) {
  const admin = await requireAdmin();
  const page = pageSchema.parse((await searchParams).page);
  const { events, total, pages } = loadAdminEvents(admin, page);

  return (
    <div className="space-y-6">
      <h2 className="prompt">
        $ tail admin.log
        <span className="ml-3 text-muted/70"># {total} {total === 1 ? "entry" : "entries"}</span>
      </h2>
      {events.length === 0 ? (
        <p className="text-muted">Nothing yet.</p>
      ) : (
        <ol className="space-y-3">
          {events.map((e) => (
            <li key={e.id} className="card p-4">
              <p className="text-sm text-muted">
                {when(e.at)} · {e.action}
              </p>
              <p className="mt-1">{e.summary}</p>
              {Object.keys(e.details).length > 0 && (
                <details className="mt-2 text-sm text-muted">
                  <summary className="cursor-pointer">details</summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(e.details, null, 2)}
                  </pre>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
      {pages > 1 && (
        <nav aria-label="Log pages" className="flex gap-6 text-sm">
          {page > 1 && <Link href={`/admin/log?page=${page - 1}`}>&larr; newer</Link>}
          <span className="text-muted">
            page {page} of {pages}
          </span>
          {page < pages && <Link href={`/admin/log?page=${page + 1}`}>older &rarr;</Link>}
        </nav>
      )}
    </div>
  );
}
