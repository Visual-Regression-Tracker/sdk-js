import http from "http";
import { setTimeout as delay } from "timers/promises";

export const CONNECT_TIMEOUT_SECONDS = 10;
export const DEFAULT_HTTP_TIMEOUT_SECONDS = 360;
export const MAX_503_RETRIES = 3;
const MAX_RETRY_AFTER_MS = 60_000;

export const withConnectTimeout = <T extends http.Agent>(
  agent: T,
  seconds: number
): T => {
  const createConnection = agent.createConnection;
  agent.createConnection = function (...args) {
    const socket = createConnection.apply(this, args);
    if (!socket) {
      return socket;
    }
    const timer = setTimeout(
      () =>
        socket.destroy(new Error(`Connection timed out after ${seconds} s`)),
      seconds * 1000
    );
    const clear = () => clearTimeout(timer);
    socket.once("connect", clear);
    socket.once("close", clear);
    return socket;
  };
  return agent;
};

export const retryAfterMs = (
  value: string | undefined,
  now = Date.now()
): number | undefined => {
  const text = value?.trim();
  if (!text) {
    return undefined;
  }
  let ms: number;
  if (/^\d+$/.test(text)) {
    ms = Number(text) * 1000;
  } else if (/ GMT$/.test(text)) {
    ms = Date.parse(text) - now;
  } else {
    return undefined;
  }
  if (Number.isNaN(ms)) {
    return undefined;
  }
  return Math.min(Math.max(ms, 0), MAX_RETRY_AFTER_MS);
};

const retryDelayOn503 = (error: unknown): number | undefined => {
  const response = (
    error as { response?: { status?: number; headers?: Record<string, any> } }
  )?.response;
  return response?.status === 503
    ? retryAfterMs(response.headers?.["retry-after"])
    : undefined;
};

export const sendWithRetry = async <T>(
  send: () => Promise<T>,
  sleep: (ms: number) => Promise<unknown> = delay
): Promise<T> => {
  for (let retry = 1; ; retry++) {
    try {
      return await send();
    } catch (error) {
      const wait = retryDelayOn503(error);
      if (wait === undefined || retry > MAX_503_RETRIES) {
        throw error;
      }
      console.warn(
        `VRT: server busy (503), retrying in ${wait / 1000} s (${retry}/${MAX_503_RETRIES})`
      );
      await sleep(wait);
    }
  }
};
