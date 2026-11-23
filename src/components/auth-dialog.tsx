"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/components/auth-provider";
import { isOnboarded } from "@/lib/onboarding";
import { Input } from "@/components/motion/input";
import { Icon } from "@/components/huge-icon";
import { Button } from "@/components/ui/button";
import { EASE_OUT } from "@/lib/ease";

const UNDERLINE_FIELD = {
  field:
    "h-10 rounded-none border-x-0 border-t-0 border-b border-border bg-transparent data-[state=focused]:ring-0",
  input: "text-sm",
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
          <motion.div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
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
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: 8,
              scale: 0.98,
              transition: { duration: 0.16, ease: EASE_OUT },
            }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            className="dark relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-background p-1 text-foreground shadow-2xl"
          >
            <AuthBody onDone={onClose} titleId={titleId} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type Step = "email" | "otp";

function AuthBody({
  onDone,
  titleId,
}: {
  onDone: () => void;
  titleId: string;
}) {
  const { login } = useAuth();
  const router = useRouter();
  const emailId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const code = otp.join("");
  const validEmail = email.trim().includes("@");

  function focusFirstOtp() {
    window.setTimeout(() => otpRefs.current[0]?.focus(), 260);
  }

  function goBack() {
    setStep("email");
    setError(undefined);
    window.setTimeout(() => emailRef.current?.focus(), 260);
  }

  async function sendCode() {
    if (pending || googlePending || resending) return;
    if (!validEmail) {
      setError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }
    setError(undefined);
    setPending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    setPending(false);
    setStep("otp");
    focusFirstOtp();
  }

  function finishLogin(nextEmail: string) {
    login(nextEmail, "otp");
    onDone();
    router.push(isOnboarded() ? "/dashboard" : "/onboarding?step=welcome");
  }

  async function continueWithGoogle() {
    if (pending || googlePending) return;
    setError(undefined);
    setGooglePending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    finishLogin("brian@expense.app");
  }

  async function verifyCode() {
    if (pending || googlePending || code.length !== 6) {
      if (code.length !== 6) setError("Enter the 6-digit code.");
      return;
    }
    setError(undefined);
    setPending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    finishLogin(email.trim());
  }

  async function resendCode() {
    if (resending || pending) return;
    setError(undefined);
    setResending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 600));
    setResending(false);
    setResent(true);
    window.setTimeout(() => setResent(false), 2400);
  }

  function setDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    setOtp((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      event.preventDefault();
      setOtp((current) => {
        const next = [...current];
        next[index - 1] = "";
        return next;
      });
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "Enter") verifyCode();
  }

  function handleOtpPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const digits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!digits) return;
    event.preventDefault();
    const next = Array(6).fill("");
    digits.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    setOtp(next);
    otpRefs.current[Math.min(digits.length, 5)]?.focus();
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-y-auto rounded-xl border border-foreground/10 bg-muted/50 p-3.5 pb-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            {step === "email" ? (
              <div className="space-y-4">
                <div>
                  <h2
                    id={titleId}
                    className="text-lg font-semibold tracking-[-0.02em]"
                  >
                    Welcome back
                  </h2>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                    Enter your email and we&apos;ll send a one-time code.
                  </p>
                </div>

                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
                  <label
                    htmlFor={emailId}
                    className="text-[13px] text-muted-foreground"
                  >
                    Email:
                  </label>
                  <Input
                    ref={emailRef}
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    aria-label="Email"
                    disabled={pending || googlePending}
                    classNames={UNDERLINE_FIELD}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") sendCode();
                    }}
                  />
                  <Button
                    onClick={sendCode}
                    loading={pending}
                    disabled={pending || googlePending || !email.trim()}
                    className="h-8 shrink-0 px-3 text-[12px]"
                  >
                    <Icon icon={ArrowRight01Icon} className="size-3.5" />
                    Send code
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[11px] text-muted-foreground">or</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button
                  variant="outline"
                  className="w-full bg-muted/50"
                  onClick={continueWithGoogle}
                  loading={googlePending}
                  disabled={pending || googlePending}
                >
                  <GoogleLogo className="size-4" />
                  Continue with Google
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2
                    id={titleId}
                    className="text-lg font-semibold tracking-[-0.02em]"
                  >
                    Enter your code
                  </h2>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-foreground">
                      {email.trim()}
                    </span>
                    .
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-[13px] text-muted-foreground">
                    Verification code:
                  </p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(element) => {
                          otpRefs.current[index] = element;
                        }}
                        value={digit}
                        onChange={(event) =>
                          setDigit(index, event.target.value)
                        }
                        onKeyDown={(event) =>
                          handleOtpKeyDown(index, event)
                        }
                        onPaste={handleOtpPaste}
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        aria-label={`Digit ${index + 1}`}
                        disabled={pending}
                        className="h-12 min-w-0 rounded-xl border border-foreground/10 bg-background/70 text-center text-lg font-semibold text-foreground outline-none transition-[border-color,box-shadow] focus:border-foreground/35 focus:ring-2 focus:ring-foreground/15 disabled:opacity-60"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={pending}
                    className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={pending || resending}
                    className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
                  >
                    {resending
                      ? "Sending…"
                      : resent
                        ? "Code sent"
                        : "Resend code"}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {error ? (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.15 }}
              className="mt-3 text-[12px] text-destructive"
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-1 flex shrink-0 items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={onDone}
          disabled={pending || googlePending}
          className="h-8 px-3 text-[12px]"
        >
          <Icon icon={Cancel01Icon} className="size-4" /> Cancel
        </Button>
        {step === "otp" ? (
          <Button
            onClick={verifyCode}
            loading={pending}
            disabled={pending || googlePending || code.length !== 6}
            className="h-8 min-w-28 px-3 text-[12px]"
          >
            <Icon icon={Tick02Icon} className="size-4" />
            Verify
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.97 6.97 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}
