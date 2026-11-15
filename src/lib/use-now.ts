"use client";

import { useEffect, useState } from "react";

/**
 * `new Date()` during render is an unstable value under Next's Cache
 * Components. Read the clock after mount instead.
 */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  // Deliberately post-hydration: reading the clock during render is what Next's
  // Cache Components rejects. One set on mount is the whole cost.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setNow(new Date()), []);
  return now;
}
