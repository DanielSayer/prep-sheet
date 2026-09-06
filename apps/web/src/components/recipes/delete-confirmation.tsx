export function DeleteConfirmation({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="delete-confirmation" role="alert">
      <p>Remove this recipe from your collection?</p>
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
