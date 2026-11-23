import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-3",
        className,
      )}
    >
      <span
        style={{ fontFamily: "var(--font-syncopate), system-ui, sans-serif" }}
        className="font-syncopate text-[11px] tracking-[0.02em] text-muted-foreground"
      >
        Expense Trackr
      </span>
      <span className="h-4 w-px bg-border" />
      <a
        href="https://salastores.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="SalaStores"
        className="group inline-flex items-center gap-3"
      >
        <Image
          src="/salastores-logo.svg"
          alt=""
          width={30}
          height={28}
          className="opacity-60 pb-1 transition-opacity group-hover:opacity-100"
        />
        <span
          style={{ fontFamily: "var(--font-syncopate), system-ui, sans-serif" }}
          className="font-syncopate text-[11px] tracking-[0.02em] text-muted-foreground transition-colors group-hover:text-foreground"
        >
          <span className="text-purple-400">Sala</span>Stores
        </span>
      </a>
    </div>
  );
}
