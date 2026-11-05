"use client";

import { useActionState } from "react";
import { FormField, inputClass } from "@/components/ui/form-field";
import { updateMemberAction } from "../../actions";
import type { MemberEditField, MemberEditState } from "../../member-form-state";

const initial: MemberEditState = {};

export function MemberEditForm({
  id,
  initialValues,
}: {
  id: string;
  initialValues: Record<MemberEditField, string>;
}) {
  const [state, formAction, pending] = useActionState(updateMemberAction, initial);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? initialValues;

  return (
    <form action={formAction} className="card space-y-6 p-6" noValidate>
      <input type="hidden" name="id" value={id} />

      <FormField name="displayName" label="Name" error={errors.displayName}>
        {({ id: fid, describedBy, invalid }) => (
          <input id={fid} name="displayName" required maxLength={60} defaultValue={values.displayName} aria-invalid={invalid} aria-describedby={describedBy} className={inputClass} />
        )}
      </FormField>

      <FormField name="url" label="Website" error={errors.url}>
        {({ id: fid, describedBy, invalid }) => (
          <input id={fid} name="url" type="url" required maxLength={2048} defaultValue={values.url} aria-invalid={invalid} aria-describedby={describedBy} className={inputClass} />
        )}
      </FormField>

      <FormField name="description" label="Description" hint="Up to 160 characters." error={errors.description}>
        {({ id: fid, describedBy, invalid }) => (
          <textarea id={fid} name="description" rows={3} maxLength={160} defaultValue={values.description} aria-invalid={invalid} aria-describedby={describedBy} className={inputClass} />
        )}
      </FormField>

      <FormField name="tags" label="Tags" hint="Up to 5, separated by commas." error={errors.tags}>
        {({ id: fid, describedBy, invalid }) => (
          <input id={fid} name="tags" defaultValue={values.tags} aria-invalid={invalid} aria-describedby={describedBy} className={inputClass} />
        )}
      </FormField>

      <FormField name="accentColor" label="Accent colour" hint="Optional, like #888888. Leave empty for none." error={errors.accentColor}>
        {({ id: fid, describedBy, invalid }) => (
          <input id={fid} name="accentColor" maxLength={7} defaultValue={values.accentColor} aria-invalid={invalid} aria-describedby={describedBy} className={inputClass} />
        )}
      </FormField>

      <FormField name="avatarUrl" label="Avatar address" hint="Optional, https only. Leave empty for none." error={errors.avatarUrl}>
        {({ id: fid, describedBy, invalid }) => (
          <input id={fid} name="avatarUrl" type="url" maxLength={2048} defaultValue={values.avatarUrl} aria-invalid={invalid} aria-describedby={describedBy} className={inputClass} />
        )}
      </FormField>

      <button type="submit" disabled={pending} className="btn disabled:opacity-60">
        {pending ? "saving..." : "save changes"}
      </button>
    </form>
  );
}
