/** Minimal class joiner. Keeps a single dependency-free helper for conditional classes. */
export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
