/**
 * SSE client utility.
 *
 * The backend yields events of the form `data: {...}\n\n` where the JSON
 * payload is one of:
 *   - { type: "delta", content: "..." }
 *   - { type: "done",  result:  {...} }
 *   - { type: "error", message: "..." }
 *
 * This helper handles fetch-based SSE (i.e. ReadableStream over a POST), since
 * the browser's built-in `EventSource` only supports GET.
 */

export type StreamEvent =
  | { type: "delta"; content: string }
  | { type: "done"; result: unknown }
  | { type: "error"; message: string };

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: (result: unknown) => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
}

export async function streamGeneration(
  url: string,
  body: unknown,
  cb: StreamCallbacks,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: cb.signal,
    });
  } catch (err) {
    cb.onError(err instanceof Error ? err.message : "Network error");
    return;
  }

  if (!response.ok || !response.body) {
    let detail = `Request failed: ${response.status}`;
    try {
      const data = await response.json();
      if (data?.detail) detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      /* ignore */
    }
    cb.onError(detail);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE messages are separated by a blank line ("\n\n").
      let sepIndex: number;
      while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
        const rawMessage = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        for (const line of rawMessage.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;

          let event: StreamEvent;
          try {
            event = JSON.parse(payload) as StreamEvent;
          } catch {
            // Malformed SSE chunk — skip
            continue;
          }

          if (event.type === "delta") cb.onDelta(event.content);
          else if (event.type === "done") cb.onDone(event.result);
          else if (event.type === "error") cb.onError(event.message);
        }
      }
    }
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") return;
    cb.onError(err instanceof Error ? err.message : "Stream read error");
  }
}
