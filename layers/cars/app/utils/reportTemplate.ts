import type { SuperadminBooking, SettlementRequest } from '../types'

export interface ReportFilters {
  tenantId?: number | string | null
  status?: string | null
  startDate: string
  endDate: string
}

export interface ReportOptions {
  title: string
  partnerLabel: string
  statusLabel: string
  createdDateRangeLabel: string
  totalBookingsLabel: string
  totalRevenueLabel: string
  totalFeeLabel: string
  tableHeaders: {
    bookingNumber: string
    tenant: string
    status: string
    totalPrice: string
    fee: string
    rentalPeriod: string
  }
  formatCurrency: (amount: number) => string
  formatDate: (date: string, format: string) => string
  getStatusLabel: (status: string | null) => string
  getPartnerName?: (tenantId: number | string) => string | null
  getStatusName?: (status: string) => string | null
}

export async function generateBookingsReportPDF(
  bookings: SuperadminBooking[],
  filters: ReportFilters,
  options: ReportOptions,
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')

  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([595, 842])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let yPosition = 800
  const pageWidth = 595
  const margin = 50
  const lineHeight = 20

  const addText = (
    text: string,
    x: number,
    y: number,
    size: number = 12,
    isBold: boolean = false,
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: isBold ? boldFont : font,
      color: rgb(0, 0, 0),
    })
  }

  const addTextWithBoldValue = (
    label: string,
    value: string,
    x: number,
    y: number,
    size: number = 10,
  ) => {
    const labelWidth = font.widthOfTextAtSize(`${label}: `, size)
    page.drawText(`${label}: `, {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    })
    page.drawText(value, {
      x: x + labelWidth,
      y,
      size,
      font: boldFont,
      color: rgb(0, 0, 0),
    })
  }

  const titleSize = 20
  const titleWidth = boldFont.widthOfTextAtSize(options.title, titleSize)
  const titleX = Math.max(margin, (pageWidth - titleWidth) / 2)
  addText(options.title, titleX, yPosition, titleSize, true)
  yPosition -= 30

  if (filters.tenantId && filters.tenantId !== 'all') {
    const partnerName = options.getPartnerName?.(filters.tenantId) ?? '-'
    addTextWithBoldValue(options.partnerLabel, partnerName, margin, yPosition, 10)
    yPosition -= lineHeight
  }

  if (filters.status && filters.status !== 'all') {
    const statusName = options.getStatusName?.(filters.status) ?? '-'
    addTextWithBoldValue(options.statusLabel, statusName, margin, yPosition, 10)
    yPosition -= lineHeight
  }

  const periodText = `${options.formatDate(filters.startDate, 'DD MMM YYYY')} - ${options.formatDate(filters.endDate, 'DD MMM YYYY')}`
  addTextWithBoldValue(options.createdDateRangeLabel, periodText, margin, yPosition, 10)
  yPosition -= 30

  let reportBookings = [...bookings]

  if (filters.tenantId && filters.tenantId !== 'all') {
    const tenantIdNum =
      typeof filters.tenantId === 'string' ? parseInt(filters.tenantId) : filters.tenantId
    reportBookings = reportBookings.filter((b) => b.tenant?.id === tenantIdNum)
  }

  if (filters.status && filters.status !== 'all') {
    reportBookings = reportBookings.filter(
      (b) => b.status?.toLowerCase() === filters.status?.toLowerCase(),
    )
  }

  const startDateObj = new Date(filters.startDate)
  startDateObj.setHours(0, 0, 0, 0)
  const endDateObj = new Date(filters.endDate)
  endDateObj.setHours(23, 59, 59, 999)

  reportBookings = reportBookings.filter((b) => {
    const created = new Date(b.created_at)
    return created >= startDateObj && created <= endDateObj
  })

  const headers = [
    options.tableHeaders.bookingNumber,
    options.tableHeaders.tenant,
    options.tableHeaders.status,
    options.tableHeaders.totalPrice,
    options.tableHeaders.fee,
    options.tableHeaders.rentalPeriod,
  ]

  const columnWidths = [110, 80, 55, 65, 80, 185]
  let xPosition = margin

  headers.forEach((header, index) => {
    addText(header, xPosition, yPosition, 10, true)
    xPosition += columnWidths[index] ?? 100
  })

  yPosition -= 25
  xPosition = margin

  page.drawLine({
    start: { x: margin, y: yPosition + 5 },
    end: { x: pageWidth - margin, y: yPosition + 5 },
    thickness: 1,
    color: rgb(0, 0, 0),
  })

  yPosition -= 10

  reportBookings.forEach((booking) => {
    if (yPosition < 100) {
      const newPage = pdfDoc.addPage([595, 842])
      yPosition = 800
      page = newPage
    }

    xPosition = margin
    const rowData = [
      booking.booking_number,
      booking.tenant?.company_name ??
        booking.tenant?.name ??
        booking.tenant?.subdomain ??
        '-',
      options.getStatusLabel(booking.status),
      options.formatCurrency(booking.total_price),
      options.formatCurrency(booking.fee),
      `${options.formatDate(booking.startDateTime, 'DD MMM YYYY')} - ${options.formatDate(booking.endDateTime, 'DD MMM YYYY')}`,
    ]

    rowData.forEach((data, colIndex) => {
      let text = String(data)
      const maxChars = Math.floor((columnWidths[colIndex] ?? 100) / 4)
      if (text.length > maxChars) {
        text = text.substring(0, maxChars - 3) + '...'
      }
      addText(text, xPosition, yPosition, 8)
      xPosition += columnWidths[colIndex] ?? 100
    })

    yPosition -= 20
  })

  yPosition -= 10
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  })

  yPosition -= 20

  const totalBookings = reportBookings.length
  const totalRevenue = reportBookings.reduce((sum, b) => sum + b.total_price, 0)
  const totalFee = reportBookings.reduce((sum, b) => sum + b.fee, 0)

  addText(`${options.totalBookingsLabel}: ${totalBookings}`, margin, yPosition, 10)
  yPosition -= lineHeight

  addText(
    `${options.totalRevenueLabel}: ${options.formatCurrency(totalRevenue)}`,
    margin,
    yPosition,
    10,
  )
  yPosition -= lineHeight

  addText(`${options.totalFeeLabel}: ${options.formatCurrency(totalFee)}`, margin, yPosition, 10)

  return await pdfDoc.save()
}

