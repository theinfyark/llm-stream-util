/**
 * @typedef {'system' | 'user' | 'assistant' | 'tool'} Role
 */

/**
 * @typedef {object} ChatMessage
 * @property {Role} role
 * @property {string} content
 * @property {string} [toolCallId]
 * @property {string} [name]
 */

/**
 * @typedef {object} StreamChunk
 * @property {string} text
 * @property {string | null} [finishReason]
 * @property {unknown} [raw]
 */

/**
 * @typedef {object} StreamUsage
 * @property {number} [promptTokens]
 * @property {number} [completionTokens]
 * @property {number} [totalTokens]
 */

/**
 * @typedef {object} StreamResult
 * @property {string} text
 * @property {string | null} [finishReason]
 * @property {StreamUsage} [usage]
 * @property {StreamChunk[]} chunks
 */

/**
 * @typedef {object} BaseStreamOptions
 * @property {string} model
 * @property {ChatMessage[]} messages
 * @property {string} [apiKey]
 * @property {number} [temperature]
 * @property {number} [maxTokens]
 * @property {AbortSignal} [signal]
 * @property {typeof fetch} [fetch]
 * @property {Record<string, string>} [headers]
 */

/**
 * @typedef {BaseStreamOptions & {
 *   provider: 'openai',
 *   baseUrl?: string
 * }} OpenAIStreamOptions
 */

/**
 * @typedef {BaseStreamOptions & {
 *   provider: 'anthropic',
 *   baseUrl?: string,
 *   anthropicVersion?: string
 * }} AnthropicStreamOptions
 */

/**
 * @typedef {BaseStreamOptions & {
 *   provider: 'openai-compatible',
 *   baseUrl: string
 * }} CompatibleStreamOptions
 */

/**
 * @typedef {OpenAIStreamOptions | AnthropicStreamOptions | CompatibleStreamOptions} StreamOptions
 */

export class LLMStreamError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, body?: string, cause?: unknown }} [options]
   */
  constructor(message, options = {}) {
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined,
    );
    this.name = 'LLMStreamError';
    /** @type {number | undefined} */
    this.status = options.status;
    /** @type {string | undefined} */
    this.body = options.body;
  }
}
