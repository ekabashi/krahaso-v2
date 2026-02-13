/**
 * Aviopika WhatsApp Bot
 *
 * A WhatsApp bot for flight price queries using whatsapp-web.js
 *
 * Usage:
 *   npx tsx bot/index.ts
 *
 * On first run, scan the QR code with WhatsApp to authenticate.
 */

import pkg, { type Message } from 'whatsapp-web.js'
import qrcode from 'qrcode-terminal'
import { parseMessage, isQueryComplete, getMissingFields, validateQuery } from './parsers/index'
import { generateChatReply, generateGangMessage } from './parsers/chatgpt'
import { logInboundMessage, logOutboundMessage, closeDb } from './db'
import { config, validateConfig, logConfig } from './config'
import {
  initStateManager,
  closeStateManager,
  checkRateLimit,
  getConversation,
  updateConversation,
  clearConversation,
  isKnownUser,
  markUserAsKnown,
  setPreferredLanguage,
  getPreferredLanguage,
  isGangMode,
  setGangMode,
  setPostSearchPhase,
  saveLastSearch,
  getLastSearch
} from './state'
import type { LastSearchSummary } from './state'
import {
  looksLikeSearch,
  isSimpleYes,
  isSimpleNo,
  wantsReverseSearch,
  isReturnFlightRequest,
  isThankYou,
  isResetCommand,
  isGreeting,
  isExplicitHelpRequest,
  isFlightIntent,
  detectLanguageChoice
} from './helpers'
import {
  PostSearchPhase,
  MessageType,
  DEFAULT_LANGUAGE,
  SUPPORTED_DESTINATIONS,
  isRouteSupported
} from './types'
import type { Language } from './types'
import {
  processStateEvent,
  detectEventFromText,
  getReAskMessageKey
} from './state-machine'
import type { StateContext, StateEvent, StateResult, StateAction } from './state-machine'

import {
  formatOneWayResults,
  formatRoundtripResults,
  formatHelpMessage,
  formatIncompleteQuery,
  formatSearchingMessage,
  formatErrorMessage,
  formatNoResults,
  formatGreetingMessage,
  formatFirstContactMessage,
  formatProcessingMessage,
  formatConnectionIssueMessage,
  formatProviderContact,
  formatConfirmationMessage,
  getAvailabilityStats,
  formatFlexibleResults,
  formatSoldOutWithAlternatives
} from './formatter'
import type { ParsedQuery } from './parsers/index'
import { trackMessageReceived, trackResponseSent, trackSearch, trackProviderContact, trackRentalInterest, trackRouteNoAvailability } from './analytics'

const { Client, LocalAuth } = pkg

// WhatsApp client instance (for graceful shutdown)
let whatsappClient: InstanceType<typeof Client> | null = null
let isShuttingDown = false

/**
 * Send a reply and log it to the database
 */
async function sendAndLog(
  msg: Message,
  phoneNumber: string,
  response: string,
  messageType: string = 'text',
  language?: string,
  startTime?: number,
  gangMode: boolean = false,
  flightCount?: number,
  providerCount?: number
): Promise<void> {
  const responseTimeMs = startTime ? Date.now() - startTime : undefined
  const lang = (language as 'de' | 'en' | 'sq') || 'de'
  const finalResponse = gangMode ? gangify(response, messageType, lang) : response
  await msg.reply(finalResponse)
  // Log asynchronously (don't block)
  void logOutboundMessage(phoneNumber, finalResponse, messageType, language, responseTimeMs)
  // Track analytics asynchronously (use crypto UUID for message ID since whatsapp-web.js types don't expose id)
  void trackResponseSent(
    phoneNumber,
    crypto.randomUUID(),
    messageType,
    responseTimeMs ?? 0,
    language,
    flightCount,
    providerCount,
    messageType === 'results'
  )
}

// Easter egg - gang mode
const GANG_MODE_PASSWORD = 'avio-vip-gang'
const GANG_MODE_DISABLE = 'normal'
const GANG_MODE_SOURCE_ANSWER = 'er0'

// Gang mode verification state (in-memory)
interface GangVerification {
  step: 'awaiting_source' | 'awaiting_name'
  timestamp: number
}
const gangVerificationState = new Map<string, GangVerification>()

// Language selection state for new users (in-memory)
const languageSelectionState = new Map<string, number>() // phoneNumber -> timestamp

// Clean up old states (5 min timeout)
function cleanupPendingStates(): void {
  const now = Date.now()
  const timeout = 5 * 60 * 1000
  for (const [phone, timestamp] of gangVerificationState) {
    if (now - timestamp.timestamp > timeout) {
      gangVerificationState.delete(phone)
    }
  }
  for (const [phone, timestamp] of languageSelectionState) {
    if (now - timestamp > timeout) {
      languageSelectionState.delete(phone)
    }
  }
}

// Language selection message (shown in all 3 languages)
const LANGUAGE_SELECTION_MESSAGE = `Përshëndetje! 👋

Unë jam Asistenti i Aviopika's dhe të ndihmoj të gjesh fluturime të lira për në Kosovë.

Zgjidh gjuhën / Choose language / Wähle Sprache:
1️⃣ 🇦🇱 Shqip
2️⃣ 🇬🇧 English
3️⃣ 🇩🇪 Deutsch`

// Post-search follow-up messages
const POST_SEARCH_MESSAGES = {
  feedback: {
    de: '✈️ Und, was passendes dabei?\n➜ Ja\n➜ Nein, neue Suche',
    en: '✈️ Found something suitable?\n➜ Yes\n➜ No, new search',
    sq: '✈️ Gjetë diçka të përshtatshme?\n➜ Po\n➜ Jo, kërkim i ri'
  },
  foundFlight: {
    de: 'Super, gute Reise! 🎉 Brauchst du noch einen Mietwagen für deinen Aufenthalt?\n➜ Ja 🚗\n➜ Nein',
    en: 'Great, have a good trip! 🎉 Do you need a rental car for your stay?\n➜ Yes 🚗\n➜ No',
    sq: 'Shkëlqyeshëm, rrugë të mbarë! 🎉 A të duhet një makinë me qira për qëndrimin?\n➜ Po 🚗\n➜ Jo'
  },
  newSearch: {
    de: 'Kein Problem! Was suchst du?',
    en: 'No problem! What are you looking for?',
    sq: 'Asnjë problem! Çka po kërkon?'
  },
  rentalYes: {
    de: 'Vergleiche Mietwagen-Preise für Kosovo demächst auf: 👉 https://autopika.al. Gute Reise! ✈️',
    en: 'Compare rental car prices for Kosovo in the near future at: 👉 https://autopika.al. Have a great trip! ✈️',
    sq: 'Krahaso çmimet e makinave me qira për Kosovë në te ardhmen në: 👉 https://autopika.al. Rrugë të mbarë! ✈️'
  },
  rentalNo: {
    de: 'Alles klar! Gute Reise und bis bald! ✈️',
    en: 'All good! Have a great trip and see you soon! ✈️',
    sq: 'Në rregull! Rrugë të mbarë dhe shihemi së shpejti! ✈️'
  }
}

// Thank-you messages (graceful acknowledgment without pushy follow-up)
const THANK_YOU_MESSAGES: Record<'de' | 'en' | 'sq', string> = {
  de: 'Gern geschehen! Meld dich jederzeit, wenn du wieder Flüge suchst. ✈️',
  en: 'You\'re welcome! Reach out anytime you need flights again. ✈️',
  sq: 'Nuk ka përse! Na shkruaj kur të duash të kërkosh fluturime përsëri. ✈️'
}

/**
 * Format proactive suggestion message for returning users
 */
