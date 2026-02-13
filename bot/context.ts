/**
 * Message Context
 *
 * Caches session and conversation data within a single message handling cycle
 * to reduce redundant database queries.
 */

import { getConversation, getSession, isKnownUser as checkIsKnownUser, getLastSearch as fetchLastSearch, isGangMode as checkGangMode } from './state'
import type { SessionData, LastSearchSummary, ConversationState } from './state'
import type { ParsedQuery } from './parsers/index'
import { DEFAULT_LANGUAGE } from './types'
import type { Language } from './types'

/**
 * Cached conversation data returned by getConversation
 */
interface CachedConversation {
  query: ParsedQuery
  messages: Array<{ role: 'user' | 'assistant', content: string }>
  preferredLanguage: Language | null
  postSearchPhase?: ConversationState['postSearchPhase']
  lastSearch?: LastSearchSummary | null
}

/**
 * MessageContext holds all session data for a single message handling cycle.
 * Data is fetched lazily on first access and cached for subsequent accesses.
 */
export class MessageContext {
  private phoneNumber: string

  // Cached values (null = not yet fetched, undefined = fetched but empty)
  private _session: SessionData | null | undefined = null
  private _conversation: CachedConversation | null | undefined = null
  private _isKnownUser: boolean | null = null
  private _lastSearch: LastSearchSummary | null | undefined = null
  private _gangMode: boolean | null = null

  // Track what has been fetched
  private conversationFetched = false
  private sessionFetched = false
  private knownUserFetched = false
  private lastSearchFetched = false
  private gangModeFetched = false

  constructor(phoneNumber: string) {
    this.phoneNumber = phoneNumber
  }

  /**
   * Get the phone number
   */
  getPhoneNumber(): string {
    return this.phoneNumber
  }

  /**
   * Get the full session data (lazy loaded)
   */
  async getSession(): Promise<SessionData | null> {
    if (!this.sessionFetched) {
      this._session = await getSession(this.phoneNumber)
      this.sessionFetched = true
    }
    return this._session ?? null
  }

  /**
   * Get conversation state (lazy loaded)
   * Includes: query, messages, preferredLanguage, postSearchPhase, lastSearch
   */
  async getConversation(): Promise<CachedConversation | null> {
    if (!this.conversationFetched) {
      this._conversation = await getConversation(this.phoneNumber)
      this.conversationFetched = true
    }
    return this._conversation ?? null
  }

  /**
   * Get preferred language (from conversation or default)
   */
  async getPreferredLanguage(): Promise<Language> {
    const conversation = await this.getConversation()
    return conversation?.preferredLanguage || DEFAULT_LANGUAGE
  }

  /**
   * Get the language hint for parsing/responses
   * Priority: stored preference > query language > default
   */
  async getLanguageHint(): Promise<Language> {
    const conversation = await this.getConversation()
    return conversation?.preferredLanguage || conversation?.query?.language || DEFAULT_LANGUAGE
  }

  /**
   * Get conversation history (messages array)
   */
  async getHistory(): Promise<Array<{ role: 'user' | 'assistant', content: string }>> {
    const conversation = await this.getConversation()
    return conversation?.messages || []
  }

  /**
   * Get previous query from conversation
   */
  async getPreviousQuery(): Promise<ParsedQuery | null> {
    const conversation = await this.getConversation()
    return conversation?.query || null
  }

  /**
   * Get post-search phase
   */
  async getPostSearchPhase(): Promise<ConversationState['postSearchPhase'] | null> {
    const conversation = await this.getConversation()
    return conversation?.postSearchPhase ?? null
  }

  /**
   * Check if user is known (has interacted before)
   */
  async isKnownUser(): Promise<boolean> {
    if (!this.knownUserFetched) {
      this._isKnownUser = await checkIsKnownUser(this.phoneNumber)
      this.knownUserFetched = true
    }
    return this._isKnownUser ?? false
  }

  /**
   * Get last search summary (for proactive suggestions)
   */
  async getLastSearch(maxAgeDays: number = 7): Promise<LastSearchSummary | null> {
    // First check if conversation has lastSearch (already fetched)
    const conversation = await this.getConversation()
    if (conversation?.lastSearch) {
      // Check if within maxAgeDays
      const ageMs = Date.now() - conversation.lastSearch.searchedAt
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000
      if (ageMs <= maxAgeMs) {
        return conversation.lastSearch
      }
      return null
    }

    // Fallback to dedicated fetch
    if (!this.lastSearchFetched) {
      this._lastSearch = await fetchLastSearch(this.phoneNumber, maxAgeDays)
      this.lastSearchFetched = true
    }
    return this._lastSearch ?? null
  }

  /**
   * Check if gang mode is active
   */
  async isGangMode(): Promise<boolean> {
    if (!this.gangModeFetched) {
      this._gangMode = await checkGangMode(this.phoneNumber)
      this.gangModeFetched = true
    }
    return this._gangMode ?? false
  }

  /**
   * Invalidate cached conversation (after updates)
   * Call this after updateConversation, clearConversation, etc.
   */
  invalidateConversation(): void {
    this.conversationFetched = false
    this._conversation = null
    this.lastSearchFetched = false
    this._lastSearch = null
  }

  /**
   * Invalidate all cached data
   */
  invalidateAll(): void {
    this.sessionFetched = false
    this._session = null
    this.conversationFetched = false
    this._conversation = null
    this.knownUserFetched = false
    this._isKnownUser = null
    this.lastSearchFetched = false
    this._lastSearch = null
    this.gangModeFetched = false
    this._gangMode = null
  }
}

/**
 * Create a new MessageContext for a phone number
 */
export function createMessageContext(phoneNumber: string): MessageContext {
  return new MessageContext(phoneNumber)
}
