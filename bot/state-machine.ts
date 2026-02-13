/**
 * Post-Search State Machine
 *
 * Handles conversation flow after flight search results are shown.
 * Implements explicit state transitions for better maintainability.
 */

import { PostSearchPhase } from './types'
import type { Language } from './types'
import type { LastSearchSummary } from './state'
import type { ParsedQuery } from './parsers/index'
import {
  isSimpleYes,
  isSimpleNo,
  looksLikeSearch,
  wantsReverseSearch,
  isReturnFlightRequest
} from './helpers'

/**
 * Events that can trigger state transitions
 */
export type StateEvent
  = | { type: 'positive' } // User confirmed/agreed
    | { type: 'negative' } // User declined/wants new search
    | { type: 'rental_request' } // User asks about rental car
    | { type: 'return_flight' } // User asks for return flight
    | { type: 'reverse_search' } // User wants to reverse route
    | { type: 'new_search' } // User starts a new search
    | { type: 'date_provided', date: string } // User provided a date
    | { type: 'unclear' } // Intent couldn't be determined

/**
 * Actions returned by state handlers
 */
export type StateAction
  = | { action: 'ask_rental' } // Ask about rental car
    | { action: 'show_rental_info' } // Show rental car info
    | { action: 'show_goodbye' } // Show goodbye message
    | { action: 'prompt_new_search' } // Prompt for new search
    | { action: 'ask_return_date' } // Ask for return flight date
    | { action: 'execute_search', query: ParsedQuery } // Execute a search
    | { action: 'execute_reverse_search', from: string, to: string, date: string, returnDate?: string }
    | { action: 'execute_return_search', from: string, to: string, date: string }
    | { action: 'chat_reply' } // Generate chat reply
    | { action: 're_ask' } // Re-ask the current question
    | { action: 'continue_parsing' } // Continue to normal parsing
    | { action: 'none' } // No action needed

/**
 * Result of processing a state event
 */
export interface StateResult {
  action: StateAction
  nextPhase: PostSearchPhase | null // null = clear phase
}

/**
 * Context needed for state machine decisions
 */
export interface StateContext {
  text: string
  language: Language
  lastSearch: LastSearchSummary | null
  previousQuery: ParsedQuery | null
  history: Array<{ role: 'user' | 'assistant', content: string }>
}

/**
 * State handler function type
 */
type StateHandler = (
  event: StateEvent,
  ctx: StateContext
) => StateResult

/**
 * State machine configuration
 * Maps each state to its handler function
 */
const stateHandlers: Record<PostSearchPhase, StateHandler> = {
  [PostSearchPhase.AwaitingFeedback]: handleAwaitingFeedback,
  [PostSearchPhase.AwaitingRental]: handleAwaitingRental,
  [PostSearchPhase.AwaitingReturnDate]: handleAwaitingReturnDate,
  [PostSearchPhase.AwaitingConfirmation]: handleAwaitingConfirmation
}

/**
 * Handle awaiting_feedback state
 * User was asked if they found a suitable flight
 */
function handleAwaitingFeedback(event: StateEvent, ctx: StateContext): StateResult {
  switch (event.type) {
    case 'positive':
      // User found their flight - ask about rental car
      return {
        action: { action: 'ask_rental' },
        nextPhase: PostSearchPhase.AwaitingRental
      }

    case 'negative':
      // User wants new search
      return {
        action: { action: 'prompt_new_search' },
        nextPhase: null
      }

    case 'rental_request':
      // User directly asks for rental car
      return {
        action: { action: 'show_rental_info' },
        nextPhase: null
      }

    case 'return_flight':
      // User asks for return flight
      return {
        action: { action: 'ask_return_date' },
        nextPhase: PostSearchPhase.AwaitingReturnDate
      }

    case 'reverse_search':
      // User wants to reverse route (e.g., DUS→PRN becomes PRN→DUS)
      if (ctx.lastSearch) {
        return {
          action: {
            action: 'execute_reverse_search',
            from: ctx.lastSearch.to,
            to: ctx.lastSearch.from,
            date: ctx.lastSearch.date,
            returnDate: ctx.lastSearch.returnDate
          },
          nextPhase: PostSearchPhase.AwaitingFeedback
        }
      }
      // No last search - prompt for new search
      return {
        action: { action: 'prompt_new_search' },
        nextPhase: null
      }

    case 'new_search':
      // User starts a new search - let normal parsing handle it
      return {
        action: { action: 'continue_parsing' },
        nextPhase: null
      }

    case 'unclear':
      // Intent unclear - try chat reply, stay in current state
      return {
        action: { action: 'chat_reply' },
        nextPhase: PostSearchPhase.AwaitingFeedback
      }

    default:
      return {
        action: { action: 're_ask' },
        nextPhase: PostSearchPhase.AwaitingFeedback
      }
  }
}

/**
 * Handle awaiting_rental state
 * User was asked if they need a rental car
 */
