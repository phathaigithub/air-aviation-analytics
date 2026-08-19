import { cp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve("dist/client");
const segments = (process.env.PAGES_BASE_PATH || "").split("/").filter(Boolean);

if (segments.includes("..")) throw new Error("Invalid PAGES_BASE_PATH.");
if (segments.length) {
  const nestedAssets = resolve(output, ...segments);
  await cp(nestedAssets, output, { recursive: true, force: true });
  await rm(nestedAssets, { recursive: true, force: true });
}

await writeFile(resolve(output, ".nojekyll"), "");
