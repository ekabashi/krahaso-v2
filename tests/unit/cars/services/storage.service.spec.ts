import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageService } from '../../../../layers/cars/server/services/storage/storage.service'

describe('StorageService', () => {
  const bucketName = 'test-bucket'
  let mockUpload: ReturnType<typeof vi.fn>

  const createMockClient = () => ({
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
      })),
    },
  }) as unknown as import('@supabase/supabase-js').SupabaseClient

  beforeEach(() => {
    mockUpload = vi.fn()
  })

  describe('uploadDocument', () => {
    it('returns null when file is undefined', async () => {
      const client = createMockClient()
      const service = new StorageService(client, bucketName)
      const result = await service.uploadDocument(
        undefined,
        1,
        'Tenant Name',
        'Customer Name',
        'frontID',
      )
      expect(result).toBeNull()
      expect(mockUpload).not.toHaveBeenCalled()
    })

    it('builds path Tenant_<safe>_<id>/Customer_<safeCustomer>/...', async () => {
      mockUpload.mockResolvedValue({ error: null })
      const client = createMockClient()
      const service = new StorageService(client, bucketName)
      await service.uploadDocument(
        { filename: 'x.pdf', data: Buffer.from('x') },
        5,
        'My Tenant',
        'John Doe',
        'passport',
      )
      const path = mockUpload.mock.calls[0][0]
      expect(path).toContain('Tenant_My_Tenant_5')
      expect(path).toContain('Customer_john_doe')
      expect(path).toContain('john_doe_passport_')
      expect(path).toMatch(/\.pdf$/)
    })

    it('throws when storage upload returns error', async () => {
      mockUpload.mockResolvedValue({ error: { message: 'Bucket not found' } })
      const client = createMockClient()
      const service = new StorageService(client, bucketName)
      await expect(
        service.uploadDocument(
          { filename: 'x.jpg', data: Buffer.from('x') },
          1,
          'T',
          'C',
          'label',
        ),
      ).rejects.toThrow(/Failed to upload label: Bucket not found/)
    })
  })
})
