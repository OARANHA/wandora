const MASKABLE_RECIPIENT_RE = /^\+?\d{8,15}$/;

export function tryMaskMessagingRecipient(recipient: string): string | null {
  const compact = recipient.replace(/[\s()-]/g, '');
  if (!MASKABLE_RECIPIENT_RE.test(compact)) return null;
  const prefixLength = compact.startsWith('+')
    ? Math.min(5, compact.length - 4)
    : Math.min(4, compact.length - 4);
  if (prefixLength <= 0) return null;
  return `${compact.slice(0, prefixLength)}${'•'.repeat(compact.length - prefixLength - 4)}${compact.slice(-4)}`;
}

export function maskMessagingRecipient(recipient: string): string {
  return tryMaskMessagingRecipient(recipient) ?? 'Canal autorizado';
}
