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
          ? "Remove this recipe for everyone in the group?"
          : "Remove this recipe from your personal collection?"}
      </p>
      <button
        type="button"
        className="button button-small button-outline"
        disabled={pending}
        onClick={onCancel}
      >
        Keep it
      </button>

      <button
        type="button"
        className="button button-small button-danger"
        disabled={pending}
        onClick={onConfirm}
      >
        {pending ? "Removing..." : "Yes, remove"}
      </button>
    </div>
  );
}
