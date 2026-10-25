import "server-only";

import { NextResponse } from "next/server";

import { HospitableError, HospitableNotConfiguredError } from "./client";
import { mapUpstreamQuoteError, UntrustedCheckoutUrlError } from "./normalize";
import type { BookingErrorBody, BookingErrorCode } from "./types";

/*
 * Response helpers shared by the booking routes. Every error is
 * `{ ok: false, code, message }` with a message a guest can be shown.
 */

export function bookingError(
  code: BookingErrorCode,
  message: string,
  status: number,
  extra: { errors?: Record<string, string>; headers?: HeadersInit } = {},
): NextResponse<BookingErrorBody> {
  const body: BookingErrorBody = { ok: false, code, message };
  if (extra.errors) body.errors = extra.errors;
  return NextResponse.json(body, { status, headers: extra.headers });
}

const NOT_CONFIGURED =
  "Online booking isn't available right now. Please contact us to reserve.";
const UPSTREAM =
  "We couldn't reach our booking system just now. Please try again in a moment.";

/** Turns anything thrown while talking to Hospitable into a response, logging the cause. */
export function errorResponse(
  error: unknown,
  context: "properties" | "calendar" | "quote",
): NextResponse<BookingErrorBody> {
  if (error instanceof HospitableNotConfiguredError) {
    console.error(`[booking:${context}] ${error.message}`);
    return bookingError("NOT_CONFIGURED", NOT_CONFIGURED, 503);
  }
  if (error instanceof UntrustedCheckoutUrlError) {
    console.error(`[booking:${context}] ${error.message}`);
    return bookingError("UPSTREAM", UPSTREAM, 502);
  }
  if (error instanceof HospitableError) {
    if (context === "quote") {
      const mapped = mapUpstreamQuoteError(error.status, error.body);
      return bookingError(mapped.code, mapped.message, mapped.status);
    }
    if (error.status === 404) {
      return bookingError("NOT_FOUND", "We don't have that house.", 404);
    }
    return bookingError("UPSTREAM", UPSTREAM, 502);
  }
  console.error(
    `[booking:${context}] ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`,
  );
  return bookingError("UPSTREAM", UPSTREAM, 502);
}
