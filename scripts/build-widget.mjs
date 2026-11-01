// Copies the standalone widget into public/ so Next serves it as a static file.
// No bundler: the widget is plain JS. Fails if it grows past its size budget.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

const BUDGET_GZIP_BYTES = 3 * 1024;
const source = await readFile(new URL("../widget/src/v1.js", import.meta.url));
const gzipped = gzipSync(source).length;

if (gzipped > BUDGET_GZIP_BYTES) {
  console.error(`widget v1.js is ${gzipped} B gzipped; budget is ${BUDGET_GZIP_BYTES} B`);
  process.exit(1);
}

const outDir = new URL("../public/widget/", import.meta.url);
await mkdir(outDir, { recursive: true });
await writeFile(new URL("v1.js", outDir), source);
console.log(`widget v1.js: ${source.length} B raw, ${gzipped} B gzipped`);
