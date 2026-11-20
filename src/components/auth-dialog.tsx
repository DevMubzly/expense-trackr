"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight01Icon, Cancel01Icon, GoogleIcon } from "@hugeicons/core-free-icons";
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
      <button
        type="button"
        aria-label="Close sign in"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-foreground/50"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-foreground/10 bg-card p-6 shadow-2xl"
      >
        <button
          type="button"
          aria-label="Close sign in"
          onClick={onClose}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon icon={Cancel01Icon} className="size-4" />
        </button>
        <AuthForm titleId={titleId} onDone={onClose} />
      </div>
    </div>
  );
}

function AuthForm({ titleId, onDone }: { titleId: string; onDone: () => void }) {
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
    <div className="space-y-5">
      <div className="pr-8">
        <h2 id={titleId} className="text-lg font-semibold tracking-[-0.02em]">
          Open Expense Trackr
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Sign in to your workspace. Any email and password works.
        </p>
      </div>

      <div className="space-y-4">
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

      <Button onClick={() => enter()} className="w-full">
        Open App
        <Icon icon={ArrowRight01Icon} className="size-4" />
      </Button>

      <div className="flex items-center gap-3">
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
  );
}
