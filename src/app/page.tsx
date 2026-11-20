import Image from "next/image";
import Link from "next/link";
import { ArrowRight01Icon, Tick02Icon, Wallet02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/huge-icon";
import { buttonVariants } from "@/components/ui/button";

export default function LandingPage() {
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
            <Link href="/" className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-white text-black">
                <Icon icon={Wallet02Icon} className="size-4" />
              </span>
              <span className="text-sm font-semibold tracking-[-0.02em] text-white">
                Expense Trackr
              </span>
            </Link>

            <nav className="flex items-center gap-6">
              <Link
                href="/pricing"
                className="text-[13px] text-white/75 transition-colors hover:text-white"
              >
                Pricing
              </Link>
              <Link
                href="/dashboard"
                className={buttonVariants({
                  size: "sm",
                  className: "bg-white text-black hover:bg-white/90",
                })}
              >
                Open App
                <Icon icon={ArrowRight01Icon} className="size-3.5" />
              </Link>
            </nav>
          </header>

          <main className="flex flex-1 items-center justify-center px-6 pb-24 pt-10 lg:px-10">
            <div className="max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/85 backdrop-blur-sm">
                <Icon icon={Tick02Icon} className="size-3" />
                A calmer way to run your money
              </span>

              <h1 className="mt-7 font-display text-5xl leading-[0.95] tracking-[-0.05em] text-white [text-shadow:0_2px_30px_rgba(0,0,0,0.45)] sm:text-7xl lg:text-8xl">
                Every shilling
                <span className="block text-white/70">has a job.</span>
              </h1>

              <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-white/80 [text-shadow:0_1px_18px_rgba(0,0,0,0.55)] sm:text-base">
                Expenses, income, budgets, goals and debts in one desktop
                workspace. Set your defaults once and let every page tell the
                same story.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className={buttonVariants({
                    size: "lg",
                    className: "h-11 bg-white px-5 text-black hover:bg-white/90",
                  })}
                >
                  Open App
                  <Icon icon={ArrowRight01Icon} className="size-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  View pricing
                </Link>
              </div>

              <p className="mt-5 text-[11px] text-white/60 [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
                No bank connection. Any email and password opens the demo.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
