// invokeWithRetry behavior tests — retries on fallback payloads and
// isEmpty predicates, respects attempt caps, never rejects.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { invokeWithRetry } from "@/lib/gee";

const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (...a: unknown[]) => mockInvoke(...(a as [])),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function settle() {
  // Flush all pending microtasks + timers
  return vi.advanceTimersByTimeAsync(60_000);
}

describe("invokeWithRetry", () => {
  it("returns data immediately when the first call succeeds", async () => {
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    const p = invokeWithRetry("fn", {});
    const result = await p;
    expect(result).toEqual({ ok: true });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("retries when payload is a fallback, then succeeds", async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { fallback: true, error: "RATE_LIMITED" }, error: null })
      .mockResolvedValueOnce({ data: { ok: true }, error: null });
    const p = invokeWithRetry("fn", {});
    await settle();
    const result = await p;
    expect(result).toEqual({ ok: true });
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("retries when isEmpty predicate fails", async () => {
    mockInvoke
      .mockResolvedValueOnce({ data: { empty: true }, error: null })
      .mockResolvedValueOnce({ data: { empty: true }, error: null })
      .mockResolvedValueOnce({ data: { full: true }, error: null });
    const p = invokeWithRetry("fn", {}, { retries: 3, isEmpty: (d) => (d as { empty?: boolean })?.empty === true });
    await settle();
    const result = await p;
    expect(result).toEqual({ full: true });
    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });

  it("returns the last (fallback) data after retries are exhausted", async () => {
    const fallback = { fallback: true, error: "SERVICE_UNAVAILABLE", message: "busy" };
    mockInvoke.mockResolvedValue({ data: fallback, error: null });
    const p = invokeWithRetry("fn", {}, { retries: 2, baseDelayMs: 1 });
    await settle();
    const result = await p;
    expect(result).toEqual(fallback);
    expect(mockInvoke).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("survives network errors and retries", async () => {
    mockInvoke
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ data: { ok: 1 }, error: null });
    const p = invokeWithRetry("fn", {}, { baseDelayMs: 1 });
    await settle();
    const result = await p;
    expect(result).toEqual({ ok: 1 });
  });
});
