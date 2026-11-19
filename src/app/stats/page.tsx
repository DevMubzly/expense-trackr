"use client";

import { useState } from "react";
import { InsightsBento } from "@/components/insights-bento";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/motion/combobox";
import { PERIOD_OPTIONS } from "@/lib/periods";
import type { StatPeriod } from "@/lib/types";

export default function StatsPage() {
  const [period, setPeriod] = useState<StatPeriod>("30d");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-5xl leading-none md:text-[56px]">
            The shape of your spending.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Trends, category splits, and the days your wallet notices.
          </p>
        </div>
        <Combobox
          value={period}
          onValueChange={(value) => setPeriod(value as StatPeriod)}
          className="w-36 shrink-0"
        >
          <ComboboxTrigger className="h-9 min-w-0 rounded-full px-2.5">
            <ComboboxInput
              aria-label="Metric timeframe"
              placeholder="Timeframe"
              className="h-9 text-[13px]"
              showIcon={false}
            />
          </ComboboxTrigger>
          <ComboboxContent className="w-52 rounded-2xl">
            <ComboboxList ariaLabel="Metric timeframe" className="p-2">
              <ComboboxEmpty>No timeframes.</ComboboxEmpty>
              {PERIOD_OPTIONS.map((option) => (
                <ComboboxItem
                  key={option.value}
                  value={option.value}
                  textValue={option.label}
                >
                  {option.label}
                </ComboboxItem>
              ))}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </header>

      <InsightsBento period={period} />
    </div>
  );
}
