export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
