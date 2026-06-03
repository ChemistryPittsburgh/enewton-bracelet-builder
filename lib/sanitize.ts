export const COMMENT_MAX_LENGTH = 2000;

/**
 * Strips all HTML tags from user-supplied comment text and enforces the max
 * length. Uses DOMParser (browser-native) so malformed tags and encoded
 * entities are handled correctly without any additional dependencies.
 */
export function sanitizeComment(raw: string): string {
  const doc = new DOMParser().parseFromString(raw, "text/html");
  const text = doc.body.textContent ?? "";
  return text.trim().slice(0, COMMENT_MAX_LENGTH);
}
