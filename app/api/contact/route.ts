import { NextResponse } from "next/server";

import { sendInquiry } from "@/lib/contact/email";
import { clientKey, consume } from "@/lib/contact/rateLimit";
import {
  ContactInquirySchema,
  fieldErrors,
  isHoneypotFilled,
} from "@/lib/contact/schema";

/*
 * POST /api/contact — the contact form's endpoint (step 10 posts JSON here).
 *
 *   200 { ok: true }                       sent, dry-run, or honeypot tripped
 *   400 { ok: false, message, errors }     errors: field → message
 *   429 { ok: false, message }             Retry-After header in seconds
 *   500 { ok: false, message }             send failed; detail is only logged
 *
 * Other methods get Next's automatic 405. Only valid inquiries count toward
 * the rate limit, so a guest correcting a typo is not locked out.
 */

const GENERIC_ERROR =
  "We couldn't send your message just now. Please try again or email us directly.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Send the form as JSON.", errors: {} },
      { status: 400 },
    );
  }

  // Bots fill the hidden field; pretend it worked and drop the message.
  if (isHoneypotFilled(body)) return NextResponse.json({ ok: true });

  const parsed = ContactInquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Please check the highlighted fields.",
        errors: fieldErrors(parsed.error),
      },
      { status: 400 },
    );
  }

  const limit = consume(clientKey(request.headers));
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        message: "Too many messages in a short time. Please try again later.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const result = await sendInquiry(parsed.data);
  if (!result.sent) {
    console.error(`[contact] send failed: ${result.reason}`);
    return NextResponse.json(
      { ok: false, message: GENERIC_ERROR },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
