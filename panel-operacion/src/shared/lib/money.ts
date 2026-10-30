const gtq = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatGTQ(cents: number): string {
  return gtq.format(cents / 100)
}

const CASH_INPUT = /^(\d{1,9})(?:\.(\d{0,2}))?$/

/**
 * Parses a user-typed amount ("150", "150.5", "1,250.75") into integer cents.
 * Splits on the decimal point instead of using parseFloat so no binary
 * rounding can leak into the amount. Returns null for anything invalid.
 */
export function parseAmountToCents(input: string): number | null {
  const normalized = input.trim().replace(/[\s,]/g, '')
  const match = CASH_INPUT.exec(normalized)
  if (!match) return null
  const whole = Number.parseInt(match[1], 10)
  const fraction = Number.parseInt((match[2] ?? '').padEnd(2, '0'), 10)
  return whole * 100 + fraction
}

/** Change owed to the customer, or null when the received amount does not cover the total. */
export function computeChangeCents(totalCents: number, receivedCents: number | null): number | null {
  if (receivedCents === null || receivedCents < totalCents) return null
  return receivedCents - totalCents
}

/** Renders integer cents as the plain "150.00" form the cash input accepts. */
export function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}
