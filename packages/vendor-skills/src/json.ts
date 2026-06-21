import { readFileSync, writeFileSync } from "node:fs";

/** Read and parse a JSON file. */
export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** Write deterministic, newline-terminated JSON. */
export function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
