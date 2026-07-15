import { LLMStreamError } from '../types.js';
import { parseSSE } from '../parse-sse.js';

/**
 * @param {import('../types.js').OpenAIStreamOptions | import('../types.js').CompatibleStreamOptions} options
 */
function resolveApiKey(options) {
  if (options.apiKey) return options.apiKey;
  return process.env.OPENAI_API_KEY;
}

/**
 * @param {import('../types.js').OpenAIStreamOptions | import('../types.js').CompatibleStreamOptions} options
 */
function resolveBaseUrl(options) {
  if (options.provider === 'openai-compatible') return options.baseUrl;
  return options.baseUrl ?? 'https://api.openai.com/v1';
}

/**
 * @param {import('../types.js').OpenAIStreamOptions | import('../types.js').CompatibleStreamOptions} options
 * @returns {AsyncGenerator<import('../types.js').StreamChunk, void, unknown>}
 */
export async function* streamOpenAILike(options) {
  const {
    model,
    messages,
    temperature,
    maxTokens,
    signal,
    headers = {},
  } = options;

  const fetchFn = options.fetch ?? globalThis.fetch;
  if (!fetchFn) {
    throw new LLMStreamError(
      'No fetch implementation available in this environment.',
    );
  }

  const apiKey = resolveApiKey(options);
  if (!apiKey && options.provider === 'openai') {
    throw new LLMStreamError(
      'Missing OpenAI API key. Pass apiKey or set OPENAI_API_KEY.',
    );
  }

  /** @type {Record<string, unknown>} */
  const body = {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.name ? { name: m.name } : {}),
      ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
    })),
    stream: true,
  };
  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== undefined) body.max_tokens = maxTokens;

  /** @type {Record<string, string>} */
  const requestHeaders = {
    'content-type': 'application/json',
    accept: 'text/event-stream',
    ...headers,
  };
  if (apiKey) requestHeaders.authorization = `Bearer ${apiKey}`;

  const response = await fetchFn(
    `${resolveBaseUrl(options).replace(/\/$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(body),
      signal,
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new LLMStreamError(
      `${options.provider === 'openai' ? 'OpenAI' : 'OpenAI-compatible'} request failed with ${response.status}`,
      { status: response.status, body: text },
    );
  }

  for await (const data of parseSSE(response.body, signal)) {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }

    const choice = parsed.choices?.[0];
    if (!choice) continue;

    const text = choice.delta?.content ?? '';
    const finishReason = choice.finish_reason ?? undefined;

    if (text || finishReason !== undefined) {
      yield {
        text,
        ...(finishReason !== undefined ? { finishReason } : {}),
        raw: parsed,
      };
    }
  }
}
