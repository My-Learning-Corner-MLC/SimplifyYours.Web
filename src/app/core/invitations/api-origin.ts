/**
 * The origin a document served from `baseUrl` will report itself as posting from.
 *
 * Shared by every surface that hosts a sandboxed invitation iframe and needs to validate
 * `postMessage` senders against the API's origin (see `InvitationFrame`'s message guard).
 */
export function apiOrigin(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    // A relative apiBaseUrl means same-origin, which is what window.origin already is.
    return window.location.origin;
  }
}
