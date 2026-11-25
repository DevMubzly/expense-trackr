"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/motion/input";
import { Icon } from "@/components/huge-icon";
import { Tick02Icon } from "@hugeicons/core-free-icons";
import { gooeyToast } from "goey-toast";

type AuthRequestView = {
  clientName: string;
  redirectUri: string;
  status: string;
  kind?: "device" | string;
  userCode?: string;
  scopes: { name: string; description: string }[];
};

export default function ConnectPage() {
  return (
    <Suspense fallback={<ConnectFallback />}>
      <ConnectContent />
    </Suspense>
  );
}

function ConnectFallback() {
  return (
    <div className="dark flex min-h-dvh items-center justify-center bg-[oklch(0.165_0.008_285)] text-sm text-white/50">
      Loading connection…
    </div>
  );
}

function ConnectContent() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const authorize = useAction(api.mcp.authorize);
  const requestId = useSearchParams().get("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [matches, setMatches] = useState(false);
  const [done, setDone] = useState(false);

  const request = useQuery(
    api.mcp.getAuthRequest,
    requestId ? { requestId } : "skip",
  ) as AuthRequestView | null | undefined;

  async function sendCode() {
    if (!email.trim() || pending) return;
    setPending(true);
    setError(undefined);
    try {
      const form = new FormData();
      form.set("email", email.trim());
      await signIn("email-otp", form);
      setStep("code");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not send the code.",
      );
    } finally {
      setPending(false);
    }
  }

  async function verifyCode() {
    if (!code.trim() || pending) return;
    setPending(true);
    setError(undefined);
    try {
      const form = new FormData();
      form.set("email", email.trim());
      form.set("code", code.trim());
      await signIn("email-otp", form);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "That code did not work.",
      );
    } finally {
      setPending(false);
    }
  }

  async function decide(approve: boolean) {
    if (!requestId || !request) return;
    if (request.kind === "device" && approve && !matches) return;
    setPending(true);
    setError(undefined);
    try {
      const result = (await authorize({
        requestId,
        approve,
        ...(request.kind === "device" && request.userCode
          ? { userCode: request.userCode }
          : {}),
      })) as { redirectUrl?: string | null };
      if (result?.redirectUrl) {
        gooeyToast.success(approve ? "Access approved" : "Request declined");
        window.location.assign(result.redirectUrl);
        return;
      }
      gooeyToast.success(approve ? "Access approved" : "Request declined");
      setDone(true);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not complete the request.";
      setError(message);
      gooeyToast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="dark flex min-h-dvh items-center justify-center bg-[oklch(0.165_0.008_285)] px-4 py-10 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-foreground/10 bg-white/[0.035] p-6 shadow-2xl sm:p-8">
        <p
          style={{ fontFamily: "var(--font-syncopate), system-ui, sans-serif" }}
          className="font-syncopate text-[11px] tracking-[0.08em] text-white/60"
        >
          EXPENSE TRACKR
        </p>
        <h1 className="mt-5 font-display text-2xl leading-tight tracking-[-0.03em] text-white">
          Connect an agent
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-white/55">
          Approve an AI agent to use your Expense Trackr data through MCP.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-[12px] leading-relaxed text-destructive">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <p className="mt-6 text-sm text-white/50">Checking your session…</p>
        ) : !isAuthenticated ? (
          <div className="mt-6 space-y-4">
            {step === "email" ? (
              <div className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  autoComplete="email"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void sendCode();
                  }}
                />
                <Button
                  className="w-full"
                  onClick={() => void sendCode()}
                  loading={pending}
                  disabled={!email.trim() || pending}
                >
                  Send code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[12px] leading-relaxed text-white/55">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-white">{email.trim()}</span>.
                  In development, the code is printed in the Convex logs.
                </p>
                <Input
                  label="Code"
                  value={code}
                  onChange={(value) =>
                    setCode(value.replace(/[^0-9]/g, "").slice(0, 8))
                  }
                  placeholder="6-digit code"
                  inputMode="numeric"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void verifyCode();
                  }}
                />
                <Button
                  className="w-full"
                  onClick={() => void verifyCode()}
                  loading={pending}
                  disabled={code.length < 4 || pending}
                >
                  <Icon icon={Tick02Icon} className="size-4" />
                  Verify and continue
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                  className="text-[11px] text-white/50 hover:text-white"
                >
                  Use a different email
                </button>
              </div>
            )}
          </div>
        ) : done ? (
          <div className="mt-6 rounded-xl bg-emerald-500/10 p-4 text-sm leading-relaxed text-emerald-300">
            Done. Return to your agent — it can now use the connection.
          </div>
        ) : !requestId ? (
          <p className="mt-6 text-sm leading-relaxed text-white/55">
            Open the connection link provided by your agent. It should include a
            <code className="mx-1 rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-white">
              ?request=…
            </code>
            parameter.
          </p>
        ) : !request ? (
          <p className="mt-6 text-sm text-white/50">Loading request…</p>
        ) : request.status !== "pending" ? (
          <div className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-white/60">
            This request is already {request.status}.
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div className="rounded-xl bg-white/5 p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                Requested by
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                {request.clientName}
              </p>
              <p className="mt-1 break-all text-[11px] text-white/40">
                {request.redirectUri}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                Permissions
              </p>
              <ul className="mt-2 space-y-2">
                {request.scopes.map((scope) => (
                  <li key={scope.name} className="flex gap-2.5 text-[12px]">
                    <Icon
                      icon={Tick02Icon}
                      className="mt-0.5 size-3.5 shrink-0 text-emerald-400"
                    />
                    <span>
                      <span className="font-medium text-white/85">
                        {scope.name}
                      </span>
                      <span className="block text-white/45">
                        {scope.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {request.kind === "device" && request.userCode ? (
              <div className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-amber-400/70">
                  Device code
                </p>
                <p className="font-display text-2xl tracking-[0.14em] text-white">
                  {request.userCode}
                </p>
                <label className="flex cursor-pointer items-start gap-2 text-[12px] leading-relaxed text-white/60">
                  <input
                    type="checkbox"
                    checked={matches}
                    onChange={(event) => setMatches(event.target.checked)}
                    className="mt-0.5 size-4 accent-emerald-400"
                  />
                  This matches the code shown in my agent.
                </label>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  gooeyToast.success("Signed out", {
                    description: "See you soon.",
                  });
                  void signOut();
                }}
                disabled={pending}
              >
                Sign out
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => void decide(false)}
                  disabled={pending}
                >
                  Deny
                </Button>
                <Button
                  onClick={() => void decide(true)}
                  loading={pending}
                  disabled={
                    pending ||
                    (request.kind === "device" && Boolean(request.userCode) && !matches)
                  }
                >
                  <Icon icon={Tick02Icon} className="size-4" />
                  Allow
                </Button>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-[10px] text-white/25">
          Only approve agents you trust.
        </p>
      </div>
    </div>
  );
}
