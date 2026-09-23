export type CompanyEntityType = 'pj' | 'pf';

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeCnpj(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

export function validCpf(value: string): boolean {
  if (!/^[0-9.\-\s]+$/.test(value)) return false;
  const digits = onlyDigits(value);
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  const calculate = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += Number(digits[i]) * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculate(9) === Number(digits[9]) && calculate(10) === Number(digits[10]);
}

export function validCnpj(value: string): boolean {
  if (!/^[0-9A-Za-z.\/\-\s]+$/.test(value)) return false;
  const normalized = normalizeCnpj(value);
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(normalized)) return false;
  if (/^(\d)\1{13}$/.test(normalized)) return false;
  const cv = (character: string) => character.charCodeAt(0) - 48;
  const calculate = (base: string, weights: readonly number[]): number => {
    const sum = [...base].reduce((total, character, index) => total + cv(character) * (weights[index] ?? 0), 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = calculate(normalized.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (first !== Number(normalized[12])) return false;
  const second = calculate(normalized.slice(0, 12) + String(first), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return second === Number(normalized[13]);
}

export function validTaxId(entityType: CompanyEntityType, value: string): boolean {
  return entityType === 'pf' ? validCpf(value) : validCnpj(value);
}

export function validPostalCode(value: string): boolean {
  return /^[0-9\-\s]+$/.test(value) && /^\d{8}$/.test(onlyDigits(value));
}
