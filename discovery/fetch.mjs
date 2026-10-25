// Phase 0 discovery helper. Run with:
//   node --env-file=.env.local discovery/fetch.mjs GET /properties out.json
//   node --env-file=.env.local discovery/fetch.mjs POST /properties/<id>/quote out.json '{"...json body..."}'
// Prints status + headers (auth redacted) to stderr and the body to stdout / the out file.
// The PAT never leaves process.env.

import { writeFileSync } from "node:fs";

const [method, path, outFile, bodyJson] = process.argv.slice(2);
if (!method || !path) {
  console.error("usage: fetch.mjs METHOD PATH [outFile] [bodyJson]");
  process.exit(2);
}

const token =
  process.env.HOSPITABLE_PAT ?? process.env.HOSPITABLE_PERSONAL_ACCESS_TOKEN;
if (!token) {
  console.error("missing HOSPITABLE_PAT / HOSPITABLE_PERSONAL_ACCESS_TOKEN");
  process.exit(2);
}

const url = `https://public.api.hospitable.com/v2${path}`;
const started = Date.now();
const res = await fetch(url, {
  method,
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...(bodyJson ? { "Content-Type": "application/json" } : {}),
  },
  body: bodyJson,
});
const text = await res.text();
const ms = Date.now() - started;

const headers = {};
for (const [k, v] of res.headers) headers[k] = v;
console.error(`${method} ${url} -> ${res.status} (${ms}ms)`);
console.error(
  JSON.stringify({
    "content-type": headers["content-type"],
    "x-ratelimit-limit": headers["x-ratelimit-limit"],
    "x-ratelimit-remaining": headers["x-ratelimit-remaining"],
  }),
);

let pretty = text;
try {
  pretty = JSON.stringify(JSON.parse(text), null, 2);
} catch {}

if (outFile) {
  writeFileSync(outFile, pretty + "\n");
  console.error(`wrote ${outFile} (${pretty.length} bytes)`);
} else {
  process.stdout.write(pretty + "\n");
}
process.exit(res.ok ? 0 : 1);
