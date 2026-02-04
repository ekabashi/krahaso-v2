import { defineEventHandler, getRequestHeader, sendRedirect } from 'h3'

function pickLocaleFromAcceptLanguage(header: string | undefined): 'sq' | 'de' | 'en' {
  const value = (header || '').toLowerCase()

  if (value.includes('de')) return 'de'
  if (value.includes('en')) return 'en'
  return 'sq'
}

export default defineEventHandler((event) => {
  const path = event.path || ''

  if (path !== '/') return

  const acceptLang = getRequestHeader(event, 'accept-language')
  const locale = pickLocaleFromAcceptLanguage(acceptLang)

  return sendRedirect(event, `/${locale}/`, 302)
})
