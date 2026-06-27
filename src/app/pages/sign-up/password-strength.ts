export type PasswordStrengthScore = 0 | 1 | 2 | 3;
export type PasswordStrengthLabel = 'Weak' | 'Okay' | 'Strong' | '';

export interface PasswordStrength {
  score: PasswordStrengthScore;
  label: PasswordStrengthLabel;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, label: '' };
  }
  if (password.length < 8) {
    return { score: 0, label: 'Weak' };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const classes = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (classes <= 1) {
    return { score: 1, label: 'Weak' };
  }
  if (password.length >= 10 && classes >= 3 && hasSymbol) {
    return { score: 3, label: 'Strong' };
  }
  return { score: 2, label: 'Okay' };
}
