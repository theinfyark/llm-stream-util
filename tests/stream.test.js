import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSSE } from '../src/parse-sse.js';
import { stream, collect, LLMStreamError } from '../src/index.js';

/**
 * @param {string} text
 * @returns {ReadableStream<Uint8Array>}
 */
function sseBody(text) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

/**
 * @param {Array<{ ok?: boolean, status?: number, body: string, errorText?: string }>} responses
 */
function mockFetch(responses) {
  let i = 0;
  /** @type {typeof fetch} */
  return async () => {
    const next = responses[i++];
    if (!next) throw new Error('Unexpected fetch call');
    if (next.ok === false) {
      return new Response(next.errorText ?? 'error', {
        status: next.status ?? 500,
      });
    }
    return new Response(sseBody(next.body), {
      status: next.status ?? 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  };
}

describe('parseSSE', () => {
  it('yields data frames and stops on [DONE]', async () => {
    const body = sseBody(
      [
        'data: {"a":1}',
        '',
        'data: hello',
        '',
        'data: [DONE]',
        '',
        'data: {"ignored":true}',
        '',
      ].join('\n'),
    );

    const frames = [];
    for await (const frame of parseSSE(body)) frames.push(frame);
    assert.deepEqual(frames, ['{"a":1}', 'hello']);
  });

  it('joins multi-line data fields', async () => {
    const body = sseBody(['data: line1', 'data: line2', '', ''].join('\n'));
    const frames = [];
    for await (const frame of parseSSE(body)) frames.push(frame);
    assert.deepEqual(frames, ['line1\nline2']);
  });
});

describe('stream / collect (openai)', () => {
  it('streams OpenAI-style deltas', async () => {
    const fetch = mockFetch([
      {
        body: [
          'data: {"choices":[{"delta":{"content":"Hel"}}]}',
          '',
          'data: {"choices":[{"delta":{"content":"lo"},"finish_reason":"stop"}]}',
          '',
          'data: [DONE]',
          '',
        ].join('\n'),
      },
    ]);

    const chunks = [];
    for await (const chunk of stream({
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: 'test-key',
      messages: [{ role: 'user', content: 'hi' }],
      fetch,
    })) {
      chunks.push(chunk);
    }

    assert.equal(chunks.map((c) => c.text).join(''), 'Hello');
    assert.equal(chunks.at(-1)?.finishReason, 'stop');
  });

  it('collect returns full text', async () => {
    const fetch = mockFetch([
      {
        body: [
          'data: {"choices":[{"delta":{"content":"A"}}]}',
          '',
          'data: {"choices":[{"delta":{"content":"B"},"finish_reason":"stop"}]}',
          '',
          'data: [DONE]',
          '',
        ].join('\n'),
      },
    ]);

    const result = await collect({
      provider: 'openai-compatible',
      baseUrl: 'https://example.com/v1',
      model: 'local',
      messages: [{ role: 'user', content: 'hi' }],
      fetch,
    });

    assert.equal(result.text, 'AB');
    assert.equal(result.finishReason, 'stop');
    assert.equal(result.chunks.length, 2);
  });

  it('throws LLMStreamError on non-OK responses', async () => {
    const fetch = mockFetch([{ ok: false, status: 401, errorText: 'nope' }]);

    await assert.rejects(
      () =>
        collect({
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: 'bad',
          messages: [{ role: 'user', content: 'hi' }],
          fetch,
        }),
      (err) => {
        assert.ok(err instanceof LLMStreamError);
        assert.equal(err.status, 401);
        assert.equal(err.body, 'nope');
        return true;
      },
    );
  });

  it('requires an OpenAI API key', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      await assert.rejects(
        () =>
          collect({
            provider: 'openai',
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'hi' }],
            fetch: async () => new Response(''),
          }),
        (err) =>
          err instanceof LLMStreamError && /OPENAI_API_KEY/.test(err.message),
      );
    } finally {
      if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
    }
  });
});

describe('stream (anthropic)', () => {
  it('streams Anthropic content_block_delta events', async () => {
    const fetch = mockFetch([
      {
        body: [
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}',
          '',
          'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}',
          '',
        ].join('\n'),
      },
    ]);

    const result = await collect({
      provider: 'anthropic',
      model: 'claude-3-5-haiku-latest',
      apiKey: 'test-key',
      messages: [
        { role: 'system', content: 'Be brief' },
        { role: 'user', content: 'hello' },
      ],
      fetch,
    });

    assert.equal(result.text, 'Hi');
    assert.equal(result.finishReason, 'end_turn');
  });
});
