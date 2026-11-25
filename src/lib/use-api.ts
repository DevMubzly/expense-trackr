"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { convexClient } from "@/components/convex-provider";
import { api as convexApi } from "../../convex/_generated/api";

function parse(url: string) {
  const parsed = new URL(url, "http://local");
  const segments = parsed.pathname.replace(/^\/api\//, "").split("/").filter(Boolean);
  return {
    endpoint: segments[0] ?? "",
    path: segments.join("/"),
    id: segments[1] && segments[1] !== "activity" && segments[2] !== "contributions" && segments[2] !== "payments" && segments[2] !== "skip" && segments[2] !== "run" ? segments[1] : undefined,
    params: Object.fromEntries(parsed.searchParams.entries()),
  };
}

export function useApi<T>(url: string | null) {
  const parsed = useMemo(() => (url ? parse(url) : null), [url]);
  const data = useQuery(
    convexApi.app.read,
    parsed ? { endpoint: parsed.endpoint, params: parsed.params } : "skip",
  ) as T | null | undefined;

  return {
    data: data ?? null,
    error: null,
    loading: data === undefined,
    refresh: () => undefined,
    setData: () => undefined,
  };
}

async function write<T>(url: string, method: string, body?: unknown): Promise<T> {
  if (!convexClient) throw new Error("Convex is not configured.");
  const parsed = parse(url);
  return convexClient.mutation(convexApi.app.write, {
    endpoint: parsed.endpoint,
    method,
    id: parsed.id,
    body: body ?? undefined,
  }) as Promise<T>;
}

export const api = {
  post: <T>(url: string, body: unknown) => write<T>(url, "POST", body),
  patch: <T>(url: string, body: unknown) => write<T>(url, "PATCH", body),
  delete: <T>(url: string) => write<T>(url, "DELETE"),
};
