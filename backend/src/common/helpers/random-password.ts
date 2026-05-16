import * as crypto from 'crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export function generateRandomPassword(prefix: string, length = 12): string {
  const bytes = crypto.randomBytes(length);
  let body = '';
  for (let i = 0; i < length; i++) {
    body += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${prefix}${body}`;
}
