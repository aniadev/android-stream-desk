// S-LINK1: shared link-URL sanitizer
//
// Accept only http:// or https:// URLs that parse correctly. Reject every other
// scheme (file:, javascript:, data:, custom protocol handlers) so a malicious
// layout — sync'd via WebSocket or loaded from disk — can't open arbitrary URIs
// via the platform shell. The Rust backend re-validates in `validate_link_url`
// (defense in depth).
export const sanitizeLinkUrl = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
    // Reject embedded credentials (`https://user:pass@host`) — they don't belong
    // in a macro link and a credential-laden URL synced from a peer is a
    // phishing/leak vector. The Rust side mirrors this check.
    if (parsed.username || parsed.password) return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
};
