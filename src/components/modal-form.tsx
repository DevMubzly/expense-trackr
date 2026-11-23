"use client";

import type { ReactNode } from "react";
import {
  Cancel01Icon,
  Delete02Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/huge-icon";
import { cn } from "@/lib/utils";

/** Shared modal body surface, matching the log-expense modal. */
export function ModalSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-h-[calc(100dvh-9rem)] space-y-4 overflow-y-auto rounded-xl border border-foreground/10 bg-muted/50 p-3.5 pb-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ModalHeading({
  title,
  hint,
}: {
  title: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
      {hint ? (
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ModalForm({
  title,
  hint,
  children,
  onCancel,
  onSubmit,
  submitLabel,
  saving = false,
  disabled = false,
  editing = false,
  onDelete,
  deleteLabel = "Delete",
  className,
  panelClassName,
}: {
  title: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  saving?: boolean;
  disabled?: boolean;
  editing?: boolean;
  onDelete?: () => void;
  deleteLabel?: string;
  className?: string;
  panelClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <ModalSurface className={panelClassName}>
        <ModalHeading title={title} hint={hint} />
        {children}
      </ModalSurface>
      <div className="mt-1 flex shrink-0 items-center justify-between gap-2">
        {onDelete ? (
          <Button
            variant="ghost"
            onClick={onDelete}
            disabled={saving}
            className="text-destructive"
          >
            <Icon icon={Delete02Icon} className="size-4" />
            {deleteLabel}
          </Button>
        ) : (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            <Icon icon={Cancel01Icon} className="size-4" /> Cancel
          </Button>
        )}
        <Button
          onClick={onSubmit}
          loading={saving}
          disabled={disabled}
          className="min-w-32"
        >
          <Icon icon={Tick02Icon} className="size-4" />
          {submitLabel ?? (editing ? "Save changes" : "Add")}
        </Button>
      </div>
    </div>
  );
}

export function ModalConfirm({
  title,
  description,
  children,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
  loading = false,
  disabled = false,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <ModalSurface>
        <ModalHeading title={title} hint={description} />
        {children}
      </ModalSurface>
      <div className="mt-1 flex shrink-0 items-center justify-between gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          <Icon icon={Cancel01Icon} className="size-4" /> Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          loading={loading}
          disabled={disabled}
          className="min-w-32"
        >
          <Icon icon={Delete02Icon} className="size-4" />
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
