import { LLMStreamError } from './types.js';
import { streamAnthropic } from './providers/anthropic.js';
import { streamOpenAILike } from './providers/openai.js';

/**
 * Stream text chunks from an LLM provider as an async iterable.
 *
 * @param {import('./types.js').StreamOptions} options
 * @returns {AsyncGenerator<import('./types.js').StreamChunk, void, unknown>}
 *
 * @example
 * ```js
 * for await (const chunk of stream({
 *   provider: "openai",
 *   model: "gpt-4o-mini",
 *   messages: [{ role: "user", content: "Say hi" }],
 * })) {
 *   process.stdout.write(chunk.text);
 * }
 * ```
 */
export async function* stream(options) {
  switch (options.provider) {
    case 'openai':
    case 'openai-compatible':
      yield* streamOpenAILike(options);
      return;
    case 'anthropic':
      yield* streamAnthropic(options);
      return;
    default:
      throw new LLMStreamError(`Unsupported provider: ${options.provider}`);
  }
}

/**
 * Collect an entire stream into a single result object.
 *
 * @param {import('./types.js').StreamOptions} options
 * @returns {Promise<import('./types.js').StreamResult>}
 */
export async function collect(options) {
  /** @type {import('./types.js').StreamChunk[]} */
  const chunks = [];
  let text = '';
  /** @type {string | null | undefined} */
  let finishReason;

  for await (const chunk of stream(options)) {
    chunks.push(chunk);
    text += chunk.text;
    if (chunk.finishReason !== undefined) finishReason = chunk.finishReason;
  }

  return {
    text,
    chunks,
    ...(finishReason !== undefined ? { finishReason } : {}),
  };
}
