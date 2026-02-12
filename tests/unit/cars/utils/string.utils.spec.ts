import { describe, it, expect } from 'vitest'
import { toSafeSegment, normalizeBucketName } from '../../../../layers/cars/server/utils/string.utils'

describe('cars/server/utils/string.utils', () => {
  describe('toSafeSegment', () => {
    it('replaces non-alphanumeric characters with single underscore', () => {
      expect(toSafeSegment('hello world')).toBe('hello_world')
      expect(toSafeSegment('a-b-c')).toBe('a_b_c')
      expect(toSafeSegment('test@mail.com')).toBe('test_mail_com')
    })

    it('strips leading and trailing underscores', () => {
      expect(toSafeSegment('___hello___')).toBe('hello')
      expect(toSafeSegment('  _  x _  ')).toBe('x')
    })

    it('trims whitespace', () => {
      expect(toSafeSegment('  foo  ')).toBe('foo')
      expect(toSafeSegment('\thello\t')).toBe('hello')
    })

    it('combines replace, strip and trim', () => {
      expect(toSafeSegment('  Hello World!  ')).toBe('Hello_World')
      expect(toSafeSegment('___a b c___')).toBe('a_b_c')
    })
  })

  describe('normalizeBucketName', () => {
    it('returns empty string for undefined and empty', () => {
      expect(normalizeBucketName(undefined)).toBe('')
      expect(normalizeBucketName('')).toBe('')
      expect(normalizeBucketName('   ')).toBe('')
    })

    it('strips http/https protocol', () => {
      expect(normalizeBucketName('https://example.com/bucket')).toBe('bucket')
      expect(normalizeBucketName('http://storage.example/bucket-name')).toBe('bucket-name')
    })

    it('when path contains / returns last segment', () => {
      expect(normalizeBucketName('https://x.y.z/foo/bar/bucket')).toBe('bucket')
      expect(normalizeBucketName('a/b/c')).toBe('c')
    })

    it('returns trimmed value when no slash', () => {
      expect(normalizeBucketName('  my-bucket  ')).toBe('my-bucket')
      expect(normalizeBucketName('single')).toBe('single')
    })
  })
})
