"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { AuthDialog } from "@/components/auth-dialog";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    // Post-hydration only: the query string is not available during prerender.
    if (new URLSearchParams(window.location.search).get("auth") === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthOpen(true);
    }
  }, []);

  return (
    <div className="theme-light min-h-dvh bg-black text-foreground">
      <div className="relative isolate min-h-dvh overflow-hidden">
        <Image
          src="/bg-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-black/35 to-transparent" />

        <div className="relative flex min-h-dvh flex-col">
          <header className="flex items-center justify-between px-6 py-6 lg:px-10">
            <Link
              href="/"
              className="text-sm font-semibold tracking-[-0.02em] text-white"
            >
              Expense Trackr
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                href="/pricing"
                className="text-[13px] text-white/75 transition-colors hover:text-white"
              >
                Pricing
              </Link>
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className={buttonVariants({
                  size: "sm",
                  className: "bg-white text-black hover:bg-white/90",
                })}
              >
                Open App
                <Icon icon={ArrowRight01Icon} className="size-3.5" />
              </button>
            </nav>
          </header>

          <main className="flex flex-1 items-center justify-center px-6 pb-24 pt-10 lg:px-10">
            <div className="max-w-3xl text-center">
              <h1 className="font-display text-5xl leading-[0.95] tracking-[-0.05em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.45)] sm:text-7xl lg:text-8xl">
                Every shilling
                <span className="block text-white/70">has a job.</span>
              </h1>

              <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-white/80 [text-shadow:0_1px_18px_rgba(0,0,0,0.55)] sm:text-base">
                Expenses, income, budgets, goals and debts in one desktop
                workspace. Set your defaults once and let every page tell the
                same story.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className={buttonVariants({
                    size: "lg",
                    className: "h-11 bg-white px-5 text-black hover:bg-white/90",
                  })}
                >
                  Open App
                  <Icon icon={ArrowRight01Icon} className="size-4" />
                </button>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>

      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
