"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { gooeyToast } from "goey-toast";
import {
  Cancel01Icon,
  ChartIncreaseIcon,
  Delete02Icon,
  Money03Icon,
  PencilEdit01Icon,
  PlusSignIcon,
  Tick02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { accountIcon } from "@/components/account-select";
import { useAuth } from "@/components/auth-provider";
import { useCategories } from "@/components/categories-provider";
import { useCurrency } from "@/components/currency-provider";
import { DropdownSelect } from "@/components/dropdown-select";
import { Input } from "@/components/motion/input";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { WheelPicker } from "@/components/motion/wheel-picker";
import { MorphingModal } from "@/components/motion/morphing-modal";
import { ModalConfirm, ModalForm, ModalHeading, ModalSurface } from "@/components/modal-form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/huge-icon";
import { MetricCard } from "@/components/metric-card";
import { Money } from "@/components/money";
import { SectionPanel } from "@/components/panel";
import { PageReveal, SettingsPageSkeleton } from "@/components/skeletons";
import { useApi, api } from "@/lib/use-api";
import { useTransactionDialog } from "@/components/expense-dialog";
import { COMPLETE_KEY, DRAFT_KEY } from "@/lib/onboarding";
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_ICON_OPTIONS,
  type CategoryIconKey,
  type CategoryKind,
  type CategoryRecord,
} from "@/lib/categories";
import {
  formatNumber,
  formatNumericInput,
  parseNumericInput,
} from "@/lib/format";
import {
  CURRENCY_META,
  CURRENCY_OPTIONS,
  PHONE_FORMATS,
  formatPhoneNumber,
} from "@/lib/currencies";
import type {
  Account,
  AccountBalance,
  AccountType,
  BudgetProgress,
  Currency,
  FinanceOverview,
  IncomeSource,
  Settings,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { version, bumpVersion } = useTransactionDialog();
  const { data, loading, refresh } = useApi<Settings>("/api/settings");
  const { data: accountsData, refresh: refreshAccounts } = useApi<
    AccountBalance[]
  >(`/api/accounts?v=${version}`);
  const { data: budgetsData, refresh: refreshBudgets } = useApi<
    BudgetProgress[]
  >(`/api/budgets?v=${version}`);
  const { data: overview, refresh: refreshOverview } = useApi<FinanceOverview>(
    `/api/overview?v=${version}`,
  );
  const { data: incomeSourcesData, refresh: refreshIncomeSources } = useApi<
    IncomeSource[]
  >(`/api/income-sources?v=${version}`);

  if (
    (loading && !data) ||
    !budgetsData ||
    !overview ||
    !incomeSourcesData
  ) {
    return <SettingsPageSkeleton />;
  }
  if (!data) return null;

  return (
    <SettingsForm
      settings={data}
      accounts={accountsData ?? []}
      budgets={budgetsData}
      overview={overview}
      incomeSources={incomeSourcesData}
      onSaved={refresh}
      refreshAccounts={refreshAccounts}
      refreshBudgets={refreshBudgets}
      refreshOverview={refreshOverview}
      refreshIncomeSources={refreshIncomeSources}
      bumpVersion={bumpVersion}
    />
  );
}

