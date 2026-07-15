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

## Introduction

**llm-stream-util** helps you ship reliable Node.js / TypeScript applications with a small, focused API.

## Why this package exists

Popular stacks need small, trustworthy utilities with excellent DX. **llm-stream-util** exists to solve one problem well: clear APIs, strong typing, minimal dependencies, and production-ready defaults — without the overhead of larger frameworks.

## Installation

```bash
npm install llm-stream-util
# or
pnpm add llm-stream-util
yarn add llm-stream-util
```

Requires Node.js 18+.

## API Reference

See the exports from `llm-stream-util` and the inline TypeScript types for the full surface area. Primary entry points are documented in **Quick Start** and **Examples** above.

## Examples

Minimal usage is shown in **Quick Start**. Prefer copying those snippets first, then expand into your app’s error handling and configuration patterns.

## Advanced Examples

- Combine with environment validation, logging, and health checks in production services
- Prefer dependency injection / custom `fetch` / client injection in tests
- Keep configuration explicit; avoid hidden global state

## Framework Integration

Works with Express, Fastify, Hono, NestJS, and plain Node HTTP servers. Import ESM (or CJS where published) and call the documented APIs from route handlers, middleware, or background jobs.

## TypeScript Usage

```ts
import { /* symbols */ } from "llm-stream-util";
```

Types ship with the package (`types` / `exports.types`). Enable `strict` in your `tsconfig` for the best DX.

## Error Handling

- Fail fast with typed / named errors where provided
- Never swallow errors silently in production paths
- Prefer returning structured error payloads in HTTP layers
- Surface actionable messages (what failed + how to fix)

## Performance

- Minimal runtime work on the hot path
- Avoid unnecessary allocations and dependencies
- Tree-shakeable ESM entry points
- Prefer streaming / lazy work when dealing with large payloads

## Best Practices

- Pin major versions with SemVer ranges you trust
- Validate configuration at process startup
- Add health checks and observability around I/O
- Write tests for failure modes (timeouts, bad input, missing credentials)

## FAQ

**Does it work with ESM and CommonJS?**  
Yes where the package publishes dual exports. Prefer ESM for new projects.

**Is it production-ready?**  
Yes — tests, types, and SemVer releases are part of the maintenance model.

**How do I report a bug?**  
Open a GitHub issue using the bug template.

## Migration Guide

### From 0.x / early drafts
This package follows SemVer. Breaking changes land in major releases and are called out in `CHANGELOG.md`.

### Upgrading patch/minor
Patch and minor releases are backward compatible. Run your test suite after upgrading.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `ERR_MODULE_NOT_FOUND` | Wrong Node version / bad import path | Use Node 18+ and package `exports` |
| Types not resolving | Old moduleResolution | Use `bundler` or `node16`+ |
| Auth / network failures | Missing env or blocked egress | Check credentials and firewall |
| Unexpected runtime errors | Invalid input | Validate options; read error message |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). PRs with tests and docs are welcome.

