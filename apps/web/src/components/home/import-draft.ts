import { z } from "zod";

export const pendingImportSchema = z.object({
  id: z.uuid(),
  input: z.string().trim().min(3).max(20000),
  groupId: z.uuid().nullable(),
});
export type PendingImport = z.infer<typeof pendingImportSchema>;
export const importDraftKey = (userId: string) =>
  `prep-sheet-import:v1:${userId}`;

export function readPendingImport(key: string): PendingImport | null {
  try {
    const parsed = pendingImportSchema.safeParse(
      JSON.parse(sessionStorage.getItem(key) ?? "null"),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writePendingImport(key: string, value: PendingImport | null) {
  try {
    if (value) sessionStorage.setItem(key, JSON.stringify(value));
    else sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
