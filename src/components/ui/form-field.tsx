import type { ReactNode } from "react";

export const inputClass =
  "w-full border border-line bg-surface px-3 py-2 text-foreground placeholder:text-muted/60 focus:border-accent aria-[invalid=true]:border-red-400";

/**
 * A labelled form field: label, optional hint, the control, and an error
 * message wired up with aria-describedby / aria-invalid.
 */
export function FormField({
  name,
  label,
  hint,
  error,
  children,
}: {
  /** Used to build ids; usually the field name. */
  name: string;
  label: string;
  hint?: string;
  error?: string;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}) {
  const id = `field-${name}`;
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-accent">
        <span aria-hidden="true" className="text-muted">$ </span>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="mt-2">{children({ id, describedBy, invalid: Boolean(error) })}</div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
