import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--chart-positive)] text-emerald-950 hover:bg-[color-mix(in_oklab,var(--chart-positive),black_8%)] dark:text-emerald-950 dark:hover:bg-[color-mix(in_oklab,var(--chart-positive),white_8%)]",
        outline:
          "border-[color-mix(in_oklab,var(--chart-positive),transparent_60%)] bg-background text-foreground hover:bg-[color-mix(in_oklab,var(--chart-positive),transparent_88%)] aria-expanded:bg-[color-mix(in_oklab,var(--chart-positive),transparent_88%)] dark:bg-input/20 dark:hover:bg-[color-mix(in_oklab,var(--chart-positive),transparent_84%)]",
        secondary:
          "bg-[color-mix(in_oklab,var(--chart-positive),transparent_86%)] text-foreground hover:bg-[color-mix(in_oklab,var(--chart-positive),transparent_78%)] aria-expanded:bg-[color-mix(in_oklab,var(--chart-positive),transparent_78%)]",
        ghost:
          "hover:bg-[color-mix(in_oklab,var(--chart-positive),transparent_90%)] hover:text-foreground aria-expanded:bg-[color-mix(in_oklab,var(--chart-positive),transparent_90%)] dark:hover:bg-[color-mix(in_oklab,var(--chart-positive),transparent_86%)]",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300",
      },
      size: {
        default:
          "h-9 gap-2 rounded-full px-3 py-0 text-sm has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-7 gap-1 rounded-full px-2 py-0 text-xs in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-2 rounded-full px-3 py-0 text-sm in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        lg: "h-10 gap-2 rounded-full px-3.5 py-0 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-full in-data-[slot=button-group]:rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-full in-data-[slot=button-group]:rounded-full",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & { loading?: boolean }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? (
        <span aria-hidden className="flex shrink-0 items-center gap-0.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="size-1 animate-pulse rounded-full bg-current"
              style={{ animationDelay: `${index * 120}ms` }}
            />
          ))}
        </span>
      ) : null}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
