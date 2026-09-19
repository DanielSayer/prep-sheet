import { SUPPORT_EMAIL } from "@/lib/support";

export function SupportContact() {
  return SUPPORT_EMAIL ? (
    <p>
      Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> if you
      cannot sign in or need help with a request.
    </p>
  ) : (
    <p className="muted">
      Support email isn't available yet. Can't sign in? Contact the person who
      invited you.
    </p>
  );
}
