import { SUPPORT_EMAIL } from "@/lib/support";

export function SupportContact() {
  return SUPPORT_EMAIL ? (
    <p>
      Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you
      cannot sign in or need help with a request.
    </p>
  ) : (
    <p className="muted">
      Support email coming soon. While Prep Sheet is in preview, signed-in users
      can submit a report below. If you cannot sign in, contact the person who
      invited you.
    </p>
  );
}