function formatProactiveSuggestion(lastSearch: LastSearchSummary, language: 'de' | 'en' | 'sq'): string {
  const date = new Date(lastSearch.date).toLocaleDateString(
    language === 'de' ? 'de-DE' : language === 'sq' ? 'sq-AL' : 'en-GB',
    { day: 'numeric', month: 'long' }
  )
  const price = lastSearch.cheapestPrice ? `${lastSearch.cheapestPrice}€` : ''

  const templates = {
    de: `Willkommen zurück! 👋\n\nDeine letzte Suche: *${lastSearch.from} → ${lastSearch.to}* am ${date}${price ? ` (ab ${price})` : ''}.\n\n➜ Nochmal suchen?\n➜ Neue Suche`,
    en: `Welcome back! 👋\n\nYour last search: *${lastSearch.from} → ${lastSearch.to}* on ${date}${price ? ` (from ${price})` : ''}.\n\n➜ Search again?\n➜ New search`,
    sq: `Mirë se u ktheve! 👋\n\nKërkimi yt i fundit: *${lastSearch.from} → ${lastSearch.to}* më ${date}${price ? ` (nga ${price})` : ''}.\n\n➜ Kërko përsëri?\n➜ Kërkim i ri`
  }

  return templates[language]
}

// Messages for asking return date
const RETURN_DATE_MESSAGES: Record<'de' | 'en' | 'sq', string> = {
  de: 'Wann möchtest du zurückfliegen? 📅',
  en: 'When would you like to fly back? 📅',
  sq: 'Kur dëshiron të kthehesh? 📅'
}

// Messages for unsupported routes
const UNSUPPORTED_DESTINATION_MESSAGES: Record<Language, string> = {
  de: '🌍 Wir spezialisieren uns auf Flüge nach/von Kosovo (Pristina) und Albanien (Tirana).\n\nKann ich dir bei einer Reise helfen? ✈️',
  en: '🌍 We specialize in flights to/from Kosovo (Pristina) and Albania (Tirana).\n\nCan I help you with a trip? ✈️',
  sq: '🌍 Ne specializohemi në fluturime për në/nga Kosovë (Prishtinë) dhe Shqipëri (Tiranë).\n\nA mund t\'ju ndihmoj me një udhëtim? ✈️'
}

/**
 * Detect user intent using GPT
 * Returns: positive, negative, unclear, or rental_request (when user asks for rental car)
 */
async function detectIntentWithGPT(
  text: string,
  context: 'feedback' | 'rental' | 'confirmation',
  language: 'de' | 'en' | 'sq'
): Promise<'positive' | 'negative' | 'unclear' | 'rental_request'> {
  if (!config.openai.apiKey) return 'unclear'

  const model = process.env.OPENAI_MODEL
  const contextPrompts = {
    feedback: `The user was asked if they found their flight. Determine:
- "positive" = YES (found it, thanks, done, booked, perfect)
- "negative" = NO (need new search, didn't find, try again)
- "rental_request" = User is asking about rental cars/Mietwagen/makina me qira (e.g. "klär mal mietwagen", "brauche auto", "need a car", "a ka makina")
- "unclear" = Can't determine intent`,
    rental: 'The user was asked if they need a rental car. Determine if their response means YES (need car) or NO (don\'t need).',
    confirmation: 'The user was asked to confirm their flight search parameters (origin, destination, date). Determine if their response means YES (confirm, proceed, search) or NO (wrong, change, correct). Phrases like "ok geht klar", "ja genau", "passt", "mach", "such" mean YES.'
  }

  const validResponses = context === 'feedback'
    ? ['positive', 'negative', 'rental_request', 'unclear']
    : ['positive', 'negative', 'unclear']

  try {
    const openai = await import('openai').then(m => new m.default.OpenAI({
      apiKey: config.openai.apiKey,
      timeout: 10000
    }))

    const response = await openai.responses.create({
      model,
      input: [
        {
          role: 'system',
          content: `${contextPrompts[context]}
Respond with ONLY one word: ${validResponses.map(r => `"${r}"`).join(', ')}.
User language: ${language}`
        },
        { role: 'user', content: text }
      ],
      max_output_tokens: 250 // gpt-5-mini needs buffer even though actual output is only ~7 tokens
    })

    const result = response.output_text?.trim().toLowerCase() as 'positive' | 'negative' | 'unclear' | 'rental_request'
    if (validResponses.includes(result)) {
      return result
    }
    return 'unclear'
  } catch (error) {
    console.error('[IntentDetection] GPT error:', error)
    return 'unclear'
  }
}

/**
 * Handle post-search phase using state machine
 * Returns true if handled (should return from handleMessage), false to continue
 */
async function handlePostSearchPhase(
  msg: Message,
  phoneNumber: string,
  text: string,
  phase: PostSearchPhase,
  ctx: StateContext,
  startTime: number,
  gangModeActive: boolean
): Promise<{ handled: boolean, continueToSearch?: boolean }> {
  // Detect event from text (uses regex helpers)
  let event = detectEventFromText(text, phase)

  // If unclear, use GPT for intent detection
  if (event.type === 'unclear') {
    const gptContext = phase === PostSearchPhase.AwaitingFeedback
      ? 'feedback'
      : phase === PostSearchPhase.AwaitingRental
        ? 'rental'
        : phase === PostSearchPhase.AwaitingConfirmation
          ? 'confirmation'
          : 'feedback'

    const gptIntent = await detectIntentWithGPT(text, gptContext, ctx.language)
    event = detectEventFromText(text, phase, gptIntent)
  }

  // Process through state machine
  const result = processStateEvent(phase, event, ctx)

  // Execute the action
  return await executeStateAction(msg, phoneNumber, text, result, ctx, startTime, gangModeActive, phase)
}

/**
 * Execute state machine action
 */
