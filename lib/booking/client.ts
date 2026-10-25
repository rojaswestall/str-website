import "server-only";

import { getBookingConfig } from "./config";
import { type UpstreamError, UpstreamErrorSchema } from "./upstream";

/*
 * Transport for the Hospitable Public API v2. The personal access token is
 * read here and nowhere else; `server-only` makes the build fail if a client
 * component ever imports this module. Only request metadata is logged —
 * method, path, status, duration, and Hospitable's reason phrase — never a
 * request or response body, which is where guest details would be.
 */

const BASE_URL = "https://public.api.hospitable.com/v2";
const TIMEOUT_MS = 12_000;

export class HospitableError extends Error {
  readonly status: number;
  readonly path: string;
  readonly body: UpstreamError | null;

  constructor(status: number, path: string, body: UpstreamError | null) {
    const reason = body?.reason_phrase ? `: ${body.reason_phrase}` : "";
    super(`Hospitable ${path} responded ${status}${reason}`);
    this.name = "HospitableError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

export class HospitableNotConfiguredError extends Error {
  constructor() {
    super("HOSPITABLE_PAT is not set.");
    this.name = "HospitableNotConfiguredError";
  }
}

export function hospitableConfigured(): boolean {
  return getBookingConfig().hospitable.pat !== null;
}

type Query = Record<string, string | number | undefined>;

export type HospitableRequest = {
  method?: "GET" | "POST";
  query?: Query;
  body?: unknown;
};

function buildUrl(path: string, query?: Query): URL {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function parseError(text: string): UpstreamError | null {
  try {
    const parsed = UpstreamErrorSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Calls Hospitable and returns the parsed JSON body; throws HospitableError on non-2xx. */
export async function hospitableFetch(
  path: string,
  request: HospitableRequest = {},
): Promise<unknown> {
  const token = getBookingConfig().hospitable.pat;
  if (!token) throw new HospitableNotConfiguredError();

  const method = request.method ?? "GET";
  const url = buildUrl(path, request.query);
  const started = Date.now();

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(request.body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: request.body !== undefined ? JSON.stringify(request.body) : null,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const ms = Date.now() - started;
    const reason = error instanceof Error ? error.name : String(error);
    console.error(`[hospitable] ${method} ${path} failed ${ms}ms ${reason}`);
    throw new HospitableError(0, path, { reason_phrase: reason });
  }

  const text = await response.text();
  const ms = Date.now() - started;

  if (!response.ok) {
    const body = parseError(text);
    const reason = body?.reason_phrase ? ` reason="${body.reason_phrase}"` : "";
    console.warn(
      `[hospitable] ${method} ${path} ${response.status} ${ms}ms${reason}`,
    );
    throw new HospitableError(response.status, path, body);
  }

  console.info(`[hospitable] ${method} ${path} ${response.status} ${ms}ms`);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HospitableError(response.status, path, {
      reason_phrase: "response was not JSON",
    });
  }
}
