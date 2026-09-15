import { useEffect, useState } from "react";
import { z } from "zod";

const savedChecks = z.array(z.string()).max(1000);

// Occurrences keep identical ingredient lines independently selectable.
export function ingredientKeys(ingredients: string[]) {
  const occurrences = new Map<string, number>();
  return ingredients.map((ingredient) => {
    const occurrence = occurrences.get(ingredient) ?? 0;
    occurrences.set(ingredient, occurrence + 1);
    return JSON.stringify([ingredient, occurrence]);
  });
}

export function useIngredientProgress(storageKey?: string) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const [storageFailed, setStorageFailed] = useState(false);

  useEffect(() => {
    setStorageFailed(false);
    if (!storageKey) {
      setChecked(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      const result = savedChecks.safeParse(raw ? JSON.parse(raw) : []);
      setChecked(new Set(result.success ? result.data : []));
    } catch {
      setChecked(new Set());
      setStorageFailed(true);
    }
  }, [storageKey]);

  const update = (next: Set<string>) => {
    setChecked(next);
    if (!storageKey) return;
    try {
      if (next.size)
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      else localStorage.removeItem(storageKey);
      setStorageFailed(false);
    } catch {
      setStorageFailed(true);
    }
  };

  return { checked, update, storageFailed };
}
