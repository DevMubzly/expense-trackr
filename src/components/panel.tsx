import { cn } from "@/lib/utils";
import { SectionInfo } from "@/components/section-info";

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-background backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  hint,
  action,
  className,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-4", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-normal text-foreground">{title}</p>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground/80">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export const sectionCardClass = "flex flex-col border border-foreground/10 p-1";
export const sectionHeaderClass = "px-3 pb-2 pt-2";
export const sectionBodyClass =
  "flex-1 rounded-xl border border-foreground/5 bg-muted/10";

export function PanelBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(sectionBodyClass, "p-4", className)}>{children}</div>
  );
}

export function SectionPanel({
  title,
  hint,
  action,
  info,
  className,
  headerClassName,
  bodyClassName,
  children,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  info?: string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Panel className={cn(sectionCardClass, className)}>
      <PanelHeader
        title={
          info ? (
            <span className="flex items-center gap-1.5">
              {title}
              <SectionInfo
                label={typeof title === "string" ? title : "Section"}
              >
                {info}
              </SectionInfo>
            </span>
          ) : (
            title
          )
        }
        hint={hint}
        action={action}
        className={cn(sectionHeaderClass, headerClassName)}
      />
      <PanelBody className={bodyClassName}>{children}</PanelBody>
    </Panel>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="text-2xl font-semibold">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-muted-foreground">{hint}</p> : null}
      {action}
    </div>
  );
}
