"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
export const convexClient = url ? new ConvexReactClient(url) : null;
const client = convexClient;

export function ConvexProvider({ children }: { children: ReactNode }) {
  if (!client) return <ConvexSetup />;
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}

function ConvexSetup() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
      <div className="w-full max-w-md">
        <p className="font-syncopate text-[11px] tracking-[0.16em] text-muted-foreground">
          Expense Trackr
        </p>
        <h1 className="mt-4 font-display text-2xl leading-tight tracking-[-0.03em]">
          Connect the backend
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This app runs on Convex. Create a deployment once, then restart the
          dev server. It writes the URL into your environment automatically.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs">
          bunx convex dev
        </pre>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          Sign in with your Convex account when the browser opens. Once it is
          running, this screen is replaced by the app.
        </p>
      </div>
    </div>
  );
}
