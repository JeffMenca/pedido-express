import { describe, expect, it } from 'vitest'
import { computeChangeCents, formatGTQ, parseAmountToCents } from './money'

describe('parseAmountToCents', () => {
  it.each([
    ['150', 15000],
    ['150.5', 15050],
    ['150.50', 15050],
    ['0.07', 7],
    ['1,250.75', 125075],
    [' 20 ', 2000],
    ['100.', 10000],
  ])('parses %j as %i cents', (input, expected) => {
    expect(parseAmountToCents(input)).toBe(expected)
  })

  it('avoids binary float drift', () => {
    // parseFloat('0.29') * 100 === 28.999999999999996
    expect(parseAmountToCents('0.29')).toBe(29)
    expect(parseAmountToCents('1.15')).toBe(115)
  })

  it.each(['', 'abc', '1.234', '-5', '1.2.3', '.5'])('rejects %j', (input) => {
    expect(parseAmountToCents(input)).toBeNull()
  })
})

describe('computeChangeCents', () => {
  it('returns the difference when cash covers the total', () => {
    expect(computeChangeCents(8750, 10000)).toBe(1250)
  })

  it('returns zero for exact payment', () => {
    expect(computeChangeCents(8750, 8750)).toBe(0)
  })

  it('returns null when cash is insufficient or missing', () => {
    expect(computeChangeCents(8750, 8749)).toBeNull()
    expect(computeChangeCents(8750, null)).toBeNull()
  })
})

describe('formatGTQ', () => {
  it('formats integer cents as quetzales with two decimals', () => {
    expect(formatGTQ(125075)).toMatch(/Q\s?1,250\.75/)
    expect(formatGTQ(5)).toMatch(/Q\s?0\.05/)
  })
})
