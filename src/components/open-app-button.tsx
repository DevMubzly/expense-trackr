"use client";

import { useState, type ReactNode } from "react";
import { AuthDialog } from "@/components/auth-dialog";

export function OpenAppButton({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children ?? "Open App"}
      </button>
      <AuthDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
