/**
 * Utility to generate unique, URL-safe room slugs.
 * Format: XX-XX-XX (pairs of alphanumeric characters separated by hyphens)
 */

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"; // Removed I, O to avoid confusion

function randomChar(): string {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

/**
 * Generate a random slug in the format XX-XX-XX
 */
export function generateSlug(): string {
  const parts: string[] = [];
  for (let i = 0; i < 3; i++) {
    parts.push(randomChar() + randomChar());
  }
  return parts.join("-");
}
