/**
 * The Loopback mark: five dots in a ring (a ring of sites). One definition for
 * the header (`components/logo.tsx`) and the iframe embed (`server/embed-html.ts`).
 * `src/app/icon.svg`, `favicon.ico` and `apple-icon.png` are drawn from the same
 * numbers (centre 16,16 in a 32 box; radius 9.6; dot radius 3.1), so redraw
 * them together if these change.
 */
export const LOGO_VIEWBOX = "3 3 26 26";
export const LOGO_DOT_RADIUS = 3.1;
export const LOGO_DOTS: ReadonlyArray<readonly [x: number, y: number]> = [
  [16.0, 6.4],
  [25.13, 13.03],
  [21.64, 23.77],
  [10.36, 23.77],
  [6.87, 13.03],
];
