export function normalizeMobile(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '')

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2)
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1)
  }

  return digits
}

export function isValidMobile(value: unknown): boolean {
  return /^[6-9]\d{9}$/.test(normalizeMobile(value))
}
