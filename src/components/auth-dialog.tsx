"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { useAuthActions } from "@convex-dev/auth/react";
import { gooeyToast } from "goey-toast";
import { Input } from "@/components/motion/input";
import { Icon } from "@/components/huge-icon";
import { Button } from "@/components/ui/button";
import { EASE_OUT } from "@/lib/ease";
import { friendlyError } from "@/lib/friendly-error";

type Mode = "signin" | "signup" | "reset" | "reset-verify";

const UNDERLINE_FIELD = {
  field:
    "h-10 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent data-[state=focused]:ring-0",
  input: "text-[13px] placeholder:text-muted-foreground/50",
};


export function AuthDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.12 }}
            className="dark relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-foreground/10 bg-card p-1 pb-5 text-foreground shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon icon={Cancel01Icon} className="size-4" />
            </button>

            <AuthBody onDone={onClose} titleId={titleId} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AuthBody({ onDone, titleId }: { onDone: () => void; titleId: string }) {
  const { signIn, signOut } = useAuthActions();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  function finish(message = "Welcome back") {
    gooeyToast.success(message, {
      description: "Opening your workspace.",
    });
    onDone();
    router.push("/dashboard");
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(undefined);
    setPassword("");
    setConfirm("");
    setCode("");
  }

  async function run(task: () => Promise<unknown>) {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      await task();
    } catch (cause) {
      const message = friendlyError(cause);
      setError(message);
      gooeyToast.error(message);
    } finally {
      setPending(false);
    }
  }

  function submit() {
    if (mode === "signin") {
      if (!email.trim() || !password) {
        setError("Enter your email and password.");
        return;
      }
      void run(async () => {
        await signIn("password", { email: email.trim(), password, flow: "signIn" });
        finish();
      });
      return;
    }

    if (mode === "signup") {
      if (!email.trim()) {
        setError("Enter your email.");
        return;
      }
      if (password.length < 8) {
        setError("Use at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        setError("Passwords do not match.");
        return;
      }
      void run(async () => {
        await signIn("password", {
          email: email.trim(),
          password,
          flow: "signUp",
        });
        await signOut();
        gooeyToast.success("Account created", {
          description: "Sign in with your new password to continue.",
        });
        switchMode("signin");
      });
      return;
    }

    if (mode === "reset") {
      if (!email.trim()) {
        setError("Enter your email.");
        return;
      }
      void run(async () => {
        await signIn("password", { email: email.trim(), flow: "reset" });
        switchMode("reset-verify");
      });
      return;
    }

    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    void run(async () => {
      await signIn("password", {
        email: email.trim(),
        code,
        newPassword: password,
        flow: "reset-verification",
      });
      finish("Password updated");
    });
  }

  const title =
    mode === "signin"
      ? "Welcome back"
      : mode === "signup"
        ? "Create your account"
        : mode === "reset"
          ? "Reset your password"
          : "Choose a new password";

  const subtitle =
    mode === "signin"
      ? "Sign in to pick up where you left off."
      : mode === "signup"
        ? "One account, every page."
        : mode === "reset"
          ? "Enter your email and we will generate a reset code."
          : `Enter the code for ${email.trim()} and a new password.`;

  const cta =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
        ? "Create account"
        : mode === "reset"
          ? "Send reset code"
          : "Reset password";

  return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: EASE_OUT }}
        >
          <div className="rounded-xl border border-foreground/10 bg-muted/15 p-3.5 px-4 pr-9">
            <h3 id={titleId} className="font-display text-xl leading-tight tracking-[-0.03em]">
              {title}
            </h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>

          <div className="mt-1 space-y-3 rounded-xl border border-foreground/10 bg-muted/15 p-3.5 px-4">
            <div className="space-y-3">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              disabled={mode === "reset-verify"}
              classNames={UNDERLINE_FIELD}
            />

            {mode === "reset-verify" ? (
              <Input
                label="Reset code"
                value={code}
                onChange={(value) => setCode(value.replace(/[^0-9]/g, "").slice(0, 6))}
                placeholder="6-digit code"
                inputMode="numeric"
                classNames={UNDERLINE_FIELD}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
              />
            ) : null}

            {mode !== "reset" ? (
              <Input
                label={mode === "reset-verify" ? "New password" : "Password"}
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                classNames={UNDERLINE_FIELD}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
              />
            ) : null}

            {mode === "signup" || mode === "reset-verify" ? (
              <Input
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat your password"
                autoComplete="new-password"
                classNames={UNDERLINE_FIELD}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit();
                }}
              />
            ) : null}
          </div>

          {error ? <p className="text-[12px] text-destructive">{error}</p> : null}

          {mode === "reset" || mode === "reset-verify" ? (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              No email is sent on this deployment. The code is printed in the
              terminal running{" "}
              <span className="font-medium text-foreground">bunx convex dev</span>.
            </p>
          ) : null}

          <Button onClick={submit} loading={pending} disabled={pending} className="w-full">
            {cta}
            <Icon icon={ArrowRight01Icon} className="size-4" />
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
            {mode === "signin" ? (
              <>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="transition-colors hover:text-foreground"
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="transition-colors hover:text-foreground"
                >
                  Forgot password?
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="transition-colors hover:text-foreground"
              >
                Back to sign in
              </button>
            )}
          </div>
          </div>
        </motion.div>
      </AnimatePresence>
  );
}
