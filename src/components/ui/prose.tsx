import type { ReactNode } from "react";

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[68ch] space-y-5 [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:text-accent [&_h2]:before:text-muted [&_h2]:before:content-['$_']">
      {children}
    </div>
  );
}
