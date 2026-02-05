import type { SupabaseClient } from '@supabase/supabase-js'
import { toSafeSegment } from '../../utils/string.utils'

type MultipartFile = {
  name?: string
  filename?: string
  type?: string
  data: Buffer
}

export class StorageService {
  constructor(
    private client: SupabaseClient,
    private bucketName: string,
  ) {}

  async uploadDocument(
    file: MultipartFile | undefined,
    tenantId: number,
    tenantName: string,
    customerName: string,
    label: string,
  ): Promise<string | null> {
    if (!file) return null

    const extension = file.filename?.split('.').pop() ?? 'jpg'
    const safeCustomer =
      customerName
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '') || 'customer'
    const timestamp = String(Date.now())
    const tenantSegment = `Tenant_${toSafeSegment(tenantName)}_${String(tenantId)}`
    const path = `${tenantSegment}/Customer_${safeCustomer}/${safeCustomer}_${label}_${timestamp}.${extension}`

    const { error } = await this.client.storage
      .from(this.bucketName)
      .upload(path, file.data, {
        contentType: file.type ?? 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      throw new Error(`Failed to upload ${label}: ${error.message}`)
    }

    return path
  }

  async uploadDocuments(
    files: Record<string, MultipartFile | undefined>,
    tenantId: number,
    tenantName: string,
    customerName: string,
  ): Promise<{
    frontIdFile: string | null
    backIdFile: string | null
    passportFile: string | null
    patentShoferFile: string | null
  }> {
    const [frontIdPath, backIdPath, passportPath, patentShoferPath] =
      await Promise.all([
        this.uploadDocument(
          files.frontIdFile,
          tenantId,
          tenantName,
          customerName,
          'frontID',
        ),
        this.uploadDocument(
          files.backIdFile,
          tenantId,
          tenantName,
          customerName,
          'backID',
        ),
        this.uploadDocument(
          files.passportFile,
          tenantId,
          tenantName,
          customerName,
          'passport',
        ),
        this.uploadDocument(
          files.patentShoferFile,
          tenantId,
          tenantName,
          customerName,
          'patentShofer',
        ),
      ])

    return {
      frontIdFile: frontIdPath,
      backIdFile: backIdPath,
      passportFile: passportPath,
      patentShoferFile: patentShoferPath,
    }
  }
}