export interface SettlementReportOptions {
  title: string
  partnerLabel: string
  createdDateLabel: string
  totalRevenueLabel: string
  totalFeeLabel: string
  transferAmountLabel: string
  tableHeaders: {
    bookingNumber: string
    vehicle: string
    totalPrice: string
    fee: string
    rentalPeriod: string
  }
  partnerName?: string
  formatCurrency: (amount: number) => string
  formatDate: (date: string, format: string) => string
}

export async function generateSettlementReportPDF(
  requests: any[],
  options: SettlementReportOptions
): Promise<Uint8Array> {
  const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')

  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([595, 842])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let yPosition = 800
  const pageWidth = 595
  const margin = 50

  const addText = (
    text: string,
    x: number,
    y: number,
    size: number = 12,
    isBold: boolean = false
  ) => {
    page.drawText(text, {
      x,
      y,
      size,
      font: isBold ? boldFont : font,
      color: rgb(0, 0, 0),
    })
  }

  const addTextWithBoldValue = (
    label: string,
    value: string,
    x: number,
    y: number,
    size: number = 10
  ) => {
    const labelWidth = font.widthOfTextAtSize(`${label}: `, size)
    page.drawText(`${label}: `, {
      x,
      y,
      size,
      font: font,
      color: rgb(0, 0, 0),
    })
    page.drawText(value, {
      x: x + labelWidth + 5,
      y,
      size,
      font: boldFont,
      color: rgb(0, 0, 0),
    })
  }

  const titleSize = 20
  const titleWidth = boldFont.widthOfTextAtSize(options.title, titleSize)
  const titleX = Math.max(margin, (pageWidth - titleWidth) / 2)
  addText(options.title, titleX, yPosition, titleSize, true)
  yPosition -= 40

  if (options.partnerName) {
    addTextWithBoldValue(options.partnerLabel, options.partnerName, margin, yPosition)
    yPosition -= 20
  }

  const settlementDate = requests.length > 0 && requests[0] ? requests[0].created_at : new Date().toISOString()
  addTextWithBoldValue(options.createdDateLabel, options.formatDate(settlementDate, 'DD MMM YYYY HH:mm'), margin, yPosition)
  yPosition -= 30

  const allBookings: Array<{
    booking_number: string
    vehicle: string
    total_price: number
    fee: number
    startDateTime: string
    endDateTime: string
  }> = []

  let totalPrice = 0
  let totalFee = 0

  requests.forEach((request) => {
    const bookings = (request as any).bookings as Array<{
      booking_number: string
      total_price: number
      fee: number
      vehicle: {
        make: string
        model: string
        license_plate?: string | null
      } | null
      startDateTime: string
      endDateTime: string
    }> | undefined
    if (bookings && bookings.length > 0) {
      bookings.forEach((booking: {
        booking_number: string
        total_price: number
        fee: number
        vehicle: {
          make: string
          model: string
          license_plate?: string | null
        } | null
        startDateTime: string
        endDateTime: string
      }) => {
        totalPrice += booking.total_price
        totalFee += booking.fee
        const vehicleText = booking.vehicle
          ? `${booking.vehicle.make} ${booking.vehicle.model}${booking.vehicle.license_plate ? ` (${booking.vehicle.license_plate})` : ''}`
          : '-'
        allBookings.push({
          booking_number: booking.booking_number,
          vehicle: vehicleText,
          total_price: booking.total_price,
          fee: booking.fee,
          startDateTime: booking.startDateTime,
          endDateTime: booking.endDateTime,
        })
      })
    }
  })

  const headers = [
    options.tableHeaders.bookingNumber,
    options.tableHeaders.vehicle,
    options.tableHeaders.totalPrice,
    options.tableHeaders.fee,
    options.tableHeaders.rentalPeriod,
  ]

  const columnWidths = [100, 120, 90, 90, 150]
  let xPosition = margin

  headers.forEach((header, index) => {
    addText(header, xPosition, yPosition, 9, true)
    xPosition += columnWidths[index] || 100
  })

  yPosition -= 10
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  })
  yPosition -= 20

  allBookings.forEach((booking) => {
    if (yPosition < 50) {
      const newPage = pdfDoc.addPage([595, 842])
      yPosition = 800
      page = newPage
    }

    xPosition = margin
    const rowData = [
      booking.booking_number,
      booking.vehicle,
      options.formatCurrency(booking.total_price),
      options.formatCurrency(booking.fee),
      `${options.formatDate(booking.startDateTime, 'DD MMM YYYY')} - ${options.formatDate(
        booking.endDateTime,
        'DD MMM YYYY'
      )}`,
    ]

    const rowHeight = 20

    if (yPosition - rowHeight < 50) {
      const newPage = pdfDoc.addPage([595, 842])
      yPosition = 800
      page = newPage
    }

    rowData.forEach((data, colIndex) => {
      let text = String(data)
      const maxChars = Math.floor((columnWidths[colIndex] || 100) / 5)
      if (text.length > maxChars) {
        text = text.substring(0, maxChars - 3) + '...'
      }
      addText(text, xPosition, yPosition, 8)
      xPosition += columnWidths[colIndex] || 100
    })

    yPosition -= rowHeight
  })

  yPosition -= 20
  page.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  })

  yPosition -= 40

  const transferAmount = totalPrice - totalFee
  const rightMargin = pageWidth - margin

  const addRightAlignedText = (
    label: string,
    value: string,
    y: number,
    size: number = 10,
    isBold: boolean = false
  ) => {
    const fullText = `${label}: ${value}`
    const textWidth = (isBold ? boldFont : font).widthOfTextAtSize(fullText, size)
    const x = rightMargin - textWidth
    addText(fullText, x, y, size, isBold)
  }

  addRightAlignedText(options.totalRevenueLabel, options.formatCurrency(totalPrice), yPosition, 10, false)
  yPosition -= 20

  addRightAlignedText(options.totalFeeLabel, options.formatCurrency(totalFee), yPosition, 10, false)
  yPosition -= 20

  const lineLength = 150
  page.drawLine({
    start: { x: rightMargin - lineLength, y: yPosition },
    end: { x: rightMargin, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  })
  yPosition -= 20

  addRightAlignedText(options.transferAmountLabel, options.formatCurrency(transferAmount), yPosition, 10, true)

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}