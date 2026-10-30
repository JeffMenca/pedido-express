const DECIMAL_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;
const BASIS_POINTS = 10_000;

function halfUpDivide(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

/** Monetary amounts are integer cents; decimals are parsed from text so floats never touch the math. */
export const Money = {
  tryParse(value: unknown): number | null {
    const text =
      typeof value === 'number'
        ? Number.isFinite(value)
          ? String(value)
          : ''
        : typeof value === 'string'
          ? value.trim()
          : '';
    const match = DECIMAL_PATTERN.exec(text);
    if (!match) return null;
    const [, units, fraction = ''] = match;
    return Number(units) * 100 + Number(fraction.padEnd(2, '0'));
  },

  parse(value: unknown): number {
    const cents = Money.tryParse(value);
    if (cents === null)
      throw new Error(`Invalid money amount: ${String(value)}`);
    return cents;
  },

  multiply(cents: number, quantity: number): number {
    return cents * quantity;
  },

  percentOf(cents: number, basisPoints: number): number {
    return halfUpDivide(cents * basisPoints, BASIS_POINTS);
  },

  taxBaseFromInclusive(totalCents: number, rateBasisPoints: number): number {
    return halfUpDivide(
      totalCents * BASIS_POINTS,
      BASIS_POINTS + rateBasisPoints,
    );
  },

  format(cents: number): string {
    const sign = cents < 0 ? '-' : '';
    const abs = Math.abs(cents);
    return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
  },
};