async function executeStateAction(
  msg: Message,
  phoneNumber: string,
  text: string,
  result: StateResult,
  ctx: StateContext,
  startTime: number,
  gangModeActive: boolean,
  currentPhase: PostSearchPhase
): Promise<{ handled: boolean, continueToSearch?: boolean }> {
  const { action, nextPhase } = result

  switch (action.action) {
    case 'ask_rental': {
      void logInboundMessage(phoneNumber, text, { type: 'feedback_response', language: ctx.language, raw: text, intent: 'positive' })
      const rentalQuestion = POST_SEARCH_MESSAGES.foundFlight[ctx.language]
      await sendAndLog(msg, phoneNumber, rentalQuestion, 'rental_question', ctx.language, startTime, gangModeActive)
      await setPostSearchPhase(phoneNumber, nextPhase)
      return { handled: true }
    }

    case 'show_rental_info': {
      void logInboundMessage(phoneNumber, text, { type: 'rental_response', language: ctx.language, raw: text })
      void trackRentalInterest(phoneNumber, true, ctx.language)
      const rentalInfo = POST_SEARCH_MESSAGES.rentalYes[ctx.language]
      await sendAndLog(msg, phoneNumber, rentalInfo, 'rental_info', ctx.language, startTime, gangModeActive)
      await clearConversation(phoneNumber)
      return { handled: true }
    }

    case 'show_goodbye': {
      void logInboundMessage(phoneNumber, text, { type: 'rental_response', language: ctx.language, raw: text })
      void trackRentalInterest(phoneNumber, false, ctx.language)
      const goodbye = POST_SEARCH_MESSAGES.rentalNo[ctx.language]
      await sendAndLog(msg, phoneNumber, goodbye, 'goodbye', ctx.language, startTime, gangModeActive)
      await clearConversation(phoneNumber)
      return { handled: true }
    }

    case 'prompt_new_search': {
      void logInboundMessage(phoneNumber, text, { type: 'feedback_response', language: ctx.language, raw: text, intent: 'negative' })
      const newSearchMsg = POST_SEARCH_MESSAGES.newSearch[ctx.language]
      await sendAndLog(msg, phoneNumber, newSearchMsg, 'new_search_prompt', ctx.language, startTime, gangModeActive)
      await clearConversation(phoneNumber)
      return { handled: true }
    }

    case 'ask_return_date': {
      void logInboundMessage(phoneNumber, text, { type: 'feedback_response', language: ctx.language, raw: text, intent: 'positive' })
      const returnDateMsg = RETURN_DATE_MESSAGES[ctx.language]
      await sendAndLog(msg, phoneNumber, returnDateMsg, 'return_date_question', ctx.language, startTime, gangModeActive)
      await setPostSearchPhase(phoneNumber, nextPhase)
      return { handled: true }
    }

    case 'execute_reverse_search': {
      void logInboundMessage(phoneNumber, text, { type: 'search', language: ctx.language, raw: text, intent: 'new_search' })

      const reversedQuery: ParsedQuery = {
        type: 'search',
        from: action.from,
        to: action.to,
        outboundDate: action.date,
        returnDate: action.returnDate,
        language: ctx.language,
        raw: text,
        confidence: 0.95
      }

      const searchingMsg = formatSearchingMessage(reversedQuery)
      await sendAndLog(msg, phoneNumber, searchingMsg, 'searching', ctx.language, startTime, gangModeActive)

      const { results, flexibleFallback, usedFlexible } = await performFlightSearchWithFallback(reversedQuery, phoneNumber)

      let response: string
      let messageType: string

      if (usedFlexible && flexibleFallback) {
        response = formatFlexibleResults(flexibleFallback, reversedQuery, config.api.websiteUrl)
        messageType = flexibleFallback.outbound.cheapestDate ? 'flexible_results' : 'no_results'
      } else if (results) {
        const flightCount = (results.outboundFlights?.length || 0) + (results.returnFlights?.length || 0)
        if (flightCount > 0) {
          response = formatOneWayResults(results, reversedQuery, config.api.websiteUrl, phoneNumber)
          messageType = 'results'
        } else {
          response = formatNoResults(reversedQuery)
          messageType = 'no_results'
        }
      } else {
        response = formatNoResults(reversedQuery)
        messageType = 'no_results'
      }

      await sendAndLog(msg, phoneNumber, response, messageType, ctx.language, startTime, gangModeActive)
      await updateConversation(phoneNumber, reversedQuery, text, response, ctx.language, 'awaiting_feedback')

      // Send follow-up question
      const followUp = POST_SEARCH_MESSAGES.feedback[ctx.language]
      await sendAndLog(msg, phoneNumber, followUp, 'follow_up', ctx.language, startTime, gangModeActive)
      return { handled: true }
    }

    case 'execute_return_search': {
      void logInboundMessage(phoneNumber, text, { type: 'search', language: ctx.language, raw: text })

      const returnQuery: ParsedQuery = {
        type: 'search',
        from: action.from,
        to: action.to,
        outboundDate: action.date,
        language: ctx.language,
        raw: text,
        confidence: 0.95
      }

      // Clear the awaiting_return_date phase before search
      await setPostSearchPhase(phoneNumber, null)

      const searchingMsg = formatSearchingMessage(returnQuery)
      await sendAndLog(msg, phoneNumber, searchingMsg, 'searching', ctx.language, startTime, gangModeActive)

      void trackSearch(phoneNumber, action.from, action.to, action.date, undefined, ctx.previousQuery?.passengers, ctx.language)
      const results = await searchFlights(action.from, action.to, action.date, undefined, ctx.previousQuery?.passengers)

      let response: string
      let messageType: string
      const flightCount = results.outboundFlights?.length || 0
      const providerCount = results.meta?.providers?.length || 0
      const availStats = getAvailabilityStats(results)

      if (results.outboundFlights.length > 0) {
        response = formatOneWayResults(results, returnQuery, config.api.websiteUrl, phoneNumber)
        messageType = 'results'
      } else {
        response = formatNoResults(returnQuery)
        messageType = 'no_results'
      }

      if (!availStats.hasAvailability && availStats.totalFlights > 0) {
        void trackRouteNoAvailability(phoneNumber, action.from, action.to, action.date, {
          totalFlightsReturned: availStats.totalFlights,
          soldOutFlights: availStats.soldOutFlights,
          bookableFlights: availStats.bookableFlights
        }, ctx.language)
      }

      await sendAndLog(msg, phoneNumber, response, messageType, ctx.language, startTime, gangModeActive, flightCount, providerCount)
      console.log(`[${phoneNumber}] Sent return flight results (${flightCount} flights)`)

      // Save return flight search results
      const cheapestReturnFlight = results.outboundFlights?.reduce((min: any, f: any) =>
        (f.price && (!min || f.price < min.price)) ? f : min, null)
      const returnSearchSummary: LastSearchSummary = {
        from: action.from,
        to: action.to,
        date: action.date,
        flightCount: results.outboundFlights?.length || 0,
        cheapestPrice: cheapestReturnFlight?.price,
        providers: results.meta?.providers || [],
        searchedAt: Date.now()
      }
      await saveLastSearch(phoneNumber, returnSearchSummary)

      await updateConversation(phoneNumber, returnQuery, text, response, ctx.language)

      if (availStats.hasAvailability) {
        await setPostSearchPhase(phoneNumber, PostSearchPhase.AwaitingFeedback)
        setTimeout(async () => {
          try {
            const followUpMsg = POST_SEARCH_MESSAGES.feedback[ctx.language]
            await msg.reply(followUpMsg)
            void logOutboundMessage(phoneNumber, followUpMsg, 'follow_up', ctx.language)
          } catch (error) {
            console.error(`[${phoneNumber}] Failed to send follow-up:`, error)
          }
        }, 3000)
      }
      return { handled: true }
    }

    case 'execute_search': {
      void logInboundMessage(phoneNumber, text, { type: 'confirmation', language: ctx.language, raw: text, confirmed: true })

      const query = action.query
      await setPostSearchPhase(phoneNumber, null)

      const queryWithLang = { ...query, language: ctx.language }
      const searchingMsg = formatSearchingMessage(queryWithLang)
      await sendAndLog(msg, phoneNumber, searchingMsg, 'searching', ctx.language, startTime, gangModeActive)

      void trackSearch(phoneNumber, query.from!, query.to!, query.outboundDate!, query.returnDate, query.passengers, ctx.language)

      const results = await searchFlights(query.from!, query.to!, query.outboundDate!, query.returnDate, query.passengers)

      let response: string
      let messageType: string
      const flightCount = (results.outboundFlights?.length || 0) + (results.returnFlights?.length || 0)
      const providerCount = results.meta?.providers?.length || 0
      const availStats = getAvailabilityStats(results)

      if (query.type === 'roundtrip' && query.returnDate) {
        response = formatRoundtripResults(results, queryWithLang, config.api.websiteUrl, phoneNumber)
        messageType = results.outboundFlights.length > 0 ? 'results' : 'no_results'
      } else if (results.outboundFlights.length > 0) {
        response = formatOneWayResults(results, queryWithLang, config.api.websiteUrl, phoneNumber)
        messageType = 'results'
      } else {
        response = formatNoResults(queryWithLang)
        messageType = 'no_results'
      }

      if (!availStats.hasAvailability && availStats.totalFlights > 0) {
        void trackRouteNoAvailability(phoneNumber, query.from!, query.to!, query.outboundDate!, {
          totalFlightsReturned: availStats.totalFlights,
          soldOutFlights: availStats.soldOutFlights,
          bookableFlights: availStats.bookableFlights
        }, ctx.language)
      }

      await sendAndLog(msg, phoneNumber, response, messageType, ctx.language, startTime, gangModeActive, flightCount, providerCount)
      console.log(`[${phoneNumber}] Sent results (${results.outboundFlights?.length || 0} flights, ${availStats.bookableFlights} bookable)`)

      // Save search results summary
      const cheapestFlight = results.outboundFlights?.reduce((min: any, f: any) =>
        (f.price && (!min || f.price < min.price)) ? f : min, null)
      const searchSummary: LastSearchSummary = {
        from: query.from!,
        to: query.to!,
        date: query.outboundDate!,
        returnDate: query.returnDate,
        flightCount: results.outboundFlights?.length || 0,
        cheapestPrice: cheapestFlight?.price,
        providers: results.meta?.providers || [],
        searchedAt: Date.now()
      }
      await saveLastSearch(phoneNumber, searchSummary)

      if (availStats.hasAvailability) {
        await setPostSearchPhase(phoneNumber, PostSearchPhase.AwaitingFeedback)
        setTimeout(async () => {
          try {
            const followUpMsg = POST_SEARCH_MESSAGES.feedback[ctx.language]
            await msg.reply(followUpMsg)
            void logOutboundMessage(phoneNumber, followUpMsg, 'follow_up', ctx.language)
          } catch (error) {
            console.error(`[${phoneNumber}] Failed to send follow-up:`, error)
          }
        }, 3000)
      }
      return { handled: true }
    }

    case 'chat_reply': {
      if (config.openai.apiKey) {
        try {
          const reply = await generateChatReply(text, ctx.history)
          if (reply) {
            await sendAndLog(msg, phoneNumber, reply, 'chat', ctx.language, startTime, gangModeActive)
            // Stay in current phase
            return { handled: true }
          }
        } catch (error) {
          console.error(`[${phoneNumber}] Chat reply error:`, error)
        }
      }
      // Fallback to re-ask
      const messageKey = getReAskMessageKey(currentPhase)
      if (messageKey === 'feedback') {
        const followUpMsg = POST_SEARCH_MESSAGES.feedback[ctx.language]
        await sendAndLog(msg, phoneNumber, followUpMsg, 'follow_up', ctx.language, startTime, gangModeActive)
      } else if (messageKey === 'foundFlight') {
        const rentalQuestion = POST_SEARCH_MESSAGES.foundFlight[ctx.language]
        await sendAndLog(msg, phoneNumber, rentalQuestion, 'rental_question', ctx.language, startTime, gangModeActive)
      } else if (messageKey === 'returnDate') {
        const returnDateMsg = RETURN_DATE_MESSAGES[ctx.language]
        await sendAndLog(msg, phoneNumber, returnDateMsg, 'return_date_question', ctx.language, startTime, gangModeActive)
      }
      return { handled: true }
    }

    case 're_ask': {
      const messageKey = getReAskMessageKey(currentPhase)
      if (messageKey === 'feedback') {
        const followUpMsg = POST_SEARCH_MESSAGES.feedback[ctx.language]
        await sendAndLog(msg, phoneNumber, followUpMsg, 'follow_up', ctx.language, startTime, gangModeActive)
      } else if (messageKey === 'foundFlight') {
        const rentalQuestion = POST_SEARCH_MESSAGES.foundFlight[ctx.language]
        await sendAndLog(msg, phoneNumber, rentalQuestion, 'rental_question', ctx.language, startTime, gangModeActive)
      } else if (messageKey === 'returnDate') {
        const returnDateMsg = RETURN_DATE_MESSAGES[ctx.language]
        await sendAndLog(msg, phoneNumber, returnDateMsg, 'return_date_question', ctx.language, startTime, gangModeActive)
      }
      return { handled: true }
    }

    case 'continue_parsing': {
      // Clear phase and continue to normal parsing
      await clearConversation(phoneNumber)
      return { handled: false, continueToSearch: true }
    }

    case 'none':
    default:
      return { handled: false }
  }
}

