"use client";

import { useState } from "react";
import { UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/huge-icon";
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@/components/motion/popover-morph";
import { WheelPicker } from "@/components/motion/wheel-picker";
import { Button } from "@/components/ui/button";

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);

export function TimeSelect({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hourValue, minuteValue] = value.split(":");
  const hour = hourValue || "12";
  const minute = minuteValue || "00";

  return (
    <MorphPopover open={open} onOpenChange={setOpen}>
      <MorphPopoverTrigger>
        <button
          type="button"
          className="btn-3d flex h-10 w-32 items-center justify-between gap-2 rounded-full bg-muted/60 px-2.5 text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Select time"
        >
          <span className="tnum">{value || "Time"}</span>
          <Icon icon={UnfoldMoreIcon} className="size-4 text-muted-foreground" />
        </button>
      </MorphPopoverTrigger>

      <MorphPopoverContent radius={20} align="start" className="w-52 p-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
              Hour
            </p>
            <WheelPicker
              options={HOURS}
              value={hour}
              onValueChange={(next) => onValueChange(`${next}:${minute}`)}
              visibleCount={3}
              itemHeight={32}
              className="rounded-none border-0 bg-transparent"
              aria-label="Hour"
            />
          </div>
          <div>
            <p className="mb-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground">
              Minute
            </p>
            <WheelPicker
              options={MINUTES}
              value={minute}
              onValueChange={(next) => onValueChange(`${hour}:${next}`)}
              visibleCount={3}
              itemHeight={32}
              className="rounded-none border-0 bg-transparent"
              aria-label="Minute"
            />
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </MorphPopoverContent>
    </MorphPopover>
  );
}
