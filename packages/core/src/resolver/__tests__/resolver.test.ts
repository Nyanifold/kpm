import { describe, it, expect } from 'vitest'
import { resolveVersion } from '../index.js'

describe('resolveVersion', () => {
  const versions = ['1.0.0', '1.1.0', '1.2.0', '1.2.3', '2.0.0']

  it('returns exact version when range matches', () => {
    expect(resolveVersion('1.2.0', versions)).toBe('1.2.0')
  })

  it('resolves caret range to highest compatible', () => {
    expect(resolveVersion('^1.2.0', versions)).toBe('1.2.3')
  })

  it('resolves tilde range to patch updates only', () => {
    expect(resolveVersion('~1.2.0', versions)).toBe('1.2.3')
  })

  it('caret range does not cross major', () => {
    expect(resolveVersion('^1.0.0', versions)).toBe('1.2.3')
  })

  it('resolves wildcard to latest', () => {
    expect(resolveVersion('*', versions)).toBe('2.0.0')
  })

  it('resolves >=1.1.0', () => {
    expect(resolveVersion('>=1.1.0', versions)).toBe('2.0.0')
  })

  it('returns null when no version satisfies range', () => {
    expect(resolveVersion('^3.0.0', versions)).toBeNull()
  })

  it('returns null for empty list', () => {
    expect(resolveVersion('^1.0.0', [])).toBeNull()
  })
})
