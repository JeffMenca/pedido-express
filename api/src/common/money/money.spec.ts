import { Money } from './money';

describe('Money', () => {
  describe('tryParse', () => {
    it.each([
      [32, 3200],
      [45.5, 4550],
      ['29.90', 2990],
      ['8', 800],
      [' 4 ', 400],
      [0, 0],
    ])('parses %p to %p cents', (input, expected) => {
      expect(Money.tryParse(input)).toBe(expected);
    });

    it.each([
      ['treinta'],
      [''],
      [null],
      [undefined],
      [-8],
      ['-8'],
      ['1.234'],
      [NaN],
      [{}],
    ])('rejects %p', (input) => {
      expect(Money.tryParse(input)).toBeNull();
    });
  });

  it('multiplies without floating point drift', () => {
    expect(Money.multiply(Money.parse('29.90'), 3)).toBe(8970);
    expect(Money.multiply(Money.parse('36.90'), 3)).toBe(11070);
    expect(Money.format(Money.multiply(Money.parse('29.90'), 3))).toBe('89.70');
  });

  it('computes a percentage rounding half up to the cent', () => {
    expect(Money.percentOf(10050, 1500)).toBe(1508); // 1507.5 -> 1508
    expect(Money.percentOf(10030, 1500)).toBe(1505); // 1504.5 -> 1505
    expect(Money.percentOf(10020, 1500)).toBe(1503); // 1503.0
  });

  it('splits a tax-inclusive total into base and tax that add up exactly', () => {
    const total = 13166;
    const base = Money.taxBaseFromInclusive(total, 1200);
    expect(base).toBe(11755);
    expect(total - base).toBe(1411);
  });
});
