"use client";

import { useActionState } from "react";
import { FormField, inputClass } from "@/components/ui/form-field";
import { submitApplication } from "./actions";
import { initialApplicationState } from "./form-state";

export function JoinForm() {
  const [state, formAction, pending] = useActionState(submitApplication, initialApplicationState);

  if (state.status === "success") {
    return (
      <div role="status" className="card p-6">
        <p className="prompt">$ ./join --status</p>
        <p>{state.message}</p>
      </div>
    );
  }

  const errors = state.fieldErrors ?? {};
  const values = state.values;

  return (
    <form action={formAction} className="card space-y-6 p-6" noValidate>
      {state.message && (
        <p role="alert" className="border border-red-400/60 bg-raised px-3 py-2 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <FormField name="displayName" label="Your name" error={errors.displayName}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            name="displayName"
            type="text"
            required
            maxLength={60}
            autoComplete="name"
            defaultValue={values?.displayName}
            aria-invalid={invalid}
            aria-describedby={describedBy || undefined}
            className={inputClass}
          />
        )}
      </FormField>

      <FormField name="url" label="Your website" hint="The full address, like https://example.com" error={errors.url}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            name="url"
            type="url"
            required
            maxLength={2048}
            autoComplete="url"
            placeholder="https://"
            defaultValue={values?.url}
            aria-invalid={invalid}
            aria-describedby={describedBy || undefined}
            className={inputClass}
          />
        )}
      </FormField>

      <FormField name="description" label="A short description" hint="Up to 160 characters." error={errors.description}>
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id}
            name="description"
            rows={3}
            maxLength={160}
            defaultValue={values?.description}
            aria-invalid={invalid}
            aria-describedby={describedBy || undefined}
            className={inputClass}
          />
        )}
      </FormField>

      <FormField name="tags" label="Tags" hint="Optional. Up to 5, separated by commas." error={errors.tags}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            name="tags"
            type="text"
            placeholder="blog, photography"
            defaultValue={values?.tags}
            aria-invalid={invalid}
            aria-describedby={describedBy || undefined}
            className={inputClass}
          />
        )}
      </FormField>

      <FormField
        name="contactEmail"
        label="Your email"
        hint="So we can reply. It is never shown publicly."
        error={errors.contactEmail}
      >
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            name="contactEmail"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            defaultValue={values?.contactEmail}
            aria-invalid={invalid}
            aria-describedby={describedBy || undefined}
            className={inputClass}
          />
        )}
      </FormField>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="sr-only">
        <label>
          Referral code
          <input name="referral_code" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button type="submit" disabled={pending} className="btn disabled:opacity-60">
        {pending ? "sending..." : "send application"}
      </button>
    </form>
  );
}
