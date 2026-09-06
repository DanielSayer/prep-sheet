import { LoadingState } from "./feedback";

export default function Loader() {
  return (
    <LoadingState pending label="Just a moment...">
      {null}
    </LoadingState>
  );
}
