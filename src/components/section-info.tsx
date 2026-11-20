"use client";

import { InformationCircleIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/huge-icon";
import { Tooltip } from "@/components/motion/tooltip";

export function SectionInfo({
  label,
  children,
}: {
  label: string;
  children: string;
}) {
  return (
    <Tooltip
      content={children}
      side="top"
      sideOffset={6}
      delay={80}
      closeDelay={60}
      className="max-w-[190px] whitespace-normal text-left text-xs leading-relaxed"
    >
      <button
        type="button"
        aria-label={`About ${label}`}
        className="-translate-y-px grid size-3.5 shrink-0 place-items-center rounded-full text-muted-foreground/50 outline-none transition-colors hover:text-muted-foreground focus-visible:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Icon icon={InformationCircleIcon} className="size-3" />
      </button>
    </Tooltip>
  );
}
