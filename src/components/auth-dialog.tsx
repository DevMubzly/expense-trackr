"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  GoogleIcon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/components/auth-provider";
import { Input } from "@/components/motion/input";
import { Icon } from "@/components/huge-icon";
import { Button } from "@/components/ui/button";

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dark relative z-10 text-foreground max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-foreground/10 bg-card p-1 shadow-2xl"
      >
        <div className="flex items-center gap-2 px-3.5 pb-2 pt-2">
          <Icon icon={Wallet02Icon} className="size-3.5 shrink-0 text-muted-foreground" />
          <p id={titleId} className="truncate text-[15px]">
            Open Expense Trackr
          </p>
          <button
            type="button"
            aria-label="Close sign in"
            onClick={onClose}
            className="ml-auto grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon icon={Cancel01Icon} className="size-4" />
          </button>
        </div>

        <AuthForm onDone={onClose} />
      </div>
    </div>
  );
}

function AuthForm({ onDone }: { onDone: () => void }) {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();

  function enter(nextEmail = email, nextPassword = password) {
    if (!nextEmail.trim()) {
      setError("Enter an email address.");
      return;
    }
    if (!nextPassword.trim()) {
      setError("Enter a password.");
      return;
    }
    setError(undefined);
    login(nextEmail, nextPassword);
    onDone();
    router.push("/dashboard");
  }

  return (
    <>
      <div className="rounded-xl border border-foreground/10 bg-muted/15 p-3.5 px-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Sign in to your workspace. Any email and password works.
        </p>
        <div className="mt-3 space-y-3">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Anything you like"
            autoComplete="current-password"
            error={error}
            onKeyDown={(event) => {
              if (event.key === "Enter") enter();
            }}
          />
        </div>
      </div>

      <div className="mt-1 rounded-xl border border-foreground/10 bg-muted/15 p-3 px-4">
        <Button onClick={() => enter()} className="w-full">
          Open App
          <Icon icon={ArrowRight01Icon} className="size-4" />
        </Button>

        <div className="my-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          variant="outline"
          className="w-full bg-muted/50"
          onClick={() => enter("demo@expense.app", "google")}
        >
          <Icon icon={GoogleIcon} className="size-4" />
          Continue with Google
        </Button>
      </div>
    </>
  );
}
