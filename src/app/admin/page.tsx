import { Suspense } from "react";
import { loadAdminData } from "@/server/admin-data";
import { requireAdmin } from "@/server/auth";
import { AdminShell } from "./admin-shell";
import { approveApplicationAction, markLiveAction, rejectApplicationAction } from "./actions";
import { welcomeMailto } from "./applicant-mail";
import { when } from "./format";
import { noticeFor } from "./notices";

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <AdminShell current="overview">
      {/* The session is read per request, so it sits behind Suspense (Cache Components). */}
      <Suspense fallback={<p className="text-muted">loading...</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const admin = await requireAdmin();
  const { pending, settingUp } = loadAdminData(admin);
  const notice = noticeFor((await searchParams).notice);

  return (
    <div className="space-y-10">
      <p className="text-sm text-muted">Signed in as {admin.email}</p>

      {notice && (
        <p role="status" className="border border-line bg-raised px-3 py-2 text-sm text-accent">
          {notice}
        </p>
      )}

      <section aria-labelledby="pending">
        <h2 id="pending" className="prompt">
          $ ls applications/pending
          <span className="ml-3 text-muted/70"># {pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="text-muted">Nothing waiting.</p>
        ) : (
          <ul className="space-y-4">
            {pending.map((a) => (
              <li key={a.id} className="card space-y-4 p-5">
                <div>
                  <h3 className="text-lg text-accent">{a.displayName}</h3>
                  <p className="mt-1 break-all text-sm text-muted">
                    <a href={a.url} rel="noopener noreferrer nofollow" target="_blank">
                      {a.url}
                    </a>
                  </p>
                </div>
                {a.description && <p>{a.description}</p>}
                {a.tags.length > 0 && <p className="text-sm text-muted">{a.tags.join(" · ")}</p>}
                <dl className="text-sm text-muted">
                  <div>
                    <dt className="inline">Email </dt>
                    <dd className="inline break-all text-foreground">{a.contactEmail}</dd>
                  </div>
                  <div>
                    <dt className="inline">Sent </dt>
                    <dd className="inline">{when(a.submittedAt)}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap items-end gap-4">
                  <form action={approveApplicationAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="btn">approve</button>
                  </form>
                  <form action={rejectApplicationAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={a.id} />
                    <label className="text-sm text-muted">
                      Note (private)
                      <input
                        name="note"
                        maxLength={500}
                        className="mt-1 block w-56 border border-line bg-surface px-2 py-1 text-foreground"
                      />
                    </label>
                    <button type="submit" className="btn">reject</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="setup">
        <h2 id="setup" className="prompt">
          $ ls members/setup
          <span className="ml-3 text-muted/70"># {settingUp.length}</span>
        </h2>
        {settingUp.length === 0 ? (
          <p className="text-muted">Nobody is setting up.</p>
        ) : (
          <ul className="space-y-4">
            {settingUp.map((m) => (
              <li key={m.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <h3 className="text-lg text-accent">{m.displayName}</h3>
                  <p className="mt-1 break-all text-sm text-muted">{m.url}</p>
                  <p className="mt-1 text-sm text-muted">Member ID: {m.id}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {(() => {
                    const mailto = welcomeMailto(m.contactEmail, m);
                    return mailto ? (
                      <a href={mailto} className="btn">email applicant</a>
                    ) : (
                      <span className="text-sm text-muted">no email on file</span>
                    );
                  })()}
                  <form action={markLiveAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className="btn">mark live</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
