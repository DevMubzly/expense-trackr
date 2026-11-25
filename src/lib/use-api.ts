"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { convexClient } from "@/components/convex-provider";
import { api as convexApi } from "../../convex/_generated/api";

const READ_ENDPOINTS = new Set([
  "settings",
  "categories",
  "accounts",
  "transactions",
  "budgets",
  "goals",
  "debts",
  "recurring",
  "income-sources",
  "networth",
  "overview",
  "stats",
  "plan/activity",
]);

const WRITE_ENDPOINTS = new Set([
  "settings",
  "accounts",
  "categories",
  "budgets",
  "goals",
  "debts",
  "recurring",
  "income-sources",
]);

function parse(url: string) {
  const parsed = new URL(url, "http://local");
  const path = parsed.pathname.replace(/^\/api\//, "");
  const segments = path.split("/").filter(Boolean);
  return {
    endpoint: segments[0] ?? "",
    path: segments.join("/"),
    id: segments[1] && segments[1] !== "activity" ? segments[1] : undefined,
    params: Object.fromEntries(parsed.searchParams.entries()),
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Request failed (${response.status})`,
    );
  }
  return response.json() as Promise<T>;
}

export function useApi<T>(url: string | null) {
  const parsed = useMemo(() => (url ? parse(url) : null), [url]);
  const supported = Boolean(parsed && READ_ENDPOINTS.has(parsed.endpoint));

  const convexData = useQuery(
    convexApi.app.read,
    supported && parsed
      ? { endpoint: parsed.endpoint, params: parsed.params }
      : "skip",
  ) as T | null | undefined;

  const [fallback, setFallback] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!url || supported) return;
    let active = true;
    request<T>(url)
      .then((body) => {
        if (!active || !mounted.current) return;
        setFallback(body);
        setError(null);
      })
      .catch((cause: Error) => {
        if (!active || !mounted.current) return;
        setError(cause.message);
      })
      .finally(() => {
        if (active && mounted.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url, nonce, supported]);

  const refresh = useCallback(() => {
    if (!supported) setLoading(true);
    setNonce((value) => value + 1);
  }, [supported]);

  return {
    data: supported ? (convexData ?? null) : fallback,
    error,
    loading: supported ? convexData === undefined : loading,
    refresh,
    setData: supported
      ? () => undefined
      : (next: T | null) => setFallback(next),
  };
}

async function write<T>(url: string, method: string, body?: unknown): Promise<T> {
  const parsed = parse(url);
  if (convexClient && WRITE_ENDPOINTS.has(parsed.endpoint)) {
    return convexClient.mutation(convexApi.app.write, {
      endpoint: parsed.endpoint,
      method,
      id: parsed.id,
      body: body ?? undefined,
    }) as Promise<T>;
  }
  return request<T>(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const api = {
  post: <T>(url: string, body: unknown) => write<T>(url, "POST", body),
  patch: <T>(url: string, body: unknown) => write<T>(url, "PATCH", body),
  delete: <T>(url: string) => write<T>(url, "DELETE"),
};