/**
 * Transform response to gang slang when gang mode is active
 */
function gangify(text: string, messageType: string, language: 'de' | 'en' | 'sq' = 'de'): string {
  const gangStyles = {
    de: {
      prefixes: ['Yo digga, ', 'Wallah bro, ', 'Ey habibi, ', 'Safe safe, ', 'Mashallah, '],
      suffixes: [' 🦅', ' wallah!', ' digga!', ' bre!', ' safe!'],
      results: (p: string, s: string, t: string) => `${p}check die Flüge aus${s}\n\n${t}\n\nBrauchst was anderes? Sag bescheid bro!`,
      searching: 'Moment digga, ich check das kurz für dich... 🔍',
      greeting: 'Yooo was geht bro! 🦅 Wohin soll die Reise gehen digga?',
      help: 'Ey bro, sag mir einfach wohin du fliegen willst und wann. Zum Beispiel: "DUS PRN morgen" - easy wallah! 🦅',
      error: 'Ey sorry bro, da ist was schiefgelaufen wallah. Versuch nochmal!'
    },
    en: {
      prefixes: ['Yo fam, ', 'No cap, ', 'Fr fr, ', 'Bet, ', 'Lowkey, '],
      suffixes: [' 🦅', ' fr fr!', ' no cap!', ' innit!', ' fam!'],
      results: (p: string, s: string, t: string) => `${p}check these flights out${s}\n\n${t}\n\nNeed anything else? Hmu fam!`,
      searching: 'Hold up fam, lemme check real quick... 🔍',
      greeting: 'Yooo what\'s good fam! 🦅 Where you tryna fly to?',
      help: 'Yo fam, just tell me where you wanna fly and when. Like: "DUS PRN tomorrow" - easy! 🦅',
      error: 'Ayo sorry fam, something went wrong fr. Try again!'
    },
    sq: {
      prefixes: ['Ej vlla, ', 'O haver, ', 'Bre, ', 'Shqipe, ', 'Qysh, '],
      suffixes: [' 🦅', ' bre!', ' vlla!', ' shqipe!', ' mor!'],
      results: (p: string, s: string, t: string) => `${p}shiko fluturimet${s}\n\n${t}\n\nTe duhet dicka tjeter? Thirrem bre!`,
      searching: 'Prit pak vlla, po shof... 🔍',
      greeting: 'Yooo qysh jeni! 🦅 Ku don me flutura shqipe?',
      help: 'Ej vlla, thuaj ku don me flutura dhe kur. Psh: "DUS PRN nesër" - qaq bre! 🦅',
      error: 'Ej sorry vlla, dicka shkoi gabim. Provo prap!'
    }
  }

  const style = gangStyles[language]
  const prefix = style.prefixes[Math.floor(Math.random() * style.prefixes.length)]
  const suffix = style.suffixes[Math.floor(Math.random() * style.suffixes.length)]

  if (messageType === 'results') {
    return style.results(prefix, suffix, text)
  }
  if (messageType === 'searching') {
    return style.searching
  }
  if (messageType === 'greeting') {
    return style.greeting
  }
  if (messageType === 'help') {
    return style.help
  }
  if (messageType === 'error') {
    return style.error
  }

  return `${prefix}${text}${suffix}`
}

function hasSignal(query: ParsedQuery): boolean {
  return !!(
    query.from
    || query.to
    || query.outboundDate
    || query.returnDate
    || query.maxPrice
    || query.month
    || query.passengers
  )
}

/**
 * Get effective response language
 * Priority: stored preferredLanguage > query preferredLanguage > detected language
 */
function getResponseLanguage(
  storedPreference: Language | null,
  query?: ParsedQuery
): Language {
  // First check stored preference
  if (storedPreference) {
    return storedPreference
  }
  // Then check if current query has a preference
  if (query?.preferredLanguage) {
    return query.preferredLanguage
  }
  // Fallback to detected language or default (Albanian for Kosovo market)
  return query?.language || DEFAULT_LANGUAGE
}

function startDelayedNotice(msg: Message, language: ParsedQuery['language']): () => void {
  const timeoutMs = config.conversation.processingNoticeDelayMs
  let cancelled = false
  const timer = setTimeout(() => {
    if (cancelled) return
    void msg.reply(formatProcessingMessage(language)).catch(() => {})
  }, timeoutMs)

  return () => {
    cancelled = true
    clearTimeout(timer)
  }
}

function isCompleteQuery(parsed: ParsedQuery): boolean {
  return !!(parsed.from && parsed.to && parsed.outboundDate)
}

function isNewSearchHeuristic(parsed: ParsedQuery, previous: ParsedQuery | null): boolean {
  if (!hasSignal(parsed)) return false

  // If the new message contains a complete query (from, to, date), it's a new search
  if (isCompleteQuery(parsed)) {
    return true
  }

  // If no previous context, can't determine if it's new
  if (!previous) return false

  // If previous was complete and user provides new airports or date, it's a new search
  if (isQueryComplete(previous)) {
    if (parsed.from || parsed.to || parsed.outboundDate) return true
  }

  // Route changed
  if (parsed.from && parsed.to) {
    if (previous.from && parsed.from !== previous.from) return true
    if (previous.to && parsed.to !== previous.to) return true
  }

  // Date changed significantly
  if (parsed.outboundDate && previous.outboundDate && parsed.outboundDate !== previous.outboundDate) {
    return true
  }

  return false
}

