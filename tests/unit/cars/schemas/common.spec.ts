import { describe, it, expect } from 'vitest'
import {
  tenantIdSchema,
  emailSchema,
  dateSchema,
  timeSchema,
  optionalCommaSeparatedToArray,
  optionalCommaSeparatedToNumberArray,
} from '../../../../layers/cars/server/schemas/common'

describe('cars/server/schemas/common', () => {
  describe('tenantIdSchema', () => {
    it('accepts string "1" and coerces to number 1', () => {
      expect(tenantIdSchema.parse('1')).toBe(1)
      expect(tenantIdSchema.parse(1)).toBe(1)
    })

    it('rejects 0 and negative', () => {
      expect(() => tenantIdSchema.parse(0)).toThrow()
      expect(() => tenantIdSchema.parse(-1)).toThrow()
      expect(() => tenantIdSchema.parse('0')).toThrow()
    })
  })

  describe('emailSchema', () => {
    it('trims and lowercases and accepts valid email', () => {
      expect(emailSchema.parse('  User@Example.COM  ')).toBe('user@example.com')
      expect(emailSchema.parse('a@b.co')).toBe('a@b.co')
    })

    it('fails for invalid email', () => {
      expect(() => emailSchema.parse('invalid')).toThrow()
      expect(() => emailSchema.parse('a@')).toThrow()
      expect(() => emailSchema.parse('')).toThrow()
    })
  })

  describe('dateSchema', () => {
    it('accepts YYYY-MM-DD format', () => {
      expect(dateSchema.parse('2025-06-01')).toBe('2025-06-01')
      expect(dateSchema.parse('2000-01-31')).toBe('2000-01-31')
    })

    it('rejects invalid format', () => {
      expect(() => dateSchema.parse('01-06-2025')).toThrow()
      expect(() => dateSchema.parse('2025/06/01')).toThrow()
      expect(() => dateSchema.parse('not-a-date')).toThrow()
    })
  })

  describe('timeSchema', () => {
    it('accepts HH:MM format', () => {
      expect(timeSchema.parse('09:30')).toBe('09:30')
      expect(timeSchema.parse('23:59')).toBe('23:59')
      expect(timeSchema.parse('00:00')).toBe('00:00')
    })

    it('rejects invalid format', () => {
      expect(() => timeSchema.parse('25:00')).toThrow()
      expect(() => timeSchema.parse('12:60')).toThrow()
      expect(() => timeSchema.parse('12:99')).toThrow()
    })
  })

  describe('optionalCommaSeparatedToArray', () => {
    it('parses "a, b ,c" to ["a","b","c"]', () => {
      expect(optionalCommaSeparatedToArray.parse('a, b ,c')).toEqual(['a', 'b', 'c'])
    })

    it('accepts undefined', () => {
      expect(optionalCommaSeparatedToArray.parse(undefined)).toBeUndefined()
    })
  })

  describe('optionalCommaSeparatedToNumberArray', () => {
    it('parses "1,2,x" to [1,2] (drops non-numeric)', () => {
      const result = optionalCommaSeparatedToNumberArray.parse('1,2,x')
      expect(result).toEqual([1, 2])
    })

    it('trims and filters', () => {
      expect(optionalCommaSeparatedToNumberArray.parse(' 1 , 2 , 3 ')).toEqual([1, 2, 3])
    })
  })
})
