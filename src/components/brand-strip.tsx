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
        href="https://bmubarak.xyz"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="By Mubarak"
        className="group inline-flex items-center gap-1.5"
      >
        <span className="text-[11px] text-muted-foreground transition-colors group-hover:text-foreground">
          By Mubarak <span aria-hidden="true">☁️</span>
        </span>
      </a>
    </div>
  );
}
