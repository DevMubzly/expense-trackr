"use client";

import { useState } from "react";
import { gooeyToast } from "goey-toast";
import { PaintBoardIcon, RepeatIcon, Tick02Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { InlineSlider } from "@/components/motion/range-slider-inline";
import { AvailabilityScheduler } from "@/components/motion/availability-scheduler";
import type { WeekAvailability } from "@/components/motion/availability-scheduler/types";
import { Input } from "@/components/motion/input";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
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
        <Loader variant="helix" size={30} />
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
    <div className="space-y-8">
      <header>
        <p className="text-[13px] text-muted-foreground">Settings</p>
        <h1 className="mt-2 font-display text-5xl leading-none md:text-[56px]">Make it yours.</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          The budget, the rate, the look. Everything here is stored through the mock API.
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <Panel className="col-span-12 p-6 lg:col-span-7">
          <PanelHeader
            title="Monthly budget"
            hint="Drag to set what a month should cost"
            action={<Icon icon={Wallet01Icon} className="size-4 text-muted-foreground" />}
            className="p-0 pb-6"
          />

          <div className="mb-6">
            <Money value={budget} size="xl" />
          </div>

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

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Input
              label="USD rate (UGX per 1 USD)"
              value={rate}
              onChange={(value) => setRate(value.replace(/[^0-9.]/g, ""))}
              placeholder="3720"
            />
            <div className="flex flex-col justify-end gap-2">
              <p className="text-[13px] text-muted-foreground">Theme</p>
              <div className="flex items-center gap-3">
                <ThemeToggle
                  variant="circle-blur"
                  className="size-10 rounded-xl border border-border bg-card"
                  iconClassName="size-4"
                />
                <span className="text-xs text-muted-foreground">
                  Light, or dark if you must
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-border/70 pt-5">
            <p className="text-[11px] text-muted-foreground">
              Saved entries keep the rate they were logged with.
            </p>
            <Button onClick={save} disabled={saving}>
              <Icon icon={Tick02Icon} className="size-4" /> {saving ? "Saving" : "Save changes"}
            </Button>
          </div>
        </Panel>

        <Panel className="col-span-12 p-6 lg:col-span-5">
          <PanelHeader
            title="Categories"
            hint="The palette behind every chart"
            action={<Icon icon={PaintBoardIcon} className="size-4 text-muted-foreground" />}
            className="p-0 pb-4"
          />
          <ul className="space-y-2">
            {CATEGORIES.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2"
              >
                <span
                  className="grid size-8 place-items-center rounded-lg"
                  style={{ background: `color-mix(in oklab, ${category.color} 14%, transparent)` }}
                >
                  <Icon icon={category.icon} className="size-4" />
                </span>
                <span className="flex-1 text-[13px]">{category.label}</span>
                <span className="size-2.5 rounded-full" style={{ background: category.color }} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="col-span-12 p-6">
          <PanelHeader
            title="Spending windows"
            hint="When money usually leaves your account"
            action={<Icon icon={RepeatIcon} className="size-4 text-muted-foreground" />}
            className="p-0 pb-4"
          />
          <AvailabilityScheduler value={weekPlan} onChange={setWeekPlan} step={30} />
          <div className="mt-5 flex justify-end border-t border-border/70 pt-5">
            <Button onClick={save} disabled={saving}>
              <Icon icon={Tick02Icon} className="size-4" /> {saving ? "Saving" : "Save week plan"}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
