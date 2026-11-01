"use client";

import { useActionState } from "react";
import { signInAction, type LoginState } from "./actions";

const inputClass =
  "w-full border border-line bg-surface px-3 py-2 text-foreground focus:border-accent";
const initial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initial);

  return (
    <form action={formAction} className="card max-w-md space-y-6 p-6">
      {state.message && (
        <p role="alert" className="border border-red-400/60 bg-raised px-3 py-2 text-sm text-red-300">
          {state.message}
        </p>
      )}
      <div>
        <label htmlFor="login-email" className="block text-sm text-accent">
          <span aria-hidden="true" className="text-muted">$ </span>
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className={`${inputClass} mt-2`}
        />
      </div>
      <div>
        <label htmlFor="login-password" className="block text-sm text-accent">
          <span aria-hidden="true" className="text-muted">$ </span>
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={`${inputClass} mt-2`}
        />
      </div>
      <button type="submit" disabled={pending} className="btn disabled:opacity-60">
        {pending ? "signing in..." : "sign in"}
      </button>
    </form>
  );
}
