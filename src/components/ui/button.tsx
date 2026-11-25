import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full bg-clip-padding text-sm font-medium whitespace-nowrap transition-[background-color,color,transform,translate,box-shadow] outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Monochrome: solid ink in light, solid paper in dark.
        default:
          "btn-3d bg-foreground text-background hover:bg-foreground/85",
        outline:
          "btn-3d bg-muted/50 text-foreground hover:bg-muted/70",
        secondary:
          "btn-3d bg-muted text-foreground hover:bg-muted/70",
        ghost:
          "btn-3d bg-muted/30 text-foreground hover:bg-muted/50",
        destructive:
          "btn-3d bg-destructive/15 text-destructive hover:bg-destructive/25",
        link: "text-foreground underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-2 rounded-full px-3 py-0 text-[12px] has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-7 gap-1 rounded-full px-2 py-0 text-xs in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-2 rounded-full px-3 py-0 text-[12px] in-data-[slot=button-group]:rounded-full has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
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
