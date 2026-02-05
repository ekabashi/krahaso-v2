import type { SupabaseClient } from '@supabase/supabase-js'

export interface BookingEmailData {
  booking_number: string
  customer_name: string
  customer_email: string
  pickup_point: string
  return_point: string
  start_date: string
  end_date: string
  total_price: number
  qr_code_link: string
  tenant_id: number
  car_name: string
  rentalDays: number
  basePrice: number
  options: Record<string, number | null>
}

export interface TenantEmailInfo {
  tenantName: string
  tenantEmail: string | null
  tenantPhone: string | null
  logo: string | null
  primaryColor: string
  tenantPage: string
  tenantDomain: string | null
  tenantSubdomain: string
}

export interface BrevoEmailResponse {
  messageId?: string
}

export interface TenantAdminEmailData {
  tenant_email: string
  booking_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  pickup_point: string
  return_point: string
  start_date: string
  end_date: string
  total_price: number
  booking_link: string
  primaryColor: string
}

export class EmailService {
  constructor(
    private client: SupabaseClient,
    private brevoApiKey: string,
  ) {}

  async getTenantEmailInfo(tenantId: number): Promise<TenantEmailInfo> {
    const { data: companyInfo, error: companyError } = await this.client
      .from('company_public_info')
      .select('company_name, logo_url, public_phone, public_email')
      .eq('tenant_id', tenantId)
      .maybeSingle<{
        company_name: string | null
        logo_url: string | null
        public_phone: string | null
        public_email: string | null
      }>()

    if (companyError) {
      throw new Error(
        `Failed to fetch tenant company info: ${companyError.message}`,
      )
    }

    const { data: tenant, error: tenantError } = await this.client
      .from('tenants')
      .select('subdomain, domain')
      .eq('id', tenantId)
      .maybeSingle<{ subdomain: string; domain: string | null }>()

    if (tenantError) {
      throw new Error(`Failed to fetch tenant info: ${tenantError.message}`)
    }

    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`)
    }

    const domain = tenant.domain ?? null
    const subdomain = tenant.subdomain
    let tenantPage = 'https://krahaso.co'
    if (domain) {
      tenantPage = `https://${domain}`
    } else if (subdomain) {
      tenantPage = `https://${subdomain}.krahaso.co`
    }

