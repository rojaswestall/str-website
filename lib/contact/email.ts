import { Resend } from "resend";

import { getProperty } from "@/content";

import type { ContactInquiry } from "./schema";

/*
 * Sends an inquiry to the hosts through Resend.
 *
 * Env: RESEND_API_KEY (absent → dry run: the message is logged and treated as
 * sent, so local dev and CI need no secrets), CONTACT_FROM (a verified sender
 * on the Resend domain, "Name <addr>" allowed), CONTACT_TO (one address or a
 * comma-separated list). The guest's address goes in Reply-To so a host can
 * answer from their inbox.
 */

export type ContactMessage = {
  from: string;
  to: string[];
  replyTo: string;
  subject: string;
  text: string;
  html: string;
};

export function buildMessage(
  inquiry: ContactInquiry,
  env: { from: string; to: string[] },
): ContactMessage {
  const property = inquiry.property ? getProperty(inquiry.property) : undefined;
  const about = property?.name ?? "General";
  const subject = `Inquiry: ${about} — ${inquiry.name}`;

  const rows: [string, string][] = [
    ["Name", inquiry.name],
    ["Email", inquiry.email],
    ["Property", about],
    ["Check-in", inquiry.checkIn ?? "not given"],
    ["Checkout", inquiry.checkOut ?? "not given"],
  ];

  const text = [
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    inquiry.message,
  ].join("\n");

  const html = [
    "<table>",
    ...rows.map(
      ([label, value]) =>
        `<tr><th align="left">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
    ),
    "</table>",
    `<p style="white-space:pre-wrap">${escapeHtml(inquiry.message)}</p>`,
  ].join("");

  return {
    from: env.from,
    to: env.to,
    replyTo: inquiry.email,
    subject,
    text,
    html,
  };
}

export type SendResult =
  { sent: true; dryRun: boolean } | { sent: false; reason: string };

export async function sendInquiry(
  inquiry: ContactInquiry,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CONTACT_FROM?.trim() ?? "";
  const to = (process.env.CONTACT_TO ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!apiKey) {
    const message = buildMessage(inquiry, {
      from: from || "(CONTACT_FROM unset)",
      to: to.length ? to : ["(CONTACT_TO unset)"],
    });
    console.info(
      "[contact] RESEND_API_KEY is not set; dry run, not sending:\n" +
        `To: ${message.to.join(", ")}\nReply-To: ${message.replyTo}\nSubject: ${message.subject}\n\n${message.text}`,
    );
    return { sent: true, dryRun: true };
  }

  if (!from || to.length === 0) {
    return {
      sent: false,
      reason: "CONTACT_FROM and CONTACT_TO must be set when RESEND_API_KEY is",
    };
  }

  const message = buildMessage(inquiry, { from, to });
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send(message);
  if (error) return { sent: false, reason: `${error.name}: ${error.message}` };
  return { sent: true, dryRun: false };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
