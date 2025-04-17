import crypto from 'crypto';

export function generateResetToken(): { token: string; hashedToken: string; expires: Date } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes
  return { token: rawToken, hashedToken, expires };
}
