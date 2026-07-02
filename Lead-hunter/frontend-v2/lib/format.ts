const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const weekdayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

export function fmtDate(iso: string) {
  return dateFmt.format(new Date(iso)).replace(".", "");
}

export function fmtDateTime(iso: string) {
  return dateTimeFmt.format(new Date(iso)).replace(".", "");
}

export function fmtWeekday(iso: string) {
  return weekdayFmt.format(new Date(iso)).replaceAll(".", "");
}

export function fmtRelative(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays === 0) return "hoje";
  if (diffDays === 1) return "amanhã";
  if (diffDays === -1) return "ontem";
  if (diffDays > 1) return `em ${diffDays} dias`;
  return `há ${Math.abs(diffDays)} dias`;
}

export function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export function isOverdue(iso: string) {
  return new Date(iso).getTime() < Date.now() && !isToday(iso);
}

export function fmtInt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}
