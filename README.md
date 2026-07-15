# llm-stream-util

Tiny zero-dependency helpers to **stream LLM responses** from OpenAI, Anthropic, and any OpenAI-compatible API (Groq, Together, Ollama, Azure, etc.).

```bash
npm install llm-stream-util
```

## Quick start

```js
import { stream, collect } from 'llm-stream-util';

// Stream tokens as they arrive
for await (const chunk of stream({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Write a haiku about Node.js' }],
})) {
  process.stdout.write(chunk.text);
}

// Or wait for the full reply
const result = await collect({
  provider: 'anthropic',
  model: 'claude-3-5-haiku-latest',
  messages: [{ role: 'user', content: 'Explain SSE in one sentence' }],
});

console.log(result.text);
```

Set credentials via env vars (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) or pass `apiKey` in options.

## Providers

### OpenAI

```js
await collect({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Hello' }],
  // apiKey: "...", // or OPENAI_API_KEY
  // baseUrl: "https://api.openai.com/v1",
});
```

### Anthropic

```js
await collect({
  provider: 'anthropic',
  model: 'claude-3-5-haiku-latest',
  messages: [
    { role: 'system', content: 'You are concise.' },
    { role: 'user', content: 'Hello' },
  ],
  // apiKey: "...", // or ANTHROPIC_API_KEY
});
```

### OpenAI-compatible (Groq, Ollama, etc.)

```js
await collect({
  provider: 'openai-compatible',
  baseUrl: 'https://api.groq.com/openai/v1',
  model: 'llama-3.1-8b-instant',
  apiKey: process.env.GROQ_API_KEY,
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## API

### `stream(options)` → `AsyncGenerator<StreamChunk>`

Yields `{ text, finishReason?, raw? }` chunks.

### `collect(options)` → `Promise<StreamResult>`

Returns `{ text, finishReason?, chunks }`.

### Shared options

| Option        | Type                                             | Description                            |
| ------------- | ------------------------------------------------ | -------------------------------------- |
| `provider`    | `'openai' \| 'anthropic' \| 'openai-compatible'` | Required                               |
| `model`       | `string`                                         | Model id                               |
| `messages`    | `{ role, content }[]`                            | Chat messages                          |
| `apiKey`      | `string`                                         | Overrides env key                      |
| `temperature` | `number`                                         | Sampling temperature                   |
| `maxTokens`   | `number`                                         | Max tokens (Anthropic default: `1024`) |
| `signal`      | `AbortSignal`                                    | Cancel the request                     |
| `fetch`       | `typeof fetch`                                   | Custom fetch (tests / polyfills)       |
| `headers`     | `object`                                         | Extra HTTP headers                     |
| `baseUrl`     | `string`                                         | Override API base URL                  |

### Errors

Failed HTTP responses throw `LLMStreamError` with optional `status` and `body`.

```js
import { collect, LLMStreamError } from 'llm-stream-util';

try {
  await collect({
    /* ... */
  });
} catch (err) {
  if (err instanceof LLMStreamError) {
    console.error(err.status, err.body);
  }
}
```

## Abort mid-stream

```js
const controller = new AbortController();

const promise = collect({
  provider: 'openai',
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: 'Write a long essay' }],
  signal: controller.signal,
});

setTimeout(() => controller.abort(), 500);
```

## Requirements

- Node.js 18+ (global `fetch`)
- Zero runtime dependencies

## License

MIT
