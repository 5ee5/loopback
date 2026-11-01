import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "webring-nav": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        member?: string;
        compact?: string;
      };
    }
  }
}
