const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function randomInt(max: number): number {
  // Math.random is sufficient for a local-only demo secret.
  return Math.floor(Math.random() * max);
}

export function generateTotpSecret(length = 32): string {
  let s = "";
  for (let i = 0; i < length; i++) s += BASE32_ALPHABET[randomInt(BASE32_ALPHABET.length)];
  return s;
}

export function formatSecretGroups(secret: string): string {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < 10; j++) {
      if (j === 5) code += "-";
      code += "0123456789ABCDEFGHJKMNPQRSTUVWXYZ"[randomInt(33)];
    }
    codes.push(code);
  }
  return codes;
}

export function buildOtpAuthUri(secret: string, account: string, issuer = "overthinkers"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3;
  labelKey: "password.strength.weak" | "password.strength.fair" | "password.strength.strong";
}

export function passwordStrength(pw: string): PasswordStrength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  if (pw.length >= 12 && score >= 2) score = 3;
  const s = Math.min(score, 3) as 0 | 1 | 2 | 3;
  const labelKey = s <= 1 ? "password.strength.weak" : s === 2 ? "password.strength.fair" : "password.strength.strong";
  return { score: s, labelKey };
}
