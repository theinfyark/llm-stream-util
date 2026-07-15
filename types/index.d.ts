export type Role = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: Role;
  content: string;
  toolCallId?: string;
  name?: string;
}

export interface StreamChunk {
  text: string;
  finishReason?: string | null;
  raw?: unknown;
}

export interface StreamUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface StreamResult {
  text: string;
  finishReason?: string | null;
  usage?: StreamUsage;
  chunks: StreamChunk[];
}

export interface BaseStreamOptions {
  model: string;
  messages: ChatMessage[];
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  fetch?: typeof fetch;
  headers?: Record<string, string>;
}

export interface OpenAIStreamOptions extends BaseStreamOptions {
  provider: "openai";
  baseUrl?: string;
}

export interface AnthropicStreamOptions extends BaseStreamOptions {
  provider: "anthropic";
  baseUrl?: string;
  anthropicVersion?: string;
}

export interface CompatibleStreamOptions extends BaseStreamOptions {
  provider: "openai-compatible";
  baseUrl: string;
}

export type StreamOptions =
  | OpenAIStreamOptions
  | AnthropicStreamOptions
  | CompatibleStreamOptions;

export interface LLMStreamErrorOptions {
  status?: number;
  body?: string;
  cause?: unknown;
}

export declare class LLMStreamError extends Error {
  name: "LLMStreamError";
  status?: number;
  body?: string;
  constructor(message: string, options?: LLMStreamErrorOptions);
}

export function stream(
  options: StreamOptions,
): AsyncGenerator<StreamChunk, void, unknown>;

export function collect(options: StreamOptions): Promise<StreamResult>;

export function parseSSE(
  body: ReadableStream<Uint8Array> | null,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown>;
