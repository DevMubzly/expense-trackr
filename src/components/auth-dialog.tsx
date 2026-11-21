"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Cancel01Icon, GoogleIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { useAuth } from "@/components/auth-provider";
import { Input } from "@/components/motion/input";
import { Icon } from "@/components/huge-icon";
import { Button } from "@/components/ui/button";

type Mode = "signin" | "register" | "forgot";

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
          <motion.div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
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
            className="dark relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-foreground/10 bg-card p-5 text-foreground shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-3 top-3 grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon icon={Cancel01Icon} className="size-4" />
            </button>

            <h2 id={titleId} className="text-center text-base font-semibold tracking-[-0.02em]">
              Expense Trackr
            </h2>

            <AuthBody onDone={onClose} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AuthBody({ onDone }: { onDone: () => void }) {
  const { login } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  function enter(nextEmail = email, nextPassword = password) {
    if (pending) return;
    setPending(true);
    // Brief pending state so the sign-in reads as an action, not a jump.
    window.setTimeout(() => {
      login(nextEmail, nextPassword);
      onDone();
      router.push("/dashboard");
    }, 420);
  }

  function submit() {
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (mode === "forgot") {
      setError(undefined);
      setSent(true);
      return;
    }

    if (!password.trim()) {
      setError("Enter a password.");
      return;
    }

    if (mode === "register" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setError(undefined);
    enter();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(undefined);
    setSent(false);
    setPassword("");
    setConfirm("");
  }

  if (mode === "forgot" && sent) {
    return (
      <div className="mt-6 text-center">
        <span className="mx-auto grid size-10 place-items-center rounded-full bg-muted text-foreground">
          <Icon icon={Tick02Icon} className="size-5" />
        </span>
        <p className="mt-4 text-sm font-medium">Check your inbox</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          A reset link was sent to {email}. It expires in 30 minutes.
        </p>
        <Button className="mt-5 w-full" onClick={() => switchMode("signin")}>
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      {mode !== "forgot" ? (
        <>
          <Button
            variant="outline"
            className="w-full bg-muted/50"
            loading={pending}
            disabled={pending}
            onClick={() => enter("demo@expense.app", "google")}
          >
            <Icon icon={GoogleIcon} className="size-4" />
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <div className="space-y-3">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
        />

        {mode !== "forgot" ? (
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="At least 6 characters"
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        ) : null}

        {mode === "register" ? (
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Repeat your password"
            autoComplete="new-password"
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        ) : null}
      </div>

      {error ? <p className="text-[12px] text-destructive">{error}</p> : null}

      <Button onClick={submit} className="w-full" loading={pending} disabled={pending}>
        {mode === "register"
          ? "Create account"
          : mode === "forgot"
            ? "Send reset link"
            : "Sign in"}
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-muted-foreground">
        {mode === "signin" ? (
          <>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className="transition-colors hover:text-foreground"
            >
              Create account
            </button>
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="transition-colors hover:text-foreground"
            >
              Forgot password?
            </button>
          </>
        ) : null}

        {mode === "register" ? (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="transition-colors hover:text-foreground"
          >
            Already have an account? Sign in
          </button>
        ) : null}

        {mode === "forgot" ? (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="transition-colors hover:text-foreground"
          >
            Back to sign in
          </button>
        ) : null}
      </div>
    </div>
  );
}
