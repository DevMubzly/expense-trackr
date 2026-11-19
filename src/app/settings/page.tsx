"use client";

import { useState } from "react";
import { gooeyToast } from "goey-toast";
import {
  Delete02Icon,
  Download01Icon,
  PaintBoardIcon,
  PencilEdit01Icon,
  PlusSignIcon,
  RepeatIcon,
  Tick02Icon,
  Upload01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { AccountSelect, accountIcon } from "@/components/account-select";
import { InlineSlider } from "@/components/motion/range-slider-inline";
import { AvailabilityScheduler } from "@/components/motion/availability-scheduler";
import type { WeekAvailability } from "@/components/motion/availability-scheduler/types";
import { Input } from "@/components/motion/input";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { WheelPicker } from "@/components/motion/wheel-picker";
import { MorphingModal } from "@/components/motion/morphing-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import { Panel, PanelHeader } from "@/components/panel";
import { PageLoader } from "@/components/page-loader";
import { useApi, api } from "@/lib/use-api";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import {
  formatNumber,
  formatNumericInput,
  parseNumericInput,
} from "@/lib/format";
import { useTransactionDialog } from "@/components/expense-dialog";
import type {
  Account,
  AccountBalance,
  AccountType,
  HouseholdMember,
  Settings,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { version, bumpVersion } = useTransactionDialog();
  const { data, loading, refresh } = useApi<Settings>("/api/settings");
  const { data: accountsData, refresh: refreshAccounts } = useApi<AccountBalance[]>(
    `/api/accounts?v=${version}`,
  );
  const { data: membersData, refresh: refreshMembers } = useApi<HouseholdMember[]>(
    `/api/household?v=${version}`,
  );

  if (loading && !data) {
    return <PageLoader variant="helix" size={30} />;
  }
  if (!data) return null;

  return (
    <SettingsForm
      settings={data}
      accounts={accountsData ?? []}
      members={membersData ?? []}
      onSaved={refresh}
      refreshAccounts={refreshAccounts}
      refreshMembers={refreshMembers}
      bumpVersion={bumpVersion}
    />
  );
}

function SettingsForm({
  settings,
  accounts,
  members,
  onSaved,
  refreshAccounts,
  refreshMembers,
  bumpVersion,
}: {
  settings: Settings;
  accounts: AccountBalance[];
  members: HouseholdMember[];
  onSaved: () => void;
  refreshAccounts: () => void;
  refreshMembers: () => void;
  bumpVersion: () => void;
}) {
  const [budget, setBudget] = useState(settings.monthlyBudget);
  const [rate, setRate] = useState(
    formatNumericInput(String(settings.usdRate), true),
  );
  const [payday, setPayday] = useState(settings.payday);
  const [buffer, setBuffer] = useState(settings.forecastBufferUgx);
  const [defaultAccountId, setDefaultAccountId] = useState(settings.defaultAccountId);
  const [weekPlan, setWeekPlan] = useState<WeekAvailability>(
    settings.weekPlan as unknown as WeekAvailability,
  );
  const [saving, setSaving] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  async function save() {
    setSaving(true);
    try {
      await api.patch("/api/settings", {
        monthlyBudget: budget,
        usdRate: parseNumericInput(rate) || settings.usdRate,
        payday,
        forecastBufferUgx: buffer,
        defaultAccountId,
        weekPlan,
      });
      gooeyToast.success("Settings updated", {
        description:
          "Budget, USD rate, payday and forecast settings are up to date.",
      });
      onSaved();
      bumpVersion();
    } catch (error) {
      gooeyToast.error("Could not save settings", {
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  function openAccount(account: Account | null) {
    setEditingAccount(account);
    setAccountModalOpen(true);
  }

  function closeAccount() {
    setAccountModalOpen(false);
    setEditingAccount(null);
  }

  async function archiveAccount(account: Account) {
    if (account.id === settings.defaultAccountId) {
      gooeyToast.error("Default account required", {
        description:
          "Choose another default account before archiving this one.",
      });
      return;
    }
    await api.delete(`/api/accounts/${account.id}`);
    gooeyToast.success(`${account.name} archived`, {
      description:
        "The account is no longer included in balances, but its transactions remain.",
    });
    refreshAccounts();
    bumpVersion();
  }

  async function addMember() {
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    try {
      await api.post("/api/household", {
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        role: "member",
      });
      gooeyToast.success("Household member invited", {
        description: `${inviteName.trim()} can now share this ledger.`,
      });
      setInviteName("");
      setInviteEmail("");
      refreshMembers();
      bumpVersion();
    } catch (error) {
      gooeyToast.error("Could not add member", {
        description: (error as Error).message,
      });
    }
  }

  async function removeMember(member: HouseholdMember) {
    try {
      await api.delete(`/api/household/${member.id}`);
      gooeyToast.success(`${member.name} removed`, {
        description: "They no longer have access to this household ledger.",
      });
      refreshMembers();
      bumpVersion();
    } catch (error) {
      gooeyToast.error("Could not remove member", {
        description: (error as Error).message,
      });
    }
  }

  async function downloadBackup(format: "json" | "csv") {
    const response = await fetch(`/api/export?format=${format}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      format === "csv"
        ? "expense-trackr-transactions.csv"
        : "expense-trackr-backup.json";
    link.click();
    URL.revokeObjectURL(url);
    gooeyToast.success("Backup downloaded", {
      description:
        format === "csv"
          ? "Your transactions were exported as a CSV file."
          : "A full JSON backup was saved to your downloads.",
    });
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      await api.post("/api/import", data);
      gooeyToast.success("Backup imported", {
        description: `${file.name} restored transactions, accounts and planning data.`,
      });
      onSaved();
      refreshAccounts();
      refreshMembers();
      bumpVersion();
    } catch (error) {
      gooeyToast.error("Could not import backup", {
        description: (error as Error).message,
      });
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-5xl leading-none md:text-[56px]">Make it yours.</h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          The budget, the accounts, the forecast. Everything here is stored through the mock API.
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
              onChange={(value) => setRate(formatNumericInput(value, true))}
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
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Expenses</p>
          <ul className="space-y-2">
            {EXPENSE_CATEGORIES.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-2xl bg-muted/20 px-3 py-2"
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
          <p className="mt-5 mb-2 text-[11px] font-medium text-muted-foreground">Income</p>
          <ul className="space-y-2">
            {INCOME_CATEGORIES.map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 rounded-2xl bg-muted/20 px-3 py-2"
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
            title="Accounts"
            hint="Cash, bank and mobile money wallets"
            action={
              <Button variant="outline" size="sm" onClick={() => openAccount(null)}>
                <Icon icon={PlusSignIcon} className="size-4" /> Add account
              </Button>
            }
            className="p-0 pb-4"
          />
          <ul className="grid gap-2 md:grid-cols-2">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center gap-3 rounded-2xl bg-muted/20 px-3 py-2.5"
              >
                <span
                  className="grid size-9 place-items-center rounded-lg"
                  style={{ background: `color-mix(in oklab, ${account.color} 14%, transparent)` }}
                >
                  <Icon icon={accountIcon(account.type)} className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]">{account.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {account.provider ?? account.type}
                  </p>
                </div>
                <Money value={account.balanceUgx} size="sm" />
                <button
                  type="button"
                  onClick={() => openAccount(account)}
                  aria-label={`Edit ${account.name}`}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Icon icon={PencilEdit01Icon} className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => archiveAccount(account)}
                  aria-label={`Archive ${account.name}`}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Icon icon={Delete02Icon} className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="col-span-12 p-6">
          <PanelHeader
            title="Payday & forecast"
            hint="Safe-to-spend runs to the next payday"
            className="p-0 pb-5"
          />
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="mb-2 text-[13px] text-muted-foreground">Payday day</p>
              <WheelPicker
                options={Array.from({ length: 31 }, (_, index) => String(index + 1))}
                value={String(payday)}
                onValueChange={(value) => setPayday(Number(value))}
                visibleCount={3}
                itemHeight={34}
                className="w-28"
                aria-label="Payday"
              />
            </div>
            <div className="md:col-span-2">
              <InlineSlider
                label="Buffer"
                value={buffer}
                onValueChange={setBuffer}
                min={0}
                max={1_000_000}
                step={25_000}
                format={(value) => `${formatNumber(value)} UGX`}
                aria-label="Forecast buffer"
              />
              <div className="mt-5">
                <AccountSelect
                  label="Default account"
                  value={defaultAccountId}
                  accounts={accounts}
                  onValueChange={setDefaultAccountId}
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end border-t border-border/70 pt-5">
            <Button onClick={save} disabled={saving}>
              <Icon icon={Tick02Icon} className="size-4" /> {saving ? "Saving" : "Save forecast"}
            </Button>
          </div>
        </Panel>

        <Panel className="col-span-12 p-6">
          <PanelHeader
            title="Household"
            hint="Shared budgets and visibility — mock membership"
            action={<Icon icon={UserGroupIcon} className="size-4 text-muted-foreground" />}
            className="p-0 pb-4"
          />
          <ul className="grid gap-2 md:grid-cols-2">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-2xl bg-muted/20 px-3 py-2.5"
              >
                <span className="grid size-9 place-items-center rounded-full bg-muted text-[12px] font-semibold text-muted-foreground">
                  {member.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]">{member.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{member.email}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  {member.role} · {member.status}
                </span>
                {member.role !== "owner" ? (
                  <button
                    type="button"
                    onClick={() => removeMember(member)}
                    aria-label={`Remove ${member.name}`}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Icon icon={Delete02Icon} className="size-3.5" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-2 border-t border-border/70 pt-5 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              label="Name"
              value={inviteName}
              onChange={setInviteName}
              placeholder="Aisha"
            />
            <Input
              label="Email"
              value={inviteEmail}
              onChange={setInviteEmail}
              placeholder="aisha@example.com"
            />
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={addMember}
                disabled={!inviteName.trim() || !inviteEmail.trim()}
              >
                <Icon icon={UserAdd01Icon} className="size-4" /> Invite
              </Button>
            </div>
          </div>
        </Panel>

        <Panel className="col-span-12 p-6">
          <PanelHeader
            title="Data & backup"
            hint="Export a copy or restore a backup file"
            className="p-0 pb-4"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => downloadBackup("json")}>
              <Icon icon={Download01Icon} className="size-4" /> Export JSON
            </Button>
            <Button variant="outline" onClick={() => downloadBackup("csv")}>
              <Icon icon={Download01Icon} className="size-4" /> Export CSV
            </Button>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium transition-colors hover:bg-muted">
              <Icon icon={Upload01Icon} className="size-4" /> Import backup
              <input
                type="file"
                accept="application/json"
                className="sr-only"
                onChange={(event) => {
                  importBackup(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            The mock store is in memory. Export a backup before restarting the dev server.
          </p>
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

      <MorphingModal
        viewId={accountModalOpen ? "account" : null}
        onClose={closeAccount}
        placement="center"
        className="max-w-md"
        ariaLabel={editingAccount ? "Edit account" : "Add account"}
      >
        {accountModalOpen ? (
          <AccountForm
            key={editingAccount?.id ?? "new-account"}
            account={editingAccount}
            onSaved={() => {
              refreshAccounts();
              bumpVersion();
              closeAccount();
            }}
            onCancel={closeAccount}
          />
        ) : null}
      </MorphingModal>
    </div>
  );
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "momo", label: "Mobile Money" },
];

function AccountForm({
  account,
  onSaved,
  onCancel,
}: {
  account: Account | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "cash");
  const [provider, setProvider] = useState(account?.provider ?? "");
  const [openingBalance, setOpeningBalance] = useState(
    account ? formatNumericInput(String(account.openingBalanceUgx)) : "0",
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        provider: type === "momo" ? provider.trim() || undefined : undefined,
        openingBalanceUgx: parseNumericInput(openingBalance),
      };
      if (account) {
        await api.patch(`/api/accounts/${account.id}`, payload);
        gooeyToast.success("Account updated", {
          description: `${name.trim()} is synced across your ledger.`,
        });
      } else {
        await api.post("/api/accounts", payload);
        gooeyToast.success("Account added", {
          description: `${name.trim()} is ready with a UGX ${formatNumber(
            parseNumericInput(openingBalance),
          )} opening balance.`,
        });
      }
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save account", {
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">
          {account ? "Edit account" : "Add account"}
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Cash, bank, or a Mobile Money wallet.
        </p>
      </div>

      <Input label="Name" value={name} onChange={setName} placeholder="MTN MoMo" />

      <div>
        <p className="mb-2 text-[13px] text-muted-foreground">Type</p>
        <div className="flex rounded-full border border-border bg-muted p-0.5">
          {ACCOUNT_TYPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setType(option.value)}
              className={cn(
                "flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors",
                type === option.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {type === "momo" ? (
        <Input
          label="Provider"
          value={provider}
          onChange={setProvider}
          placeholder="MTN or Airtel"
        />
      ) : null}

      <Input
        label="Opening balance (UGX)"
        value={openingBalance}
        onChange={(value) => setOpeningBalance(formatNumericInput(value))}
        placeholder="0"
      />

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} disabled={!name.trim() || saving}>
          <Icon icon={Tick02Icon} className="size-4" />
          {account ? "Save account" : "Add account"}
        </Button>
      </div>
    </div>
  );
}
