"use client";

import { useCallback, useRef, useState } from "react";
import { streamGeneration } from "./stream";

export type StreamState = "idle" | "streaming" | "done" | "error";

export interface UseStreamGenerationResult<T> {
  state: StreamState;
  streamedText: string;
  result: T | null;
  error: string | null;
  generate: (url: string, body: unknown) => Promise<void>;
  reset: () => void;
  abort: () => void;
}

export function useStreamGeneration<T = unknown>(): UseStreamGenerationResult<T> {
  const [state, setState] = useState<StreamState>("idle");
  const [streamedText, setStreamedText] = useState("");
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState("idle");
    setStreamedText("");
    setResult(null);
    setError(null);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const generate = useCallback(async (url: string, body: unknown) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setState("streaming");
    setStreamedText("");
    setResult(null);
    setError(null);

    await streamGeneration(url, body, {
      signal: ctrl.signal,
      onDelta: (delta) => setStreamedText((prev) => prev + delta),
      onDone: (res) => {
        setResult(res as T);
        setState("done");
      },
      onError: (msg) => {
        setError(msg);
        setState("error");
      },
    });
  }, []);

  return { state, streamedText, result, error, generate, reset, abort };
}