function handleAwaitingRental(event: StateEvent, ctx: StateContext): StateResult {
  switch (event.type) {
    case 'positive':
      // User wants rental car info
      return {
        action: { action: 'show_rental_info' },
        nextPhase: null
      }

    case 'negative':
      // User doesn't need rental car
      return {
        action: { action: 'show_goodbye' },
        nextPhase: null
      }

    case 'new_search':
      // User starts a new search
      return {
        action: { action: 'continue_parsing' },
        nextPhase: null
      }

    case 'unclear':
      // Intent unclear - try chat reply, stay in current state
      return {
        action: { action: 'chat_reply' },
        nextPhase: PostSearchPhase.AwaitingRental
      }

    default:
      return {
        action: { action: 're_ask' },
        nextPhase: PostSearchPhase.AwaitingRental
      }
  }
}

/**
 * Handle awaiting_return_date state
 * User was asked when they want to fly back
 */
function handleAwaitingReturnDate(event: StateEvent, ctx: StateContext): StateResult {
  switch (event.type) {
    case 'date_provided':
      // User provided a return date - execute return search
      if (ctx.previousQuery?.to && ctx.previousQuery?.from) {
        return {
          action: {
            action: 'execute_return_search',
            from: ctx.previousQuery.to, // Swap: original destination becomes origin
            to: ctx.previousQuery.from, // Swap: original origin becomes destination
            date: event.date
          },
          nextPhase: PostSearchPhase.AwaitingFeedback
        }
      }
      // No previous query - ask again
      return {
        action: { action: 're_ask' },
        nextPhase: PostSearchPhase.AwaitingReturnDate
      }

    case 'new_search':
      // User starts a new search
      return {
        action: { action: 'continue_parsing' },
        nextPhase: null
      }

    case 'unclear':
      // Couldn't parse date - ask again
      return {
        action: { action: 're_ask' },
        nextPhase: PostSearchPhase.AwaitingReturnDate
      }

    default:
      return {
        action: { action: 're_ask' },
        nextPhase: PostSearchPhase.AwaitingReturnDate
      }
  }
}

/**
 * Handle awaiting_confirmation state
 * User was asked to confirm search parameters
 */
function handleAwaitingConfirmation(event: StateEvent, ctx: StateContext): StateResult {
  switch (event.type) {
    case 'positive':
      // User confirmed - execute the search
      if (ctx.previousQuery) {
        return {
          action: { action: 'execute_search', query: ctx.previousQuery },
          nextPhase: null // Will transition to awaiting_feedback after search
        }
      }
      return {
        action: { action: 'prompt_new_search' },
        nextPhase: null
      }

    case 'negative':
    case 'unclear':
      // User wants to correct - continue to normal parsing
      return {
        action: { action: 'continue_parsing' },
        nextPhase: null
      }

    case 'new_search':
      // User starts a new search
      return {
        action: { action: 'continue_parsing' },
        nextPhase: null
      }

    default:
      return {
        action: { action: 'continue_parsing' },
        nextPhase: null
      }
  }
}

/**
 * Detect event from user input text
 * Uses regex helpers first, then falls back to GPT intent detection
 */
export function detectEventFromText(
  text: string,
  phase: PostSearchPhase,
  gptIntent?: 'positive' | 'negative' | 'unclear' | 'rental_request'
): StateEvent {
  // Check for new search indicators first (applies to all states)
  if (looksLikeSearch(text)) {
    return { type: 'new_search' }
  }

  // Phase-specific checks
  if (phase === PostSearchPhase.AwaitingFeedback) {
    // Check for reverse search intent
    if (wantsReverseSearch(text)) {
      return { type: 'reverse_search' }
    }

    // Check for return flight request
    if (isReturnFlightRequest(text)) {
      return { type: 'return_flight' }
    }
  }

  // Simple yes/no regex check (fast path)
  if (isSimpleYes(text)) {
    return { type: 'positive' }
  }

  if (isSimpleNo(text)) {
    return { type: 'negative' }
  }

  // Use GPT intent if provided
  if (gptIntent) {
    if (gptIntent === 'rental_request') {
      return { type: 'rental_request' }
    }
    return { type: gptIntent }
  }

  return { type: 'unclear' }
}

/**
 * Process a state event and return the result
 *
 * @param phase - Current post-search phase
 * @param event - Event to process
 * @param ctx - Context for decision making
 * @returns StateResult with action and next phase
 */
export function processStateEvent(
  phase: PostSearchPhase,
  event: StateEvent,
  ctx: StateContext
): StateResult {
  const handler = stateHandlers[phase]
  if (!handler) {
    // Unknown state - clear and continue parsing
    return {
      action: { action: 'continue_parsing' },
      nextPhase: null
    }
  }

  return handler(event, ctx)
}

/**
 * Get the re-ask message key for a given phase
 */
export function getReAskMessageKey(phase: PostSearchPhase): 'feedback' | 'foundFlight' | 'returnDate' | null {
  switch (phase) {
    case PostSearchPhase.AwaitingFeedback:
      return 'feedback'
    case PostSearchPhase.AwaitingRental:
      return 'foundFlight'
    case PostSearchPhase.AwaitingReturnDate:
      return 'returnDate'
    case PostSearchPhase.AwaitingConfirmation:
      return null // Confirmation uses different flow
  }
}
