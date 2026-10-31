import "server-only";

import { getBookingConfig } from "./config";
import { withRetry } from "./retry";
import { type UpstreamError, UpstreamErrorSchema } from "./upstream";

/*
 * Transport for the Hospitable Public API v2. The personal access token is
 * read here and nowhere else; `server-only` makes the build fail if a client
 * component ever imports this module. Only request metadata is logged —
 * method, path, status, duration, and Hospitable's reason phrase — never a
 * request or response body, which is where guest details would be.
 *
 * GET requests (properties, calendar) are retried once when the failure
 * looks transient: a dropped connection, the 12-second timeout, a 429, or a
 * 5xx. POST (quote) is never retried: each call creates a quote record in
 * Hospitable, and the widget has its own "Try again".
 */

const TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 300;

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

  /** Network failure, timeout, rate limit, or a server-side error. */
  get transient(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
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

function buildUrl(baseUrl: string, path: string, query?: Query): URL {
  const url = new URL(`${baseUrl}${path}`);
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

async function attempt(
  method: "GET" | "POST",
  path: string,
  url: URL,
  token: string,
  body: unknown,
): Promise<unknown> {
  const started = Date.now();

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : null,
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
    const parsed = parseError(text);
    const reason = parsed?.reason_phrase
      ? ` reason="${parsed.reason_phrase}"`
      : "";
    console.warn(
      `[hospitable] ${method} ${path} ${response.status} ${ms}ms${reason}`,
    );
    throw new HospitableError(response.status, path, parsed);
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

/** Calls Hospitable and returns the parsed JSON body; throws HospitableError on non-2xx. */
export async function hospitableFetch(
  path: string,
  request: HospitableRequest = {},
): Promise<unknown> {
  const { pat, baseUrl } = getBookingConfig().hospitable;
  if (!pat) throw new HospitableNotConfiguredError();

  const method = request.method ?? "GET";
  const url = buildUrl(baseUrl, path, request.query);

  return withRetry(() => attempt(method, path, url, pat, request.body), {
    attempts: method === "GET" ? 2 : 1,
    delayMs: RETRY_DELAY_MS,
    shouldRetry: (error) => error instanceof HospitableError && error.transient,
    onRetry: () => console.warn(`[hospitable] ${method} ${path} retrying`),
  });
}
