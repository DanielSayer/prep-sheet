export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}
export function weekStart(value: string) {
  const day = new Date(`${value}T12:00:00`).getDay();
  return addDays(value, -(day === 0 ? 6 : day - 1));
}
export function dateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
