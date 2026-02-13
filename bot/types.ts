/**
 * Bot Type Definitions
 *
 * Centralized type definitions and enums for the bot
 */

/**
 * Post-search conversation phases
 * Used to track what the bot is waiting for after showing search results
 */
export enum PostSearchPhase {
  /** Waiting for user to confirm their search parameters before searching */
  AwaitingConfirmation = 'awaiting_confirmation',
  /** Waiting for user feedback on search results (found/not found) */
  AwaitingFeedback = 'awaiting_feedback',
  /** Waiting for user response about rental car interest */
  AwaitingRental = 'awaiting_rental',
  /** Waiting for user to provide return flight date */
  AwaitingReturnDate = 'awaiting_return_date'
}

/**
 * Message types for logging and analytics
 */
export enum MessageType {
  // User input types
  Text = 'text',
  Search = 'search',
  Greeting = 'greeting',
  Help = 'help',
  Unknown = 'unknown',
  LanguageChange = 'language_change',
  Contact = 'contact',
  FeedbackResponse = 'feedback_response',
  RentalResponse = 'rental_response',
  Confirmation = 'confirmation',

  // Bot response types
  Results = 'results',
  FlexibleResults = 'flexible_results',
  NoResults = 'no_results',
  SoldOutWithAlternatives = 'sold_out_with_alternatives',
  Searching = 'searching',
  Incomplete = 'incomplete',
  Error = 'error',
  RateLimit = 'rate_limit',
  ValidationError = 'validation_error',
  UnsupportedDestination = 'unsupported_destination',

  // Conversation flow
  Welcome = 'welcome',
  LanguagePrompt = 'language_prompt',
  FollowUp = 'follow_up',
  RentalQuestion = 'rental_question',
  RentalInfo = 'rental_info',
  ReturnDateQuestion = 'return_date_question',
  NewSearchPrompt = 'new_search_prompt',
  Goodbye = 'goodbye',
  Chat = 'chat',

  // Special types
  ProactiveSuggestion = 'proactive_suggestion',
  EasterEgg = 'easter_egg'
}

/**
 * Supported languages
 */
export type Language = 'de' | 'en' | 'sq'

/**
 * Default language for new users (Albanian for Kosovo market)
 */
export const DEFAULT_LANGUAGE: Language = 'sq'

/**
 * Supported destination airport codes (Kosovo & Albania)
 */
export const SUPPORTED_DESTINATIONS = ['PRN', 'TIA'] as const

/**
 * Check if route is supported (either origin or destination must be Kosovo/Albania)
 */
export function isRouteSupported(from: string | undefined, to: string | undefined): boolean {
  if (!from && !to) return true // No route yet, don't block
  const fromSupported = from ? SUPPORTED_DESTINATIONS.includes(from.toUpperCase() as typeof SUPPORTED_DESTINATIONS[number]) : false
  const toSupported = to ? SUPPORTED_DESTINATIONS.includes(to.toUpperCase() as typeof SUPPORTED_DESTINATIONS[number]) : false
  return fromSupported || toSupported
}
