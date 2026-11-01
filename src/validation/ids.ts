import { z } from "zod";

/**
 * Member id: opaque and stable. This pattern is shared with the database
 * (members_id_format) and the widget (ID_RE in widget/src/v1.js).
 */
export const memberIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