function mergeQueries(base: ParsedQuery, update: ParsedQuery): ParsedQuery {
  const type = (update.type === 'unknown' || update.type === 'help') ? base.type : update.type

  // Handle clarification: user says "als abflug" / "als ziel" to clarify previous city
  let from = update.from ?? base.from
  let to = update.to ?? base.to

  if (update.clarification === 'origin') {
    // User clarified that previous city should be origin
    // Move 'to' to 'from' if 'from' is not set
    if (!from && base.to) {
      from = base.to
      to = undefined
    }
  } else if (update.clarification === 'destination') {
    // User clarified that previous city should be destination
    // Move 'from' to 'to' if 'to' is not set
    if (!to && base.from) {
      to = base.from
      from = undefined
    }
  }

  const merged: ParsedQuery = {
    ...base,
    ...update,
    type,
    from,
    to,
    outboundDate: update.outboundDate ?? base.outboundDate,
    returnDate: update.returnDate ?? base.returnDate,
    maxPrice: update.maxPrice ?? base.maxPrice,
    month: update.month ?? base.month,
    passengers: update.passengers ?? base.passengers,
    language: update.type === 'unknown' ? base.language : (update.language || base.language),
    // Preserve preferredLanguage - new preference takes priority
    preferredLanguage: update.preferredLanguage ?? base.preferredLanguage,
    raw: update.raw
  }

  if (merged.returnDate && merged.type === 'search') {
    merged.type = 'roundtrip'
  }

  return merged
}

/**
 * Search flights via API
 */
async function searchFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
  passengers?: { adults: number, children: number, infants: number }
): Promise<any> {
  const response = await fetch(`${config.api.url}/api/flights/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      departureDate,
      returnDate,
      adults: passengers?.adults || 1,
      children: passengers?.children || 0,
      infants: passengers?.infants || 0
    })
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Flexible date price info from API
 */
interface DatePriceInfo {
  date: string
  minPrice: number | null
  flightCount: number
  currency: string
}

/**
 * Flexible search result from API
 */
interface FlexibleSearchResult {
  outbound: {
    dates: DatePriceInfo[]
    cheapestDate: string | null
  }
  return?: {
    dates: DatePriceInfo[]
    cheapestDate: string | null
  }
  meta: {
    origin: string
    destination: string
    centerDepartureDate: string
    centerReturnDate?: string
    dateRange: number
  }
}

/**
 * Search flights with flexible dates (±3 days) via API
 */
async function searchFlightsFlexible(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
  passengers?: { adults: number, children: number, infants: number },
  dateRange: number = 3
): Promise<FlexibleSearchResult> {
  const response = await fetch(`${config.api.url}/api/flights/flexible-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination,
      departureDate,
      returnDate,
      dateRange,
      adults: passengers?.adults || 1,
      children: passengers?.children || 0,
      infants: passengers?.infants || 0
    })
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Search result with optional flexible fallback data
 */
interface SearchResultWithFallback {
  results: any
  flexibleFallback?: FlexibleSearchResult
  usedFlexible: boolean
}

/**
 * Perform flight search with flexible date support and sold-out fallback
 *
 * - If query.flexible is true, use flexible search directly
 * - If regular search has no availability, automatically fetch flexible alternatives
 */
async function performFlightSearchWithFallback(
  query: ParsedQuery,
  phoneNumber: string
): Promise<SearchResultWithFallback> {
  const origin = query.from!
  const destination = query.to!
  const departureDate = query.outboundDate!

  // If user explicitly requested flexible dates, use flexible search directly
  if (query.flexible) {
    console.log(`[${phoneNumber}] Using flexible search (user requested)`)
    const flexResults = await searchFlightsFlexible(
      origin,
      destination,
      departureDate,
      query.returnDate,
      query.passengers
    )
    return {
      results: null,
      flexibleFallback: flexResults,
      usedFlexible: true
    }
  }

  // Regular search first
  const results = await searchFlights(
    origin,
    destination,
    departureDate,
    query.returnDate,
    query.passengers
  )

  const availStats = getAvailabilityStats(results)

  // If no availability (all sold out), try flexible search as fallback
  if (!availStats.hasAvailability && query.type !== 'roundtrip') {
    console.log(`[${phoneNumber}] No availability, fetching flexible alternatives`)
    try {
      const flexResults = await searchFlightsFlexible(
        origin,
        destination,
        departureDate,
        undefined, // Don't include return for fallback
        query.passengers
      )
      return {
        results,
        flexibleFallback: flexResults,
        usedFlexible: false
      }
    } catch (error) {
      console.error(`[${phoneNumber}] Flexible search fallback failed:`, error)
      // Return normal results without fallback
      return { results, usedFlexible: false }
    }
  }

  return { results, usedFlexible: false }
}

/**
 * Handle incoming message
 */
