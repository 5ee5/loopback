import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { getAdmin } from "@/server/auth";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Container className="pt-16 sm:pt-24">
      <p className="prompt">$ ./login</p>
      <h1 className="text-6xl">Admin</h1>
      <div className="mt-8">
        {/* The session is read per request, so it sits behind Suspense (Cache Components). */}
        <Suspense fallback={<p className="text-muted">loading...</p>}>
          <LoginGate />
        </Suspense>
      </div>
    </Container>
  );
}

async function LoginGate() {
  if (await getAdmin()) redirect("/admin");
  return <LoginForm />;
}
