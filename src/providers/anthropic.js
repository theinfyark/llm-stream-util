import { LLMStreamError } from '../types.js';
import { parseSSE } from '../parse-sse.js';

/**
 * @param {import('../types.js').ChatMessage[]} messages
 */
function splitSystem(messages) {
  const systemParts = [];
  /** @type {Array<{ role: 'user' | 'assistant', content: string }>} */
  const rest = [];

  for (const message of messages) {
    if (message.role === 'system') {
      systemParts.push(message.content);
      continue;
    }
    if (message.role === 'user' || message.role === 'assistant') {
      rest.push({ role: message.role, content: message.content });
    }
  }

  return {
    system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
    messages: rest,
  };
}

/**
 * @param {string} [apiKey]
 */
function resolveApiKey(apiKey) {
  const key = apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new LLMStreamError(
      'Missing Anthropic API key. Pass apiKey or set ANTHROPIC_API_KEY.',
    );
  }
  return key;
}

/**
 * @param {import('../types.js').AnthropicStreamOptions} options
 * @returns {AsyncGenerator<import('../types.js').StreamChunk, void, unknown>}
 */
export async function* streamAnthropic(options) {
  const {
    model,
    messages,
    temperature,
    maxTokens = 1024,
    signal,
    headers = {},
    baseUrl = 'https://api.anthropic.com',
    anthropicVersion = '2023-06-01',
  } = options;

  const fetchFn = options.fetch ?? globalThis.fetch;
  if (!fetchFn) {
    throw new LLMStreamError(
      'No fetch implementation available in this environment.',
    );
  }

  const apiKey = resolveApiKey(options.apiKey);
  const { system, messages: anthropicMessages } = splitSystem(messages);

  /** @type {Record<string, unknown>} */
  const body = {
    model,
    max_tokens: maxTokens,
    stream: true,
    messages: anthropicMessages,
  };
  if (system !== undefined) body.system = system;
  if (temperature !== undefined) body.temperature = temperature;

  const response = await fetchFn(`${baseUrl.replace(/\/$/, '')}/v1/messages`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': anthropicVersion,
      accept: 'text/event-stream',
      ...headers,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new LLMStreamError(
      `Anthropic request failed with ${response.status}`,
      {
        status: response.status,
        body: text,
      },
    );
  }

  for await (const data of parseSSE(response.body, signal)) {
    let event;
    try {
      event = JSON.parse(data);
    } catch {
      continue;
    }

    if (event.type === 'content_block_delta') {
      const text =
        event.delta?.type === 'text_delta' ? (event.delta.text ?? '') : '';
      if (text) yield { text, raw: event };
      continue;
    }

    if (event.type === 'message_delta') {
      const finishReason = event.delta?.stop_reason ?? null;
      yield { text: '', finishReason, raw: event };
    }
  }
}
