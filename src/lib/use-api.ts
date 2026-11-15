"use client";

import { useCallback, useEffect, useRef, useState } from "react";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
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
    if (!url) return;
    let active = true;
    request<T>(url)
      .then((body) => {
        if (!active || !mounted.current) return;
        setData(body);
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
  }, [url, nonce]);

  const refresh = useCallback(() => {
    setLoading(true);
    setNonce((value) => value + 1);
  }, []);

  return { data, error, loading, refresh, setData };
}

export const api = {
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
