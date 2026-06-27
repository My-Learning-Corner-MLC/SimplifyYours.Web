import { evaluatePasswordStrength } from './password-strength';

describe('evaluatePasswordStrength', () => {
  it('returns empty label for an empty string', () => {
    expect(evaluatePasswordStrength('')).toEqual({ score: 0, label: '' });
  });

  it('returns weak (score 0) for fewer than 8 characters regardless of mix', () => {
    expect(evaluatePasswordStrength('aB1!')).toEqual({ score: 0, label: 'Weak' });
    expect(evaluatePasswordStrength('abcdefg')).toEqual({ score: 0, label: 'Weak' });
  });

  it('returns weak (score 1) for >= 8 chars with only one character class', () => {
    expect(evaluatePasswordStrength('abcdefgh')).toEqual({ score: 1, label: 'Weak' });
    expect(evaluatePasswordStrength('ABCDEFGH')).toEqual({ score: 1, label: 'Weak' });
    expect(evaluatePasswordStrength('12345678')).toEqual({ score: 1, label: 'Weak' });
    expect(evaluatePasswordStrength('!@#$%^&*')).toEqual({ score: 1, label: 'Weak' });
  });

  it('returns okay (score 2) for >= 8 chars with two character classes', () => {
    expect(evaluatePasswordStrength('abcdefgH')).toEqual({ score: 2, label: 'Okay' });
    expect(evaluatePasswordStrength('abcdefg1')).toEqual({ score: 2, label: 'Okay' });
    expect(evaluatePasswordStrength('abcdefg!')).toEqual({ score: 2, label: 'Okay' });
  });

  it('returns okay (score 2) for three classes but fewer than 10 characters', () => {
    expect(evaluatePasswordStrength('abcdefG1')).toEqual({ score: 2, label: 'Okay' });
    expect(evaluatePasswordStrength('abcdefG1!')).toEqual({ score: 2, label: 'Okay' });
  });

  it('returns okay (score 2) for 10+ chars with three classes but no symbol', () => {
    expect(evaluatePasswordStrength('abcdefgH12')).toEqual({ score: 2, label: 'Okay' });
  });

  it('returns strong (score 3) for >= 10 chars with three+ classes including a symbol', () => {
    expect(evaluatePasswordStrength('abcdefgH1!')).toEqual({ score: 3, label: 'Strong' });
    expect(evaluatePasswordStrength('Correct-Horse-Battery-Staple-9')).toEqual({
      score: 3,
      label: 'Strong',
    });
  });
});
