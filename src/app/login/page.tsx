"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Money03Icon,
  Tick02Icon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@/components/auth-provider";
import { Icon } from "@/components/huge-icon";
import { Input } from "@/components/motion/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function enter(nextEmail = email, nextPassword = password) {
    if (!nextEmail.trim() || !nextPassword.trim()) {
      setError("Enter any email and password to continue.");
      return;
    }
    login(nextEmail, nextPassword);
    router.push("/dashboard");
  }

  return (
    <div className="grid min-h-dvh bg-background text-foreground lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-foreground p-10 text-background lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 size-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-background text-foreground">
              <Icon icon={Wallet02Icon} className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-[-0.02em]">
              Expense Trackr
            </span>
          </Link>

          <h1 className="mt-20 max-w-md font-display text-4xl leading-[1.02] tracking-[-0.05em]">
            Walk back into a money picture that makes sense.
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-background/60">
            One place for accounts, earnings, spending, goals and debts. The demo
            is preloaded with realistic mock data.
          </p>

          <div className="mt-10 space-y-3">
            {[
              "Balances, budgets and plan items stay in sync",
              "Multi-currency formatting without fake conversions",
              "Editable categories, accounts and income sources",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-[13px] text-background/70">
                <span className="grid size-5 place-items-center rounded-full bg-background/10">
                  <Icon icon={Tick02Icon} className="size-3" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-16 grid max-w-md grid-cols-3 gap-2">
          {[
            ["Spent", "UGX 1.32M"],
            ["Income", "UGX 2.80M"],
            ["Net", "UGX 1.48M"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-background/10 bg-background/[0.06] p-3"
            >
              <p className="text-[9px] text-background/45">{label}</p>
              <p className="mt-1.5 text-[11px] font-semibold">{value}</p>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex min-h-dvh flex-col px-6 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Icon icon={ArrowLeft01Icon} className="size-3.5" />
            Back to landing
          </Link>
          <span className="rounded-full border border-foreground/10 px-2.5 py-1 text-[10px] text-muted-foreground">
            Mock login
          </span>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <span className="grid size-11 place-items-center rounded-2xl bg-foreground text-background lg:hidden">
            <Icon icon={Wallet02Icon} className="size-5" />
          </span>

          <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Welcome back
          </p>
          <h2 className="mt-2 font-display text-3xl leading-tight tracking-[-0.04em]">
            Sign in to your workspace.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Any email and password will work. This is a mock session stored in
            your browser.
          </p>

          {user ? (
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-[12px] text-emerald-700 dark:text-emerald-300">
              Signed in as {user.email}.{" "}
              <Link href="/dashboard" className="font-medium underline underline-offset-2">
                Continue to dashboard
              </Link>
            </div>
          ) : null}

          <form
            className="mt-7 space-y-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              enter();
            }}
          >
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(value) => {
                setEmail(value);
                setError("");
              }}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setError("");
              }}
              placeholder="Anything you like"
              autoComplete="current-password"
            />
            {error ? (
              <p className="px-1 text-[12px] text-destructive">{error}</p>
            ) : null}
            <Button type="submit" className="h-11 w-full">
              Enter the demo
              <Icon icon={ArrowRight01Icon} className="size-4" />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="outline"
            className="h-11 w-full"
            onClick={() => {
              setEmail("demo@expense.app");
              setPassword("demo");
              enter("demo@expense.app", "demo");
            }}
          >
            <Icon icon={Money03Icon} className="size-4" />
            Use demo account
          </Button>

          <p className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground">
            No credentials are checked. No real financial data is connected.
          </p>
        </div>
      </main>
    </div>
  );
}
