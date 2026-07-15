/**
 * Async iterator over Server-Sent Events (SSE) frames from a fetch Response body.
 *
 * @param {ReadableStream<Uint8Array> | null} body
 * @param {AbortSignal} [signal]
 * @returns {AsyncGenerator<string, void, unknown>}
 */
export async function* parseSSE(body, signal) {
  if (!body) return;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        const dataLines = [];
        for (const line of part.split(/\r?\n/)) {
          if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        if (dataLines.length === 0) continue;
        const data = dataLines.join('\n');
        if (data === '[DONE]') return;
        yield data;
      }
    }

    if (buffer.trim()) {
      const dataLines = [];
      for (const line of buffer.split(/\r?\n/)) {
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      if (dataLines.length > 0) {
        const data = dataLines.join('\n');
        if (data !== '[DONE]') yield data;
      }
    }
  } finally {
    reader.releaseLock();
  }
}
