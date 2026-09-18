export function DeleteConfirmation({
  pending,
  onCancel,
  onConfirm,
  shared = false,
}: {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  shared?: boolean;
}) {
  return (
    <div className="delete-confirmation" role="alert">
      <p>
        {shared
          ? "Move this recipe to Recently deleted for everyone in the group? Any current member can restore it for 30 days."
          : "Move this recipe to Recently deleted? You can restore it for 30 days."}
      </p>
      <button
        type="button"
        className="button button-small button-outline"
        disabled={pending}
        onClick={onCancel}
      >
        Cancel
      </button>

      <button
        type="button"
        className="button button-small button-danger"
        disabled={pending}
        onClick={onConfirm}
      >
        {pending ? "Deleting..." : "Delete recipe"}
      </button>
    </div>
  );
}
