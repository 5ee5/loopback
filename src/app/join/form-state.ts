export type ApplicationFieldName =
  | "displayName"
  | "url"
  | "description"
  | "tags"
  | "contactEmail";

export type ApplicationFormState = {
  status: "idle" | "success" | "error";
  /** Form-level message (closed, rate limited, already a member, ...). */
  message?: string;
  fieldErrors?: Partial<Record<ApplicationFieldName, string>>;
  /** Echoed back on error so the form doesn't lose what was typed. */
  values?: Record<ApplicationFieldName, string>;
};

export const initialApplicationState: ApplicationFormState = { status: "idle" };
