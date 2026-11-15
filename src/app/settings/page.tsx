"use client";

import { useState } from "react";
import { gooeyToast } from "goey-toast";
import { Check, Palette, Repeat, Wallet } from "lucide-react";
import { InlineSlider } from "@/components/motion/range-slider-inline";
import { AvailabilityScheduler } from "@/components/motion/availability-scheduler";
import type { WeekAvailability } from "@/components/motion/availability-scheduler/types";
import { Input } from "@/components/motion/input";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/panel";
import { Loader } from "@/components/motion/loader";
import { useApi, api } from "@/lib/use-api";
import { CATEGORIES } from "@/lib/categories";
import { formatNumber } from "@/lib/format";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const { data, loading, refresh } = useApi<Settings>("/api/settings");

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader variant="helix" size={32} />
      </div>
    );
  }
  if (!data) return null;

  return <SettingsForm settings={data} onSaved={refresh} />;
}

function SettingsForm({ settings, onSaved }: { settings: Settings; onSaved: () => void }) {
  const [budget, setBudget] = useState(settings.monthlyBudget);
  const [rate, setRate] = useState(String(settings.usdRate));
  const [weekPlan, setWeekPlan] = useState<WeekAvailability>(
    settings.weekPlan as unknown as WeekAvailability,
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch("/api/settings", {
        monthlyBudget: budget,
        usdRate: Number(rate) || settings.usdRate,
        weekPlan,
      });
      gooeyToast.success("Settings saved");
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Settings</p>
        <h1 className="mt-1 font-display text-5xl leading-none md:text-6xl">Make it yours.</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          The budget, the rate, the look. Everything here is stored through the mock API.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <Panel className="col-span-12 p-6 lg:col-span-7">
          <PanelHeader
            title="Monthly budget"
            hint={`${formatNumber(budget)} UGX`}
            action={<Wallet className="size-4 text-muted-foreground" />}
            className="p-0 pb-6"
          />
          <InlineSlider
            label="UGX"
            value={budget}
            onValueChange={setBudget}
            min={0}
            max={8_000_000}
            step={50_000}
            format={(value) => formatNumber(value)}
            aria-label="Monthly budget"
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Input
              label="USD rate (UGX per $1)"
              value={rate}
              onChange={(value) => setRate(value.replace(/[^0-9.]/g, ""))}
              placeholder="3720"
            />
            <div className="flex flex-col justify-end gap-2">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Theme</p>
              <div className="flex items-center gap-3">
                <ThemeToggle
                  variant="circle-blur"
                  className="size-10 rounded-xl border border-border bg-card"
                  iconClassName="size-4"
                />
                <span className="text-xs text-muted-foreground">View-transition toggle</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border/70 pt-4">
            <p className="text-[11px] text-muted-foreground">
              Saved entries keep the rate they were logged with.
            </p>
            <Button onClick={save} disabled={saving}>
              <Check className="size-4" /> {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </Panel>

        <Panel className="col-span-12 p-6 lg:col-span-5">
          <PanelHeader
            title="Categories"
            hint="Fixed palette — colours drive every chart"
            action={<Palette className="size-4 text-muted-foreground" />}
            className="p-0 pb-4"
          />
          <ul className="space-y-2">
            {CATEGORIES.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2"
              >
                <span
                  className="grid size-8 place-items-center rounded-lg text-sm"
                  style={{ background: `color-mix(in oklab, ${category.color} 16%, transparent)` }}
                >
                  {category.emoji}
                </span>
                <span className="flex-1 text-sm">{category.label}</span>
                <span className="size-3 rounded-full" style={{ background: category.color }} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="col-span-12 p-6">
          <PanelHeader
            title="Spending windows"
            hint="When money usually leaves — kept as a weekly plan"
            action={<Repeat className="size-4 text-muted-foreground" />}
            className="p-0 pb-4"
          />
          <AvailabilityScheduler value={weekPlan} onChange={setWeekPlan} step={30} />
          {/* shortcut: windows are stored but not yet used for nudges; wire them up when reminders ship. */}
          <div className="mt-4 flex justify-end">
            <Button onClick={save} disabled={saving}>
              <Check className="size-4" /> {saving ? "Saving…" : "Save week plan"}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
