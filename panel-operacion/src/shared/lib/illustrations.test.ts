import { describe, expect, it } from 'vitest'
import { resolveIllustration } from './illustrations'

const urls = { 'P-001': '/a/P-001.svg', fallback: '/a/fallback.svg' }

describe('resolveIllustration', () => {
  it('returns the illustration for a known key', () => {
    expect(resolveIllustration(urls, 'P-001')).toBe('/a/P-001.svg')
  })

  it('falls back to the paper bag for unknown or missing keys', () => {
    expect(resolveIllustration(urls, 'P-999')).toBe('/a/fallback.svg')
    expect(resolveIllustration(urls, null)).toBe('/a/fallback.svg')
    expect(resolveIllustration(urls, undefined)).toBe('/a/fallback.svg')
  })

  it('returns an empty url when not even the fallback exists', () => {
    expect(resolveIllustration({}, 'P-001')).toBe('')
  })
})
