import type { FaqRow, PolicyRow } from "./types";

/*
 * Practicals rows from design/artifact.html. Every policy is still marked
 * `tbc` because the hosts have not confirmed them (docs/plan.md, "Needed
 * before step 3"). Flip `tbc` to false once confirmed.
 */
export const policies: PolicyRow[] = [
  {
    term: "Check-in",
    detail:
      "From 4:00 pm, self check-in with a keypad code sent the morning of arrival.",
    tbc: true,
  },
  {
    term: "Check-out",
    detail:
      "By 11:00 am. Late check-out to 1:00 pm when the calendar allows — just ask.",
    tbc: true,
  },
  {
    term: "Cleaning",
    detail:
      "One flat cleaning fee per stay, shown at booking. No hidden chore list on departure.",
    tbc: true,
  },
  {
    term: "Pets",
    detail: "Welcome at all three houses. Fee per stay to confirm.",
    tbc: true,
  },
  {
    term: "Cancellation",
    detail: "Full refund up to 14 days before arrival; 50% up to 7 days.",
    tbc: true,
  },
  {
    term: "Questions",
    detail:
      "A real person answers — our Airbnb response rate is 100%, typically within the hour.",
    tbc: true,
  },
];

/*
 * Direct-booking questions that stop a booking. Answers depend on how
 * Hospitable Direct and its payment setup are configured (open items for
 * steps 6 and 14), so they are placeholders.
 */
export const faqs: FaqRow[] = [
  {
    question: "How does payment work when I book direct?",
    answer:
      "[TBC] Describe the checkout flow: card payment through the booking widget, when the card is charged, and what confirmation the guest receives.",
    tbc: true,
  },
  {
    question: "Is there a deposit, and what happens if something gets damaged?",
    answer:
      "[TBC] Describe the security deposit or damage waiver, who holds it, and when it is released.",
    tbc: true,
  },
  {
    question: "What is the cancellation policy for direct bookings?",
    answer:
      "[TBC] Confirm whether the 14-day / 7-day policy above applies to direct bookings and how refunds are issued.",
    tbc: true,
  },
];
