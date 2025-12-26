/**
 * Shared text utility functions.
 */

/**
 * Convert a string to title case (e.g., "foo-bar" → "Foo Bar")
 */
export function titleCase(value: string): string {
  if (value.length === 0) return value;
  return value
    .split(/[-_\s]+/g)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