async function handleMessage(msg: Message): Promise<void> {
  // Ignore group messages
  if (msg.from.includes('@g.us')) {
    return
  }

  // Ignore status updates
  if (msg.from === 'status@broadcast') {
    return
  }

  // Handle both @c.us (old format) and @lid (new Linked ID format)
  // For @lid, we use the LID as identifier (phone number lookup won't work, but sessions work)
  let phoneNumber: string
  if (msg.from.endsWith('@lid')) {
    // LID format - use LID as unique identifier
    // Note: Cannot reverse lookup by phone number, but session tracking works
    phoneNumber = msg.from.replace('@lid', '')
    console.log(`[DEBUG] LID format: using "${phoneNumber}" as session ID`)
  } else if (msg.from.endsWith('@c.us')) {
    phoneNumber = msg.from.replace('@c.us', '')
  } else {
    // Unknown format - use as-is
    phoneNumber = msg.from
    console.log(`[DEBUG] Unknown format: "${msg.from}"`)
  }

  const text = msg.body.trim()

  // Ignore empty messages
  if (!text) {
    return
  }

  console.log(`[${new Date().toISOString()}] Message from ${phoneNumber}: ${text}`)

  // Track timing for response time measurement
  const startTime = Date.now()

  // Track incoming message (analytics)
  void trackMessageReceived(
    phoneNumber,
    crypto.randomUUID(), // whatsapp-web.js doesn't expose msg.id easily
    text,
    'unknown', // Will be updated after parsing
    0, // Processing time will be calculated at the end
    undefined // Language detected later
  )

  // Check rate limit (async - uses database)
  if (!(await checkRateLimit(phoneNumber))) {
    // Use stored preference if available, otherwise default
    const storedLang = (await getConversation(phoneNumber))?.preferredLanguage
    const rateLimitMsg = storedLang === 'en'
      ? 'Too many requests. Please wait a moment.'
      : storedLang === 'de'
        ? 'Zu viele Anfragen. Bitte warte einen Moment.'
        : 'Shumë kërkesa. Ju lutemi prisni një moment.'
    await sendAndLog(msg, phoneNumber, rateLimitMsg, 'rate_limit', storedLang || DEFAULT_LANGUAGE, startTime)
    return
  }

  // Clean up expired states
  const lowerText = text.toLowerCase().trim()
  cleanupPendingStates()

  // Check if user is selecting language (first contact flow)
  if (languageSelectionState.has(phoneNumber)) {
    const chosenLang = detectLanguageChoice(text)
    if (chosenLang) {
      languageSelectionState.delete(phoneNumber)
      await setPreferredLanguage(phoneNumber, chosenLang)
      await markUserAsKnown(phoneNumber)

      const welcomeMsg = formatFirstContactMessage(chosenLang)
      await sendAndLog(msg, phoneNumber, welcomeMsg, 'welcome', chosenLang, startTime)
      await updateConversation(phoneNumber, { type: 'help', language: chosenLang, raw: text }, text, welcomeMsg, chosenLang)
      return
    } else {
      // Invalid choice, remind them
      await sendAndLog(msg, phoneNumber, 'Bitte wähle 1, 2 oder 3 / Please choose 1, 2 or 3 / Zgjidhni 1, 2 ose 3', 'language_prompt', 'de', startTime)
      return
    }
  }

  // First contact - ask for language preference
  const isFirstContact = !(await isKnownUser(phoneNumber))
  if (isFirstContact && !languageSelectionState.has(phoneNumber)) {
    void logInboundMessage(phoneNumber, text, { type: 'help', language: 'de', raw: text })
    languageSelectionState.set(phoneNumber, Date.now())
    await sendAndLog(msg, phoneNumber, LANGUAGE_SELECTION_MESSAGE, 'language_prompt', 'de', startTime)
    return
  }

  // Easter egg: gang mode verification flow

  // Get user's preferred language for gang mode messages
  const userLangPref = (await getConversation(phoneNumber))?.preferredLanguage || DEFAULT_LANGUAGE

  // Check if user is in verification flow
  const verification = gangVerificationState.get(phoneNumber)
  if (verification) {
    if (verification.step === 'awaiting_source') {
      // Check if answer matches "er0"
      if (lowerText.includes(GANG_MODE_SOURCE_ANSWER)) {
        gangVerificationState.set(phoneNumber, { step: 'awaiting_name', timestamp: Date.now() })
        const response = await generateGangMessage('source_correct', undefined, userLangPref)
        await sendAndLog(msg, phoneNumber, response, 'easter_egg', userLangPref, startTime)
        return
      } else {
        // Wrong answer, cancel verification
        gangVerificationState.delete(phoneNumber)
        const response = await generateGangMessage('source_wrong', undefined, userLangPref)
        await sendAndLog(msg, phoneNumber, response, 'easter_egg', userLangPref, startTime)
        return
      }
    }
    if (verification.step === 'awaiting_name') {
      // User gave their name, activate gang mode
      const userName = text.trim()
      gangVerificationState.delete(phoneNumber)
      await setGangMode(phoneNumber, true)
      console.log(`[GangMode] Activated for ${phoneNumber}, name: ${userName}`)
      const response = await generateGangMessage('name_given', userName, userLangPref)
      await sendAndLog(msg, phoneNumber, response, 'easter_egg', userLangPref, startTime)
      return
    }
  }

  // Start verification when password is entered
  if (lowerText === GANG_MODE_PASSWORD) {
    gangVerificationState.set(phoneNumber, { step: 'awaiting_source', timestamp: Date.now() })
    const response = await generateGangMessage('password_entered', undefined, userLangPref)
    await sendAndLog(msg, phoneNumber, response, 'easter_egg', userLangPref, startTime)
    return
  }

  // Deactivate gang mode
  if (lowerText === GANG_MODE_DISABLE) {
    await setGangMode(phoneNumber, false)
    gangVerificationState.delete(phoneNumber)
    const response = await generateGangMessage('deactivate', undefined, userLangPref)
    await sendAndLog(msg, phoneNumber, response, 'easter_egg', userLangPref, startTime)
    return
  }

  // Check if gang mode is active
  const gangModeActive = await isGangMode(phoneNumber)

  let query: ParsedQuery | undefined
  let storedPreferredLang: ParsedQuery['language'] | null = null
  try {
    // Get stored language preference (persists even after conversation is cleared)
    storedPreferredLang = await getPreferredLanguage(phoneNumber)
    // Get conversation state from database
    const previous = await getConversation(phoneNumber)
    // Use stored preference first, then detect from text as fallback
    const languageHint = storedPreferredLang || previous?.query.language || DEFAULT_LANGUAGE
    const history = previous?.messages || []

    // Handle post-search phases using state machine
    const postSearchPhase = previous?.postSearchPhase as PostSearchPhase | undefined
    if (postSearchPhase) {
      // Build state machine context
      const stateCtx: StateContext = {
        text,
        language: languageHint,
        lastSearch: previous?.lastSearch || null,
        previousQuery: previous?.query || null,
        history
      }

      // Special handling for awaiting_return_date: parse date first
      if (postSearchPhase === PostSearchPhase.AwaitingReturnDate) {
        // Parse the date with minimal context
        const dateContext: Array<{ role: 'user' | 'assistant', content: string }> = [
          { role: 'assistant', content: 'Wann möchtest du zurückfliegen?' }
        ]
        const parsed = await parseMessage(text, dateContext)

        if (parsed.outboundDate) {
          // Create date_provided event and process through state machine
          const event: StateEvent = { type: 'date_provided', date: parsed.outboundDate }
          const result = processStateEvent(postSearchPhase, event, stateCtx)
          const { handled } = await executeStateAction(msg, phoneNumber, text, result, stateCtx, startTime, gangModeActive, postSearchPhase)
          if (handled) return
        } else {
          // Couldn't parse date - ask again
          const responseLang = previous?.preferredLanguage || languageHint
          const askAgainMsg = RETURN_DATE_MESSAGES[responseLang]
          await sendAndLog(msg, phoneNumber, askAgainMsg, 'return_date_question', responseLang, startTime, gangModeActive)
          return
        }
      } else {
        // For other phases, use state machine directly
        const { handled, continueToSearch } = await handlePostSearchPhase(
          msg, phoneNumber, text, postSearchPhase, stateCtx, startTime, gangModeActive
        )
        if (handled) return
        // If continueToSearch, fall through to search parsing below
      }
    }

    if (isResetCommand(text)) {
      await clearConversation(phoneNumber)
    }

    if (!previous && isGreeting(text)) {
      // Log inbound greeting
      void logInboundMessage(phoneNumber, text, { type: 'help', language: languageHint, raw: text })

      const firstContact = !(await isKnownUser(phoneNumber))
      await markUserAsKnown(phoneNumber)

      // Check for recent search to show proactive suggestion
      const lastSearch = await getLastSearch(phoneNumber, 7) // Max 7 days old

      let greetingMessage: string
      if (!firstContact && lastSearch) {
        // Returning user with recent search - show proactive suggestion
        greetingMessage = formatProactiveSuggestion(lastSearch, languageHint)
        await sendAndLog(msg, phoneNumber, greetingMessage, 'proactive_suggestion', languageHint, startTime, gangModeActive)
      } else {
        // First contact or no recent search - normal greeting
        greetingMessage = firstContact
          ? formatFirstContactMessage(languageHint)
          : formatGreetingMessage(languageHint)
        await sendAndLog(msg, phoneNumber, greetingMessage, 'greeting', languageHint, startTime, gangModeActive)
      }

      let fullResponse = greetingMessage
      if (firstContact && config.openai.apiKey) {
        try {
          const reply = await generateChatReply(text, history)
          if (reply) {
            await sendAndLog(msg, phoneNumber, reply, 'chat', languageHint, undefined, gangModeActive)
            fullResponse += '\n' + reply
          }
        } catch (error) {
          console.error(`[${phoneNumber}] Greeting follow-up error:`, error)
        }
      }
      // Save conversation so next message has history
      await updateConversation(phoneNumber, { type: 'help', language: languageHint, raw: text }, text, fullResponse)
      return
    }

    // Handle thank-you messages gracefully (without pushing for new search)
    if (!previous && isThankYou(text)) {
      void logInboundMessage(phoneNumber, text, { type: 'help', language: languageHint, raw: text })
      const thankYouMsg = THANK_YOU_MESSAGES[languageHint]
      await sendAndLog(msg, phoneNumber, thankYouMsg, 'goodbye', languageHint, startTime, gangModeActive)
      return
    }

    if (!previous && isExplicitHelpRequest(text)) {
      void logInboundMessage(phoneNumber, text, { type: 'help', language: languageHint, raw: text })
      const helpMsg = formatHelpMessage(languageHint)
      await sendAndLog(msg, phoneNumber, helpMsg, 'help', languageHint, startTime, gangModeActive)
      // Save conversation so next message has history
      await updateConversation(phoneNumber, { type: 'help', language: languageHint, raw: text }, text, helpMsg)
      return
    }

    if (!previous && !isExplicitHelpRequest(text) && !isFlightIntent(text)) {
      void logInboundMessage(phoneNumber, text, { type: 'unknown', language: languageHint, raw: text })

      if (config.openai.apiKey) {
        try {
          const reply = await generateChatReply(text, history)
          if (reply) {
            await sendAndLog(msg, phoneNumber, reply, 'chat', languageHint, startTime, gangModeActive)
            // Save conversation so next message has history
            await updateConversation(phoneNumber, { type: 'unknown', language: languageHint, raw: text }, text, reply)
            return
          }
        } catch (error) {
          console.error(`[${phoneNumber}] Chat reply error:`, error)
        }
      }

      const nudge = formatGreetingMessage(languageHint)
      await sendAndLog(msg, phoneNumber, nudge, 'greeting', languageHint, startTime, gangModeActive)
      // Save conversation so next message has history
      await updateConversation(phoneNumber, { type: 'unknown', language: languageHint, raw: text }, text, nudge)
      return
    }

    const stopNotice = startDelayedNotice(msg, languageHint)
    const onRetry = () => {}
    // Parse the message with conversation history
    let parsed: ParsedQuery
    try {
      parsed = await parseMessage(text, history, onRetry)
    } finally {
      stopNotice()
    }
    const intent = parsed.intent || 'unknown'
    const shouldStartNew = intent === 'new_search'
      || isResetCommand(text)
      || isNewSearchHeuristic(parsed, previous?.query || null)

    // Merge with previous if continuing conversation
    // Even without signal, preserve previous context unless explicitly starting new
    if (previous && !shouldStartNew) {
      query = mergeQueries(previous.query, parsed)
    } else {
      query = parsed
    }

    if (!query) {
      throw new Error('Parser returned empty query')
    }

    if (config.debug.logParsedQueries) {
      console.log(`[${phoneNumber}] Parsed query:`, JSON.stringify(query))
    }

    // Log inbound message with parsed query
    void logInboundMessage(phoneNumber, text, query)

    // Determine response language: stored preference > query preference > detected language
    const responseLang = getResponseLanguage(previous?.preferredLanguage ?? null, query)

    // Auto-save language preference if user writes in non-German language without stored preference
    if (!storedPreferredLang && query.language !== 'de') {
      await setPreferredLanguage(phoneNumber, query.language)
      storedPreferredLang = query.language
    }

    // Check if this is first contact before marking as known
    const firstContact = !(await isKnownUser(phoneNumber))
    await markUserAsKnown(phoneNumber)

    // Handle language change requests
    // Fallback: if preferredLanguage missing, use detected language
    if (query.type === 'language_change') {
      const newLang = query.preferredLanguage || query.language
      // Store the preference
      const confirmMsg = newLang === 'sq'
        ? 'Po flas tani shqip! Si mund t\'ju ndihmoj?'
        : newLang === 'en'
          ? 'I\'ll respond in English now! How can I help you?'
          : 'Ich antworte jetzt auf Deutsch! Wie kann ich helfen?'
      await sendAndLog(msg, phoneNumber, confirmMsg, 'language_change', newLang, startTime)
      await setPreferredLanguage(phoneNumber, newLang)
      await updateConversation(phoneNumber, query, text, confirmMsg, newLang)
      return
    }

    // Handle provider contact requests
    if (query.type === 'contact') {
      await clearConversation(phoneNumber)
      if (query.provider) {
        const contactInfo = formatProviderContact(query.provider, responseLang, phoneNumber)
        if (contactInfo) {
          // Track successful provider contact request
          void trackProviderContact(phoneNumber, query.provider, true, responseLang)
          await sendAndLog(msg, phoneNumber, contactInfo, 'contact', responseLang, startTime)
          await updateConversation(phoneNumber, query, text, contactInfo)
        } else {
          // Track failed provider contact request (provider not found)
          void trackProviderContact(phoneNumber, query.provider, false, responseLang)
          const errorMsg = responseLang === 'de'
            ? 'Anbieter nicht gefunden. Verfügbare Anbieter: AirPrishtina, KosovaFly, Dituria, EriFly'
            : responseLang === 'en'
              ? 'Provider not found. Available providers: AirPrishtina, KosovaFly, Dituria, EriFly'
              : 'Ofrues nuk u gjet. Ofruesit e disponueshëm: AirPrishtina, KosovaFly, Dituria, EriFly'
          await sendAndLog(msg, phoneNumber, errorMsg, 'error', responseLang, startTime)
          await updateConversation(phoneNumber, query, text, errorMsg)
        }
      } else {
        const listMsg = responseLang === 'de'
          ? 'Verfügbare Anbieter:\n• AirPrishtina\n• KosovaFly\n• Dituria\n• EriFly\n\nBeispiel: "Kontakt zu AirPrishtina"'
          : responseLang === 'en'
            ? 'Available providers:\n• AirPrishtina\n• KosovaFly\n• Dituria\n• EriFly\n\nExample: "Contact to AirPrishtina"'
            : 'Ofruesit e disponueshëm:\n• AirPrishtina\n• KosovaFly\n• Dituria\n• EriFly\n\nShembull: "Kontakt me AirPrishtina"'
        await sendAndLog(msg, phoneNumber, listMsg, 'contact', responseLang, startTime)
        await updateConversation(phoneNumber, query, text, listMsg)
      }
      return
    }

    // Handle help / unknown without signals: short dialog + guidance
    if ((query.type === 'help' || query.type === 'unknown') && !hasSignal(query)) {
      await clearConversation(phoneNumber)

      if (!isExplicitHelpRequest(text) && config.openai.apiKey) {
        try {
          const reply = await generateChatReply(text, history)
          if (reply) {
            await sendAndLog(msg, phoneNumber, reply, 'chat', responseLang, startTime, gangModeActive)
            await updateConversation(phoneNumber, query, text, reply)
            return
          }
        } catch (error) {
          console.error(`[${phoneNumber}] Chat reply error:`, error)
        }
      }

      if (isGreeting(text)) {
        const greetingMessage = firstContact
          ? formatFirstContactMessage(responseLang)
          : formatGreetingMessage(responseLang)
        await sendAndLog(msg, phoneNumber, greetingMessage, 'greeting', responseLang, startTime, gangModeActive)
        await updateConversation(phoneNumber, query, text, greetingMessage)
      } else {
        const helpMsg = formatHelpMessage(responseLang)
        await sendAndLog(msg, phoneNumber, helpMsg, 'help', responseLang, startTime, gangModeActive)
        await updateConversation(phoneNumber, query, text, helpMsg)
      }
      return
    }

    if (query.type === 'unknown' && hasSignal(query)) {
      query = { ...query, type: 'search' }
    }

    // Check if query is complete
    if (!isQueryComplete(query)) {
      const missing = getMissingFields(query)
      // Use responseLang for incomplete query messages
      const queryWithLang = { ...query, language: responseLang }
      const response = formatIncompleteQuery(queryWithLang, missing)
      await updateConversation(phoneNumber, query, text, response)
      await sendAndLog(msg, phoneNumber, response, 'incomplete', responseLang, startTime, gangModeActive)
      return
    }

    // Validate query for logical errors (EC-007, EC-011, EC-016)
    const validationErrors = validateQuery(query)
    if (validationErrors.length > 0) {
      // Send first validation error and ask for correction
      const error = validationErrors[0]
      const errorMsg = error.message[responseLang]
      await sendAndLog(msg, phoneNumber, errorMsg, 'validation_error', responseLang, startTime, gangModeActive)

      // Clear the problematic field so user can correct it
      if (error.code === 'invalid_date') {
        query.outboundDate = undefined
        query.returnDate = undefined
      } else if (error.code === 'same_origin_destination') {
        query.to = undefined // Clear destination, keep origin
      } else if (error.code === 'no_adult') {
        query.passengers = { adults: 1, children: query.passengers?.children || 0, infants: query.passengers?.infants || 0 }
      }

      await updateConversation(phoneNumber, query, text, errorMsg, responseLang)
      return
    }

    // Check if route is supported (either origin or destination must be Kosovo/Albania)
    if (!isRouteSupported(query.from, query.to)) {
      const unsupportedMsg = UNSUPPORTED_DESTINATION_MESSAGES[responseLang]
      await sendAndLog(msg, phoneNumber, unsupportedMsg, 'unsupported_destination', responseLang, startTime, gangModeActive)
      // Clear the route so user can provide a new one
      query.from = undefined
      query.to = undefined
      await updateConversation(phoneNumber, query, text, unsupportedMsg, responseLang)
      return
    }

    // Query is complete and valid
    const queryWithLang = { ...query, language: responseLang }

    // Skip confirmation if high confidence (>= 0.95) - direct search
    const skipConfirmation = (query.confidence ?? 0) >= 0.95

    if (skipConfirmation || query.flexible) {
      // High confidence or flexible search - search directly without asking for confirmation
      const searchingMsg = formatSearchingMessage(queryWithLang)
      await sendAndLog(msg, phoneNumber, searchingMsg, 'searching', responseLang, startTime, gangModeActive)

      void trackSearch(phoneNumber, query.from!, query.to!, query.outboundDate!, query.returnDate, query.passengers, responseLang)

      // Use flexible search with fallback
      const { results, flexibleFallback, usedFlexible } = await performFlightSearchWithFallback(queryWithLang, phoneNumber)

      let response: string
      let messageType: string
      let flightCount = 0
      let providerCount = 0

      // Handle flexible search results
      if (usedFlexible && flexibleFallback) {
        // User explicitly requested flexible dates - show flexible results
        response = formatFlexibleResults(flexibleFallback, queryWithLang, config.api.websiteUrl)
        messageType = flexibleFallback.outbound.cheapestDate ? 'flexible_results' : 'no_results'
        flightCount = flexibleFallback.outbound.dates.reduce((sum, d) => sum + d.flightCount, 0)
        console.log(`[${phoneNumber}] Flexible search: ${flightCount} flights across ${flexibleFallback.outbound.dates.length} dates`)
      } else if (results) {
        // Normal search (possibly with fallback)
        flightCount = (results.outboundFlights?.length || 0) + (results.returnFlights?.length || 0)
        providerCount = results.meta?.providers?.length || 0
        const availStats = getAvailabilityStats(results)

        if (query.type === 'roundtrip' && query.returnDate) {
          response = formatRoundtripResults(results, queryWithLang, config.api.websiteUrl, phoneNumber)
          messageType = results.outboundFlights.length > 0 ? 'results' : 'no_results'
        } else if (results.outboundFlights.length > 0 && availStats.hasAvailability) {
          response = formatOneWayResults(results, queryWithLang, config.api.websiteUrl, phoneNumber)
          messageType = 'results'
        } else if (flexibleFallback && flexibleFallback.outbound.cheapestDate) {
          // Sold out but we have flexible alternatives!
          response = formatSoldOutWithAlternatives(query.outboundDate!, flexibleFallback, queryWithLang)
          messageType = 'sold_out_with_alternatives'
          console.log(`[${phoneNumber}] Sold out, showing alternatives`)
        } else {
          response = formatNoResults(queryWithLang)
          messageType = 'no_results'
        }

        if (!availStats.hasAvailability && availStats.totalFlights > 0) {
          void trackRouteNoAvailability(phoneNumber, query.from!, query.to!, query.outboundDate!, {
            totalFlightsReturned: availStats.totalFlights,
            soldOutFlights: availStats.soldOutFlights,
            bookableFlights: availStats.bookableFlights
          }, responseLang)
        }
      } else {
        response = formatNoResults(queryWithLang)
        messageType = 'no_results'
      }

      await sendAndLog(msg, phoneNumber, response, messageType, responseLang, startTime, gangModeActive, flightCount, providerCount)
      console.log(`[${phoneNumber}] Direct search (high confidence): ${flightCount} flights`)

      // Save search results summary
      const cheapestPrice = results?.outboundFlights?.reduce((min: any, f: any) =>
        (f.price && (!min || f.price < min.price)) ? f : min, null)?.price
        || flexibleFallback?.outbound.dates.find(d => d.date === flexibleFallback.outbound.cheapestDate)?.minPrice

      const searchSummary: LastSearchSummary = {
        from: query.from!,
        to: query.to!,
        date: query.outboundDate!,
        returnDate: query.returnDate,
        flightCount: results?.outboundFlights?.length || flightCount,
        cheapestPrice,
        providers: results?.meta?.providers || [],
        searchedAt: Date.now()
      }
      await saveLastSearch(phoneNumber, searchSummary)
      console.log(`[${phoneNumber}] Saved lastSearch: ${searchSummary.from} → ${searchSummary.to}`)

      // Send follow-up if we showed results (normal or alternatives)
      const hasResults = messageType === 'results' || messageType === 'flexible_results' || messageType === 'sold_out_with_alternatives'
      if (hasResults) {
        await setPostSearchPhase(phoneNumber, 'awaiting_feedback')
        setTimeout(async () => {
          try {
            const followUpMsg = POST_SEARCH_MESSAGES.feedback[responseLang]
            await msg.reply(followUpMsg)
            void logOutboundMessage(phoneNumber, followUpMsg, 'follow_up', responseLang)
          } catch (error) {
            console.error(`[${phoneNumber}] Failed to send follow-up:`, error)
          }
        }, 3000)
      }
    } else {
      // Lower confidence - ask for confirmation first
      const confirmationMsg = formatConfirmationMessage(queryWithLang)
      await sendAndLog(msg, phoneNumber, confirmationMsg, 'confirmation', responseLang, startTime, gangModeActive)
      await updateConversation(phoneNumber, query, text, confirmationMsg, responseLang)
      await setPostSearchPhase(phoneNumber, 'awaiting_confirmation')
    }
  } catch (error) {
    console.error(`[${phoneNumber}] Error:`, error)
    const message = error instanceof Error ? error.message : String(error)
    const isConnectionIssue = /connection|timeout|enotfound|network|no response from chatgpt/i.test(message)
    const isMissingKey = /openai_api_key/i.test(message)
    // Use stored preference > query language > fallback to default
    const lang = storedPreferredLang || query?.language || DEFAULT_LANGUAGE

    if (isConnectionIssue) {
      const errorResponse = formatConnectionIssueMessage(lang, config.api.websiteUrl)
      await sendAndLog(msg, phoneNumber, errorResponse, 'error', lang, startTime)
      return
    }

    if (isMissingKey) {
      const errorResponse = formatErrorMessage(lang)
      await sendAndLog(msg, phoneNumber, errorResponse, 'error', lang, startTime)
      return
    }

    const errorResponse = formatErrorMessage(lang)
    await sendAndLog(msg, phoneNumber, errorResponse, 'error', lang, startTime)
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true

  console.log(`\n${signal} received. Shutting down gracefully...`)

  try {
    // Close WhatsApp client
    if (whatsappClient) {
      console.log('Closing WhatsApp client...')
      await whatsappClient.destroy()
    }

    // Close database connections
    console.log('Closing database connections...')
    closeDb()
    await closeStateManager()

    console.log('Shutdown complete.')
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Aviopika WhatsApp Bot...')

  // Validate configuration
  const configErrors = validateConfig()
  if (configErrors.length > 0) {
    console.error('Configuration errors:')
    configErrors.forEach(err => console.error(`  - ${err}`))
    process.exit(1)
  }

  // Log configuration
  logConfig()

  // Initialize state manager (database connection)
  await initStateManager()

  // Create WhatsApp client
  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: config.whatsapp.authDataPath
    }),
    puppeteer: {
      headless: config.whatsapp.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  })

  // QR Code event
  whatsappClient.on('qr', (qr: string) => {
    console.log('\n📱 Scan this QR code with WhatsApp:\n')
    qrcode.generate(qr, { small: true })
    console.log('\n')
  })

  // Ready event
  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp Bot is ready!')
    console.log('📲 Waiting for messages...')
    console.log('🤖 Parser:', config.openai.apiKey ? 'ChatGPT' : 'Not configured')
    console.log('')
  })

  // Authentication success
  whatsappClient.on('authenticated', () => {
    console.log('🔐 Authenticated successfully!')
  })

  // Authentication failure
  whatsappClient.on('auth_failure', (msg: string) => {
    console.error('❌ Authentication failed:', msg)
    process.exit(1)
  })

  // Disconnected
  whatsappClient.on('disconnected', (reason: string) => {
    console.log('📴 Disconnected:', reason)
    if (!isShuttingDown) {
      process.exit(0)
    }
  })

  // Message event
  whatsappClient.on('message', async (msg: Message) => {
    if (isShuttingDown) return
    try {
      await handleMessage(msg)
    } catch (error) {
      console.error('Error handling message:', error)
    }
  })

  // Register signal handlers for graceful shutdown
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Initialize client
  console.log('🔄 Initializing WhatsApp client...')
  await whatsappClient.initialize()
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
