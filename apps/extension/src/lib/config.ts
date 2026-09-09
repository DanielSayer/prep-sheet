import { originSchema } from "./origin";

export const prepSheetOrigin = originSchema.parse(
  import.meta.env.WXT_PREP_SHEET_ORIGIN,
);