    return {
      tenantName: companyInfo?.company_name ?? 'Krahaso',
      tenantEmail: companyInfo?.public_email ?? null,
      tenantPhone: companyInfo?.public_phone ?? null,
      logo: companyInfo?.logo_url ?? null,
      primaryColor: '#3b82f6',
      tenantPage,
      tenantDomain: domain,
      tenantSubdomain: subdomain,
    }
  }

  private generateEmailTemplate(
    data: BookingEmailData,
    tenantInfo: TenantEmailInfo,
  ): string {
    const {
      booking_number,
      customer_name,
      pickup_point,
      return_point,
      start_date,
      end_date,
      total_price,
      qr_code_link,
      car_name,
      rentalDays,
      basePrice,
    } = data
    const { tenantName, tenantEmail, primaryColor } = tenantInfo
    return `
<!DOCTYPE html>
<html lang="sq">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
<tr><td style="padding:30px 20px;text-align:center;background:#fff;">
<h2 style="color:${primaryColor};margin:0 0 20px;font-size:24px;">Rezervimi juaj u dërgua me sukses!</h2>
<p style="color:#555;font-size:16px;margin:0 auto 10px;">Përshëndetje <strong>${customer_name}</strong>,</p>
<p style="color:#555;font-size:16px;margin:0 auto 10px;">Numri i rezervimit: <strong style="color:${primaryColor};">#${booking_number}</strong></p>
</td></tr>
<tr><td style="padding:20px;background:#fff;">
<table width="100%"><tr>
<td width="50%" style="padding:10px;"><h3 style="color:${primaryColor};margin:0 0 10px;font-size:16px;">FILLIMI</h3><p style="margin:0;color:#333;font-size:14px;font-weight:bold;">${start_date}</p><p style="margin:5px 0 0;color:#555;font-size:14px;">${pickup_point}</p></td>
<td width="50%" style="padding:10px;"><h3 style="color:${primaryColor};margin:0 0 10px;font-size:16px;">MBARIMI</h3><p style="margin:0;color:#333;font-size:14px;font-weight:bold;">${end_date}</p><p style="margin:5px 0 0;color:#555;font-size:14px;">${return_point}</p></td>
</tr></table>
</td></tr>
<tr><td style="padding:20px;background:#fff;border-top:1px solid #eee;">
<p style="margin:0;color:#333;font-size:14px;">${car_name} (${rentalDays} ditë): ${basePrice}€</p>
<p style="margin:10px 0 0;font-weight:bold;color:#333;font-size:16px;">Totali: ${total_price}€</p>
</td></tr>
<tr><td style="padding:30px 20px;text-align:center;background:#f9f9f9;">
<h3 style="color:${primaryColor};margin:0 0 15px;font-size:18px;">Ndjek rezervimin</h3>
<a href="${qr_code_link}" target="_blank"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qr_code_link)}" alt="QR" style="width:150px;height:150px;border:5px solid #fff;"></a>
</td></tr>
<tr><td style="padding:20px;text-align:center;background:#333;">
<p style="color:#fff;font-size:12px;margin:0;">Kontakt: ${tenantEmail ?? 'info@krahaso.co'}</p>
<p style="color:#999;font-size:10px;margin:10px 0 0;">© ${new Date().getFullYear()} ${tenantName}. Të gjitha të drejtat e rezervuara.</p>
</td></tr>
</table>
</body>
</html>`.trim()
  }

  async sendBookingConfirmationEmail(
    data: BookingEmailData,
  ): Promise<BrevoEmailResponse> {
    if (!this.brevoApiKey?.trim()) {
      return {}
    }
    const tenantInfo = await this.getTenantEmailInfo(data.tenant_id)
    const htmlContent = this.generateEmailTemplate(data, tenantInfo)
    const response = await $fetch<{ messageId?: string }>(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: `${tenantInfo.tenantName} - Rezervime`,
            email: 'admin@autopika.al',
          },
          to: [{ email: data.customer_email, name: data.customer_name }],
          subject: `Rezervimi #${data.booking_number} u dërgua me sukses!`,
          htmlContent,
        }),
      },
    )
    return response
  }

  private generateTenantAdminEmailTemplate(
    data: TenantAdminEmailData,
  ): string {
    const {
      booking_number,
      customer_name,
      customer_email,
      customer_phone,
      pickup_point,
      return_point,
      start_date,
      end_date,
      total_price,
      booking_link,
      primaryColor,
      tenant_email,
    } = data
    return `
<!DOCTYPE html>
<html lang="sq">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
<tr><td style="padding:30px;background:#333;text-align:center;color:#fff;">
<h1 style="margin:0;font-size:26px;">REZERVIM I RI</h1><p style="margin:8px 0 0;color:#aaa;font-size:14px;">Nr. #${booking_number}</p>
</td></tr>
<tr><td style="padding:25px 30px;">
<p style="margin:0 0 5px;color:#95a5a6;font-size:13px;">KLIENTI</p><p style="margin:0;color:#2c3e50;font-weight:600;">${customer_name}</p>
<p style="margin:15px 0 5px;color:#95a5a6;font-size:13px;">EMAIL</p><p style="margin:0;color:#2c3e50;font-weight:600;">${customer_email}</p>
<p style="margin:15px 0 5px;color:#95a5a6;font-size:13px;">TELEFON</p><p style="margin:0;color:#2c3e50;font-weight:600;">${customer_phone}</p>
</td></tr>
<tr><td style="padding:0 30px 25px;">
<table width="100%"><tr>
<td width="50%" style="padding:10px;border-right:1px solid #eee;"><p style="margin:0 0 5px;color:${primaryColor};font-size:13px;">FILLIMI</p><p style="margin:0;color:#2c3e50;font-weight:600;">${start_date}</p><p style="margin:5px 0 0;color:#7f8c8d;font-size:14px;">${pickup_point}</p></td>
<td width="50%" style="padding:10px;"><p style="margin:0 0 5px;color:${primaryColor};font-size:13px;">MBARIMI</p><p style="margin:0;color:#2c3e50;font-weight:600;">${end_date}</p><p style="margin:5px 0 0;color:#7f8c8d;font-size:14px;">${return_point}</p></td>
</tr></table>
</td></tr>
<tr><td style="padding:18px 30px;background:#f8fafc;border-left:4px solid ${primaryColor};"><p style="margin:0;color:#7f8c8d;font-size:13px;">TOTALI</p><p style="margin:5px 0 0;color:#2c3e50;font-size:22px;font-weight:600;">${total_price} €</p></td></tr>
<tr><td style="padding:30px 20px;text-align:center;"><h3 style="color:${primaryColor};margin:0 0 15px;font-size:18px;">Shiko rezervimin</h3><a href="${booking_link}" target="_blank">${booking_link}</a></td></tr>
<tr><td style="padding:25px 30px;background:#333;text-align:center;"><p style="margin:0;color:#fff;font-size:12px;">Kontakt: ${tenant_email}</p></td></tr>
</table>
</body>
</html>`.trim()
  }

  async sendTenantAdminNotificationEmail(
    data: TenantAdminEmailData,
  ): Promise<BrevoEmailResponse> {
    if (!this.brevoApiKey?.trim()) {
      return {}
    }
    const htmlContent = this.generateTenantAdminEmailTemplate(data)
    const response = await $fetch<{ messageId?: string }>(
      'https://api.brevo.com/v3/smtp/email',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': this.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Rezervim i Ri', email: 'admin@autopika.al' },
          to: [{ email: data.tenant_email }],
          subject: `Rezervim #${data.booking_number}`,
          htmlContent,
        }),
      },
    )
    return response
  }
}