function SettingsForm({
  settings,
  accounts,
  budgets,
  overview,
  incomeSources,
  onSaved,
  refreshAccounts,
  refreshBudgets,
  refreshOverview,
  refreshIncomeSources,
  bumpVersion,
}: {
  settings: Settings;
  accounts: AccountBalance[];
  budgets: BudgetProgress[];
  overview: FinanceOverview;
  incomeSources: IncomeSource[];
  onSaved: () => void;
  refreshAccounts: () => void;
  refreshBudgets: () => void;
  refreshOverview: () => void;
  refreshIncomeSources: () => void;
  bumpVersion: () => void;
}) {
  const { expense, income, refresh: refreshCategories } = useCategories();
  const { logout } = useAuth();
  const display = useCurrency();
  const router = useRouter();
  const initialProfilePhone = formatPhoneNumber(
    settings.profilePhone ?? "",
    settings.defaultCurrency,
  );
  const overallBudget = budgets.find(
    (entry) => entry.categoryId === "all" && entry.period === "monthly",
  );
  const initialBudget = overallBudget?.limitUgx ?? 0;
  const [budget, setBudget] = useState(initialBudget);
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(
    settings.defaultCurrency,
  );
  const [payday, setPayday] = useState(settings.payday);
  const [defaultAccountId, setDefaultAccountId] = useState(
    settings.defaultAccountId,
  );
  const [profileName, setProfileName] = useState(settings.profileName ?? "");
  const [profileEmail, setProfileEmail] = useState(
    settings.profileEmail ?? "",
  );
  const [profilePhone, setProfilePhone] = useState(
    initialProfilePhone,
  );
  const [avatarDataUrl, setAvatarDataUrl] = useState(
    settings.avatarDataUrl ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategoryRecord | null>(null);
  const [deletingCategory, setDeletingCategory] =
    useState<CategoryRecord | null>(null);
  const [categoryDeleting, setCategoryDeleting] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(
    null,
  );
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeSource | null>(
    null,
  );
  const [deletingIncome, setDeletingIncome] = useState<IncomeSource | null>(
    null,
  );
  const [incomeDeleting, setIncomeDeleting] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [profileDeleting, setProfileDeleting] = useState(false);

  const dirty = useMemo(
    () =>
      budget !== initialBudget ||
      defaultCurrency !== settings.defaultCurrency ||
      payday !== settings.payday ||
      defaultAccountId !== settings.defaultAccountId ||
      profileName !== (settings.profileName ?? "") ||
      profileEmail !== (settings.profileEmail ?? "") ||
      profilePhone !== initialProfilePhone ||
      avatarDataUrl !== (settings.avatarDataUrl ?? ""),
    [
      avatarDataUrl,
      budget,
      defaultAccountId,
      defaultCurrency,
      initialBudget,
      initialProfilePhone,
      payday,
      profileEmail,
      profileName,
      profilePhone,
      settings,
    ],
  );

  const budgetMeta = CURRENCY_META[display.currency];
  const budgetFormatted = formatNumericInput(
    budgetMeta.decimals > 0
      ? budget.toFixed(budgetMeta.decimals)
      : String(Math.round(budget)),
    budgetMeta.decimals > 0,
  );
  const budgetPlaceholder = formatNumericInput(
    budgetMeta.decimals > 0 ? (3_000_000).toFixed(budgetMeta.decimals) : "3000000",
    budgetMeta.decimals > 0,
  );
  const actualBySource = useMemo(
    () =>
      new Map(
        overview.earnings.sources.map((source) => [
          source.id,
          source.actualMonthUgx,
        ]),
      ),
    [overview],
  );
  const incomeCategoryLabel = (id: string) =>
    income.find((category) => category.id === id)?.label ?? id;
  const incomeAccountName = (id: string) =>
    accounts.find((account) => account.id === id)?.name ?? id;

  function discard() {
    setBudget(initialBudget);
    setBudgetDraft(null);
    setDefaultCurrency(settings.defaultCurrency);
    setPayday(settings.payday);
    setDefaultAccountId(settings.defaultAccountId);
    setProfileName(settings.profileName ?? "");
    setProfileEmail(settings.profileEmail ?? "");
    setProfilePhone(
      formatPhoneNumber(settings.profilePhone ?? "", settings.defaultCurrency),
    );
    setAvatarDataUrl(settings.avatarDataUrl ?? "");
  }

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (
        new URLSearchParams(window.location.search).get("danger") === "1"
      ) {
        setDeleteAccountOpen(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!anchor || anchor.target === "_blank") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty]);

  async function save(): Promise<boolean> {
    if (!profileName.trim() || !profileEmail.includes("@")) {
      gooeyToast.error("Check your profile", {
        description: "A display name and valid email are required.",
      });
      return false;
    }
    setSaving(true);
    try {
      if (overallBudget) {
        await api.patch(`/api/budgets/${overallBudget.id}`, {
          limitUgx: budget,
        });
      } else {
        await api.post("/api/budgets", {
          name: "Overall",
          categoryId: "all",
          limitUgx: budget,
          period: "monthly",
          color: "oklch(0.56 0.14 152)",
        });
      }
      await api.patch("/api/settings", {
        defaultCurrency,
        payday,
        defaultAccountId,
        profileName: profileName.trim(),
        profileEmail: profileEmail.trim(),
        profilePhone: profilePhone.trim(),
        avatarDataUrl,
      });
      gooeyToast.success("Settings updated", {
        description: "Your preferences and money defaults are up to date.",
      });
      onSaved();
      refreshBudgets();
      refreshOverview();
      bumpVersion();
      display.refresh();
      return true;
    } catch (error) {
      gooeyToast.error("Could not save settings", {
        description: (error as Error).message,
      });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveAndLeave() {
    const savedOk = await save();
    if (!savedOk || !pendingHref) return;
    const href = pendingHref;
    setPendingHref(null);
    router.push(href);
  }

  function leaveWithoutSaving() {
    if (!pendingHref) return;
    const href = pendingHref;
    setPendingHref(null);
    router.push(href);
  }

  function openAccount(account: Account | null) {
    setEditingAccount(account);
    setAccountModalOpen(true);
  }

  function closeAccount() {
    setAccountModalOpen(false);
    setEditingAccount(null);
  }

  function openCategory(category: CategoryRecord | null) {
    setEditingCategory(category);
    setCategoryModalOpen(true);
  }

  function closeCategory() {
    setCategoryModalOpen(false);
    setEditingCategory(null);
  }

  async function confirmRemoveAccount() {
    if (!deletingAccount) return;
    if (
      deletingAccount.id === settings.defaultAccountId ||
      deletingAccount.id === defaultAccountId
    ) {
      gooeyToast.error("Default account required", {
        description: "Choose another default account before removing this one.",
      });
      return;
    }
    if (incomeSources.some((source) => source.accountId === deletingAccount.id)) {
      gooeyToast.error("Income source uses this account", {
        description: "Move those income sources to another account first.",
      });
      return;
    }
    setAccountDeleting(true);
    try {
      await api.delete(`/api/accounts/${deletingAccount.id}`);
      gooeyToast.success(`${deletingAccount.name} removed`, {
        description: "Its transactions remain in the ledger.",
      });
      refreshAccounts();
      bumpVersion();
      setDeletingAccount(null);
    } catch (error) {
      gooeyToast.error("Could not remove account", {
        description: (error as Error).message,
      });
    } finally {
      setAccountDeleting(false);
    }
  }

  async function removeCategory() {
    if (!deletingCategory || categoryDeleting) return;
    setCategoryDeleting(true);
    try {
      await api.delete(`/api/categories/${deletingCategory.id}`);
      gooeyToast.success("Category removed", {
        description: `${deletingCategory.label} is no longer available.`,
      });
      refreshCategories();
      bumpVersion();
      setDeletingCategory(null);
    } catch (error) {
      gooeyToast.error("Could not remove category", {
        description: (error as Error).message,
      });
    } finally {
      setCategoryDeleting(false);
    }
  }

  async function removeIncome() {
    if (!deletingIncome || incomeDeleting) return;
    setIncomeDeleting(true);
    try {
      await api.delete(`/api/income-sources/${deletingIncome.id}`);
      gooeyToast.success("Income source removed", {
        description: `${deletingIncome.name} is no longer in expected earnings.`,
      });
      refreshIncomeSources();
      refreshOverview();
      bumpVersion();
      setDeletingIncome(null);
    } catch (error) {
      gooeyToast.error("Could not remove income source", {
        description: (error as Error).message,
      });
    } finally {
      setIncomeDeleting(false);
    }
  }

  function deleteProfileAccount() {
    if (profileDeleting) return;
    setProfileDeleting(true);
    window.setTimeout(() => {
      gooeyToast.success("Account deleted", {
        description: "Your session and onboarding progress were cleared.",
      });
      logout();
      try {
        window.localStorage.removeItem(DRAFT_KEY);
        window.localStorage.removeItem(COMPLETE_KEY);
      } catch {
        // Local storage may be unavailable; the session is already cleared.
      }
      router.push("/");
    }, 650);
  }

  function readAvatar(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      gooeyToast.error("Choose an image file");
      return;
    }
    if (file.size > 1_500_000) {
      gooeyToast.error("Avatar is too large", {
        description: "Choose an image under 1.5 MB.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  return (
    <>
      <PageReveal className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl leading-none tracking-[-0.03em] md:text-3xl">
            Make it yours.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Profile, earnings, money defaults, accounts and the categories
            behind every page.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <SectionPanel
          title="Profile"
          info="Your display name, email, phone and avatar for this account."
          hint="The identity attached to this ledger"
          className="col-span-12 lg:col-span-7"
          bodyClassName="p-5"
        >
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="grid size-20 place-items-center overflow-hidden rounded-full bg-muted text-xl font-semibold text-muted-foreground">
                {avatarDataUrl ? (
                  <div
                    className="size-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${avatarDataUrl})` }}
                  />
                ) : (
                  initials(profileName)
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Icon icon={Upload01Icon} className="size-3.5" />
                Change avatar
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    readAvatar(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              {avatarDataUrl ? (
                <button
                  type="button"
                  onClick={() => setAvatarDataUrl("")}
                  className="text-[11px] text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="grid min-w-0 flex-1 gap-4">
              <Input
                label="Display name"
                value={profileName}
                onChange={setProfileName}
                placeholder="Your name"
              />
              <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <Input
                  label="Email"
                  value={profileEmail}
                  onChange={setProfileEmail}
                  placeholder="you@example.com"
                />
                <Input
                  label="Phone"
                  value={profilePhone}
                  onChange={(value) =>
                    setProfilePhone(
                      formatPhoneNumber(value, defaultCurrency),
                    )
                  }
                  placeholder={PHONE_FORMATS[defaultCurrency].placeholder}
                  inputMode="tel"
                />
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Preferences"
          info="Appearance and the currency used for symbols and number formatting."
          hint="Appearance and currency defaults"
          className="col-span-12 lg:col-span-5"
          bodyClassName="p-5"
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[13px]">Theme</p>
                <p className="text-[11px] text-muted-foreground">
                  Light or dark, no system surprises
                </p>
              </div>
              <ThemeToggle
                variant="circle-blur"
                className="size-10 rounded-xl"
                iconClassName="size-4"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[13px] text-muted-foreground">Currency:</p>
              <DropdownSelect
                value={defaultCurrency}
                onValueChange={(value) => {
                  const next = value as Currency;
                  setDefaultCurrency(next);
                  setProfilePhone((current) =>
                    formatPhoneNumber(current, next),
                  );
                }}
                ariaLabel="Default currency"
                className="w-44 min-[360px]:w-60"
                options={CURRENCY_OPTIONS}
              />
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Money defaults"
          info="The monthly budget and payday that drive Home, Stats and Plan."
          hint="The one budget shared across the app"
          className="col-span-12"
          bodyClassName="p-5"
        >
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
            <div className="space-y-5">
              <Input
                label={`Monthly budget (${display.unit})`}
                value={budgetDraft ?? budgetFormatted}
                onFocus={() => setBudgetDraft(String(Math.round(budget)))}
                onBlur={() => setBudgetDraft(null)}
                onChange={(value) => {
                  const digits = value.replace(/[^\d]/g, "");
                  setBudgetDraft(digits);
                  setBudget(digits ? Number(digits) : 0);
                }}
                inputMode="numeric"
                placeholder={budgetPlaceholder}
              />
            </div>

            <div className="flex flex-col gap-1.5 lg:w-64 lg:justify-self-end">
              <p className="px-1 text-sm font-medium text-foreground">
                Payday of the month
              </p>
              <WheelPicker
                options={Array.from({ length: 31 }, (_, index) =>
                  String(index + 1),
                )}
                value={String(payday)}
                onValueChange={(value) => setPayday(Number(value))}
                visibleCount={3}
                itemHeight={34}
                className="w-full border-0 bg-transparent"
                aria-label="Payday of the month"
              />
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Earnings"
          info="Expected income sources compared with actual income recorded this month."
          hint={`${display.formatMoney(overview.earnings.expectedMonthlyUgx)} expected · ${display.formatMoney(overview.earnings.actualMonthUgx)} actual`}
          className="col-span-12"
          bodyClassName="p-4"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingIncome(null);
                setIncomeModalOpen(true);
              }}
            >
              <Icon icon={PlusSignIcon} className="size-4" /> Add source
            </Button>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              compact
              label="Expected monthly"
              info="Expected income from all active sources."
              value={overview.earnings.expectedMonthlyUgx}
              foot="From active income sources"
              icon={Money03Icon}
              tone="emerald"
            />
            <MetricCard
              compact
              label="Actual this month"
              info="Income recorded in the current month."
              value={overview.earnings.actualMonthUgx}
              foot={`${display.formatMoney(overview.earnings.actualAllTimeUgx)} all time`}
              icon={Tick02Icon}
              tone="sky"
            />
            <MetricCard
              compact
              label="Variance"
              info="Actual income minus expected monthly income."
              value={
                overview.earnings.actualMonthUgx -
                overview.earnings.expectedMonthlyUgx
              }
              foot="Actual minus expected"
              icon={ChartIncreaseIcon}
              tone={
                overview.earnings.actualMonthUgx -
                  overview.earnings.expectedMonthlyUgx <
                0
                  ? "rose"
                  : "emerald"
              }
            />
          </div>

          {incomeSources.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No income sources yet. Add your salary, freelance work or side
              hustle to build an expected earnings baseline.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {incomeSources.map((source) => {
                const actual = actualBySource.get(source.id) ?? 0;
                return (
                  <li
                    key={source.id}
                    className="flex flex-wrap items-center gap-3 px-2 py-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Icon icon={Money03Icon} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px]">{source.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {incomeCategoryLabel(source.categoryId)} ·{" "}
                        {incomeAccountName(source.accountId)} ·{" "}
                        {source.cadence === "fixed" ? "Fixed" : "Irregular"}
                        {source.payday ? ` · day ${source.payday}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">
                        {display.formatMoney(actual)} actual
                      </p>
                      <p className="text-[12px] font-medium">
                        {display.formatMoney(source.expectedMonthlyUgx)}{" "}
                        expected
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setEditingIncome(source);
                        setIncomeModalOpen(true);
                      }}
                      aria-label={`Edit ${source.name}`}
                    >
                      <Icon icon={PencilEdit01Icon} className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeletingIncome(source)}
                      aria-label={`Delete ${source.name}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Icon icon={Delete02Icon} className="size-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionPanel>

        <SectionPanel
          title="Accounts"
          info="Cash, bank and mobile money wallets included in balances."
          hint={`${formatNumber(accounts.length)} wallets · ${display.formatMoney(
            accounts.reduce((total, account) => total + account.balanceUgx, 0),
          )}`}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAccount(null)}
            >
              <Icon icon={PlusSignIcon} className="size-4" /> Add account
            </Button>
          }
          className="col-span-12"
          bodyClassName="p-4"
        >
          <ul className="divide-y divide-border">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center gap-3 px-2 py-3"
              >
                <span
                  className="grid size-8 place-items-center"
                >
                  <Icon
                    icon={accountIcon(account.type)}
                    className="size-3.5"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px]">{account.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {account.provider ?? account.type}
                  </p>
                </div>
                <Money value={account.balanceUgx} size="sm" />
                {account.id === defaultAccountId ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Default
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDefaultAccountId(account.id)}
                    aria-label={`Set ${account.name} as default`}
                    className="px-2"
                  >
                    <Icon icon={Tick02Icon} className="size-3.5 sm:hidden" />
                    <span className="hidden sm:inline">Set default</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openAccount(account)}
                  aria-label={`Edit ${account.name}`}
                >
                  <Icon icon={PencilEdit01Icon} className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeletingAccount(account)}
                  aria-label={`Remove ${account.name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Icon icon={Delete02Icon} className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </SectionPanel>

        <SectionPanel
          title="Categories"
          info="Labels, colors and icons used by entries, selectors and charts."
          hint="Editable labels, colors and icons"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => openCategory(null)}
            >
              <Icon icon={PlusSignIcon} className="size-4" /> Add category
            </Button>
          }
          className="col-span-12"
          bodyClassName="p-4"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <CategoryColumn
              title="Expenses"
              categories={expense}
              onEdit={openCategory}
              onDelete={setDeletingCategory}
            />
            <CategoryColumn
              title="Income"
              categories={income}
              onEdit={openCategory}
              onDelete={setDeletingCategory}
            />
          </div>
        </SectionPanel>

        <SectionPanel
          title="Sign out"
          info="End this session on this device."
          hint="You can sign back in with any email"
          className="col-span-12"
          bodyClassName="p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium">End this session</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Signing out clears your session but keeps your local data.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              Sign out
            </Button>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Danger zone"
          info="Permanently clear this account and its onboarding progress."
          hint="This cannot be undone"
          className="col-span-12 border-destructive/20"
          bodyClassName="p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-medium text-destructive">
                Delete account
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Clears your session and onboarding progress. Your local data
                stays in place.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteAccountOpen(true)}
            >
              <Icon icon={Delete02Icon} className="size-4" />
              Delete account
            </Button>
          </div>
        </SectionPanel>
      </div>

      <MorphingModal
        viewId={pendingHref ? "unsaved-changes" : null}
        onClose={() => setPendingHref(null)}
        placement="center"
        className="max-w-sm"
        contentClassName="p-1"
        ariaLabel="Unsaved changes"
      >
        {pendingHref ? (
          <div className="flex flex-col">
            <ModalSurface>
              <ModalHeading
                title="Save your changes first?"
                hint="You have unsaved settings. Save them before leaving, or leave without saving."
              />
            </ModalSurface>
            <div className="mt-1 flex shrink-0 flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                onClick={() => setPendingHref(null)}
                disabled={saving}
              >
                Stay
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={leaveWithoutSaving}
                  disabled={saving}
                >
                  Leave without saving
                </Button>
                <Button onClick={saveAndLeave} loading={saving}>
                  <Icon icon={Tick02Icon} className="size-4" />
                  Save and leave
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </MorphingModal>

      <MorphingModal
        viewId={accountModalOpen ? "account" : null}
        onClose={closeAccount}
        placement="center"
        className="max-w-md"
        contentClassName="p-1"
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

      <MorphingModal
        viewId={categoryModalOpen ? "category" : null}
        onClose={closeCategory}
        placement="center"
        className="max-w-md"
        contentClassName="p-1"
        ariaLabel={editingCategory ? "Edit category" : "Add category"}
      >
        {categoryModalOpen ? (
          <CategoryForm
            key={editingCategory?.id ?? "new-category"}
            category={editingCategory}
            onSaved={() => {
              refreshCategories();
              bumpVersion();
              closeCategory();
            }}
            onCancel={closeCategory}
          />
        ) : null}
      </MorphingModal>

      <MorphingModal
        viewId={deletingCategory ? "delete-category" : null}
        onClose={() => {
          if (!categoryDeleting) setDeletingCategory(null);
        }}
        placement="center"
        className="max-w-sm"
        contentClassName="p-1"
        ariaLabel="Delete category"
      >
        {deletingCategory ? (
          <ModalConfirm
            title={`Delete ${deletingCategory.label}?`}
            description="Categories used by transactions or budgets cannot be removed."
            loading={categoryDeleting}
            onCancel={() => setDeletingCategory(null)}
            onConfirm={removeCategory}
          />
        ) : null}
      </MorphingModal>

      <MorphingModal
        viewId={deletingAccount ? "delete-account" : null}
        onClose={() => {
          if (!accountDeleting) setDeletingAccount(null);
        }}
        placement="center"
        className="max-w-sm"
        contentClassName="p-1"
        ariaLabel="Remove account"
      >
        {deletingAccount ? (
          <OtpDeleteDialog
            key={deletingAccount.id}
            title={`Remove ${deletingAccount.name}?`}
            description="The account disappears from balances. Its transactions remain in the ledger."
            email={profileEmail}
            confirmLabel="Remove account"
            loading={accountDeleting}
            onClose={() => setDeletingAccount(null)}
            onConfirm={confirmRemoveAccount}
          />
        ) : null}
      </MorphingModal>

      <MorphingModal
        viewId={incomeModalOpen ? "income-source" : null}
        onClose={() => {
          setIncomeModalOpen(false);
          setEditingIncome(null);
        }}
        placement="center"
        className="max-w-md"
        contentClassName="p-1"
        ariaLabel={editingIncome ? "Edit income source" : "Add income source"}
      >
        {incomeModalOpen ? (
          <IncomeSourceForm
            key={editingIncome?.id ?? "new-income-source"}
            source={editingIncome}
            categories={income}
            accounts={accounts}
            defaultAccountId={settings.defaultAccountId}
            onSaved={() => {
              refreshIncomeSources();
              refreshOverview();
              bumpVersion();
              setIncomeModalOpen(false);
              setEditingIncome(null);
            }}
            onCancel={() => {
              setIncomeModalOpen(false);
              setEditingIncome(null);
            }}
          />
        ) : null}
      </MorphingModal>

      <MorphingModal
        viewId={deletingIncome ? "delete-income-source" : null}
        onClose={() => {
          if (!incomeDeleting) setDeletingIncome(null);
        }}
        placement="center"
        className="max-w-sm"
        contentClassName="p-1"
        ariaLabel="Delete income source"
      >
        {deletingIncome ? (
          <ModalConfirm
            title={`Delete ${deletingIncome.name}?`}
            description="It will be removed from expected earnings. Actual income transactions stay in the ledger."
            loading={incomeDeleting}
            onCancel={() => setDeletingIncome(null)}
            onConfirm={removeIncome}
          />
        ) : null}
      </MorphingModal>

      <MorphingModal
        viewId={deleteAccountOpen ? "delete-profile" : null}
        onClose={() => {
          if (!profileDeleting) setDeleteAccountOpen(false);
        }}
        placement="center"
        className="max-w-sm"
        contentClassName="p-1"
        ariaLabel="Delete account"
      >
        {deleteAccountOpen ? (
          <OtpDeleteDialog
            title="Delete your account?"
            description="This clears your session and onboarding progress. Your local data stays in place."
            email={profileEmail}
            confirmLabel="Delete account"
            loading={profileDeleting}
            onClose={() => setDeleteAccountOpen(false)}
            onConfirm={deleteProfileAccount}
          />
        ) : null}
      </MorphingModal>
    </PageReveal>

    <AnimatePresence>
      {dirty ? (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed inset-x-0 bottom-[70px] z-[60] flex justify-center px-4"
        >
          <div className="flex items-center gap-1.5 rounded-full border border-foreground/10 bg-background/95 p-1.5 shadow-2xl backdrop-blur-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={discard}
              disabled={saving}
            >
              Discard
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              <Icon icon={Tick02Icon} className="size-3.5" />
              Save changes
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    </>
  );
}

function OtpDeleteDialog({
  title,
  description,
  email,
  confirmLabel,
  loading,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  email: string;
  confirmLabel: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [step, setStep] = useState<"confirm" | "otp">("confirm");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);

  const valid = otp.length >= 4;

  async function sendCode() {
    if (sending) return;
    setSending(true);
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    setSending(false);
    setStep("otp");
    gooeyToast.success("Verification code sent", {
      description: `We sent a 6-digit code to ${email}.`,
    });
  }

  return (
    <div className="flex flex-col">
      <ModalSurface>
        <AnimatePresence initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
            {step === "confirm" ? (
              <>
                <ModalHeading
                  title="Are you sure?"
                  hint={`${title} ${description}`}
                />
                <div className="rounded-xl bg-destructive/10 p-3 text-[11px] leading-relaxed text-destructive">
                  We&apos;ll send a verification code to{" "}
                  <span className="font-medium">{email}</span> first. Nothing
                  is deleted until you confirm the code.
                </div>
              </>
            ) : (
              <>
                <ModalHeading title={title} hint={description} />

                <div className="rounded-xl border border-border bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  A verification code was sent to{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                </div>

                <Input
                  label="Verification code"
                  value={otp}
                  onChange={(value) =>
                    setOtp(value.replace(/[^0-9]/g, "").slice(0, 6))
                  }
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoFocus
                />

                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() =>
                      gooeyToast.success("Code resent", {
                        description: `We sent another code to ${email}.`,
                      })
                    }
                    className="text-[11px] text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
                  >
                    Resend code
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </ModalSurface>

      <div className="mt-1 flex shrink-0 items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={loading || sending}
        >
          <Icon icon={Cancel01Icon} className="size-4" /> Cancel
        </Button>
        {step === "confirm" ? (
          <Button
            onClick={sendCode}
            loading={sending}
            disabled={sending}
            className="min-w-32"
          >
            Send code
          </Button>
        ) : (
          <Button
            variant="destructive"
            onClick={onConfirm}
            loading={loading}
            disabled={!valid}
            className="min-w-32"
          >
            <Icon icon={Delete02Icon} className="size-4" /> {confirmLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function IncomeSourceForm({
  source,
  categories,
  accounts,
  defaultAccountId,
  onSaved,
  onCancel,
}: {
  source: IncomeSource | null;
  categories: ReturnType<typeof useCategories>["income"];
  accounts: AccountBalance[];
  defaultAccountId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const display = useCurrency();
  const [name, setName] = useState(source?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    source?.categoryId ?? categories[0]?.id ?? "",
  );
  const [accountId, setAccountId] = useState(
    source?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? "",
  );
  const [expected, setExpected] = useState(
    source ? formatNumericInput(String(source.expectedMonthlyUgx)) : "",
  );
  const [cadence, setCadence] = useState<IncomeSource["cadence"]>(
    source?.cadence ?? "fixed",
  );
  const [payday, setPayday] = useState(
    source?.payday ? String(source.payday) : "",
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    const expectedMonthlyUgx = parseNumericInput(expected);
    if (
      !name.trim() ||
      !categoryId ||
      !accountId ||
      !Number.isFinite(expectedMonthlyUgx) ||
      expectedMonthlyUgx < 0 ||
      saving
    ) {
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        categoryId,
        accountId,
        expectedMonthlyUgx: Math.round(expectedMonthlyUgx),
        cadence,
        payday:
          cadence === "fixed" && payday
            ? Math.max(1, Math.min(31, Number(payday)))
            : null,
        active: source?.active ?? true,
      };
      if (source) {
        await api.patch(`/api/income-sources/${source.id}`, payload);
      } else {
        await api.post("/api/income-sources", payload);
      }
      gooeyToast.success(source ? "Income source updated" : "Income source added", {
        description: `${name.trim()} is included in expected earnings.`,
      });
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save income source", {
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalForm
      title={source ? "Edit income source" : "Add income source"}
      hint="Expected monthly income, where it lands and how often it arrives."
      onCancel={onCancel}
      onSubmit={submit}
      saving={saving}
      editing={Boolean(source)}
      submitLabel={source ? "Save source" : "Add source"}
      disabled={!name.trim()}
    >
      <Input
        label="Name"
        value={name}
        onChange={setName}
        placeholder="Salary, freelance retainer, side hustle"
      />

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">Category:</p>
        <DropdownSelect
          value={categoryId}
          onValueChange={setCategoryId}
          ariaLabel="Income category"
          className="w-40 min-[360px]:w-52"
          options={categories.map((category) => ({
            value: category.id,
            label: category.label,
          }))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">Lands in:</p>
        <DropdownSelect
          value={accountId}
          onValueChange={setAccountId}
          ariaLabel="Income account"
          className="w-40 min-[360px]:w-52"
          options={accounts.map((account) => ({
            value: account.id,
            label: account.name,
          }))}
        />
      </div>

      <Input
        label={`Expected monthly (${display.unit})`}
        value={expected}
        onChange={(value) => setExpected(formatNumericInput(value))}
        placeholder="0"
      />

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">Cadence:</p>
        <DropdownSelect
          value={cadence}
          onValueChange={(value) =>
            setCadence(value as IncomeSource["cadence"])
          }
          ariaLabel="Income cadence"
          className="w-40 min-[360px]:w-52"
          options={[
            { value: "fixed", label: "Fixed" },
            { value: "irregular", label: "Irregular" },
          ]}
        />
      </div>

      {cadence === "fixed" ? (
        <Input
          label="Payday (optional)"
          value={payday}
          onChange={(value) => setPayday(formatNumericInput(value))}
          placeholder="28"
        />
      ) : null}
    </ModalForm>
  );
}

function initials(name: string | undefined) {  return (name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function CategoryColumn({
  title,
  categories,
  onEdit,
  onDelete,
}: {
  title: string;
  categories: ReturnType<typeof useCategories>["expense"];
  onEdit: (category: CategoryRecord) => void;
  onDelete: (category: CategoryRecord) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <ul className="divide-y divide-foreground/5">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex items-center gap-2 px-2 py-2"
          >
            <span
              className="grid size-7 shrink-0 place-items-center"
            >
              <Icon icon={category.icon} className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px]">
              {category.label}
            </span>
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: category.color }}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(category)}
              aria-label={`Edit ${category.label}`}
            >
              <Icon icon={PencilEdit01Icon} className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(category)}
              aria-label={`Delete ${category.label}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Icon icon={Delete02Icon} className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryForm({
  category,
  onSaved,
  onCancel,
}: {
  category: CategoryRecord | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(category?.label ?? "");
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "expense");
  const [color, setColor] = useState(
    category?.color ?? CATEGORY_COLORS[0],
  );
  const [iconKey, setIconKey] = useState<CategoryIconKey>(
    category?.iconKey ?? "package",
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!label.trim() || saving) return;
    setSaving(true);
    try {
      if (category) {
        await api.patch(`/api/categories/${category.id}`, {
          label: label.trim(),
          color,
          iconKey,
        });
        gooeyToast.success("Category updated", {
          description: `${label.trim()} is updated across the app.`,
        });
      } else {
        await api.post("/api/categories", {
          label: label.trim(),
          kind,
          color,
          iconKey,
        });
        gooeyToast.success("Category added", {
          description: `${label.trim()} is ready for new entries.`,
        });
      }
      onSaved();
    } catch (error) {
      gooeyToast.error("Could not save category", {
        description: (error as Error).message,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalForm
      title={category ? "Edit category" : "Add category"}
      hint="Name, type, color and icon used across charts."
      onCancel={onCancel}
      onSubmit={submit}
      saving={saving}
      editing={Boolean(category)}
      submitLabel={category ? "Save category" : "Add category"}
      disabled={!label.trim()}
    >
      <Input
        label="Name"
        value={label}
        onChange={setLabel}
        placeholder="Groceries"
      />

      {!category ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[13px] text-muted-foreground">Type:</p>
          <DropdownSelect
            value={kind}
            onValueChange={(value) => setKind(value as CategoryKind)}
            ariaLabel="Category type"
            className="w-40 min-[360px]:w-52"
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
          />
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-[13px] text-muted-foreground">Color</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setColor(option)}
              aria-label={`Use color ${option}`}
              className={cn(
                "size-7 rounded-full border-2 transition-transform",
                color === option
                  ? "scale-110 border-foreground"
                  : "border-transparent",
              )}
              style={{ background: option }}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-[13px] text-muted-foreground">Icon</p>
        <div className="grid grid-cols-6 gap-1.5">
          {CATEGORY_ICON_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setIconKey(option.key)}
              aria-label={`Use ${option.label} icon`}
              className={cn(
                "grid aspect-square place-items-center rounded-lg border transition-colors",
                iconKey === option.key
                  ? "border-foreground/30 bg-muted text-foreground"
                  : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon icon={CATEGORY_ICONS[option.key]} className="size-4" />
            </button>
          ))}
        </div>
      </div>
    </ModalForm>
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
  const display = useCurrency();
  const decimals = CURRENCY_META[display.currency].decimals;
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "cash");
  const [provider, setProvider] = useState(account?.provider ?? "");
  const [openingBalance, setOpeningBalance] = useState(
    account
      ? formatNumericInput(String(account.openingBalanceUgx), decimals > 0)
      : "0",
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || saving) return;
    const openingBalanceUgx = Math.round(parseNumericInput(openingBalance));
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        type,
        provider: type === "momo" ? provider.trim() || undefined : undefined,
        openingBalanceUgx,
      };
      if (account) {
        await api.patch(`/api/accounts/${account.id}`, payload);
        gooeyToast.success("Account updated", {
          description: `${name.trim()} is synced across your ledger.`,
        });
      } else {
        await api.post("/api/accounts", payload);
        gooeyToast.success("Account added", {
          description: `${name.trim()} is ready with a ${display.formatMoney(
            openingBalanceUgx,
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
    <ModalForm
      title={account ? "Edit account" : "Add account"}
      hint="Cash, bank, or a Mobile Money wallet."
      onCancel={onCancel}
      onSubmit={submit}
      saving={saving}
      editing={Boolean(account)}
      submitLabel={account ? "Save account" : "Add account"}
      disabled={!name.trim()}
    >
      <Input
        label="Name"
        value={name}
        onChange={setName}
        placeholder="MTN MoMo"
      />

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-[13px] text-muted-foreground">Type:</p>
        <DropdownSelect
          value={type}
          onValueChange={(value) => setType(value as AccountType)}
          ariaLabel="Account type"
          className="w-40 min-[360px]:w-52"
          options={ACCOUNT_TYPES}
        />
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
        label={`Opening balance (${display.unit})`}
        value={openingBalance}
        onChange={(value) =>
          setOpeningBalance(formatNumericInput(value, decimals > 0))
        }
        placeholder="0"
      />
    </ModalForm>
  );
}
