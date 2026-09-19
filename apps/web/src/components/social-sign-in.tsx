export type SignInProvider = "google" | "discord";

export function SocialSignIn({
  pending,
  disabled = false,
  onSignIn,
}: {
  pending: SignInProvider | null;
  disabled?: boolean;
  onSignIn: (provider: SignInProvider) => void;
}) {
  return (
    <div className="social-sign-in" aria-busy={pending !== null}>
      <button
        type="button"
        className="button button-outline"
        disabled={disabled || pending !== null}
        onClick={() => onSignIn("google")}
      >
        {pending === "google"
          ? "Connecting to Google..."
          : "Continue with Google"}
      </button>
      <button
        type="button"
        className="button button-outline"
        disabled={disabled || pending !== null}
        onClick={() => onSignIn("discord")}
      >
        {pending === "discord"
          ? "Connecting to Discord..."
          : "Continue with Discord"}
      </button>
    </div>
  );
}
