import { z } from "zod";
import { siteUrlSchema } from "./member";

/** A colour as it appears in the query string: 3 or 6 hex digits, no "#". Anything else is ignored. */
const hexColor = z
  .string()
  .regex(/^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  .transform((hex) => `#${hex.toLowerCase()}`)
  .optional()
  .catch(undefined);

/**
 * Query parameters of /embed. Only `url` can make the request fail (to an empty
 * frame); a bad colour is simply ignored. Nothing else in the query string is
 * read, and colours are the only values that ever reach the page's CSS.
 */
export const embedParamsSchema = z.object({
  url: siteUrlSchema,
  fgcolor: hexColor,
  bgcolor: hexColor,
});

export type EmbedParams = z.infer<typeof embedParamsSchema>;
