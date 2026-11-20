"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { gooeyToast } from "goey-toast";
import {
  Delete02Icon,
  PencilEdit01Icon,
  PlusSignIcon,
  Tick02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { AccountSelect, accountIcon } from "@/components/account-select";
import { useCategories } from "@/components/categories-provider";
import { useCurrency } from "@/components/currency-provider";
import { DropdownSelect } from "@/components/dropdown-select";
import { InlineSlider } from "@/components/motion/range-slider-inline";
import { Input } from "@/components/motion/input";
import { ThemeToggle } from "@/components/motion/theme-toggle";
import { WheelPicker } from "@/components/motion/wheel-picker";
import { MorphingModal } from "@/components/motion/morphing-modal";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/huge-icon";
import { Money } from "@/components/money";
import { SectionPanel } from "@/components/panel";
import { PageLoader } from "@/components/page-loader";
import { useApi, api } from "@/lib/use-api";
import { useTransactionDialog } from "@/components/expense-dialog";
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
import type {
  Account,
  AccountBalance,
  AccountType,
  Currency,
  Settings,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { version, bumpVersion } = useTransactionDialog();
  const { data, loading, refresh } = useApi<Settings>("/api/settings");
  const { data: accountsData, refresh: refreshAccounts } = useApi<
    AccountBalance[]
  >(`/api/accounts?v=${version}`);

  if (loading && !data) {
    return <PageLoader variant="helix" size={30} />;
  }
  if (!data) return null;

  return (
    <SettingsForm
      settings={data}
      accounts={accountsData ?? []}
      onSaved={refresh}
      refreshAccounts={refreshAccounts}
      bumpVersion={bumpVersion}
    />
  );
}

function SettingsForm({
  settings,
  accounts,
  onSaved,
  refreshAccounts,
  bumpVersion,
}: {
  settings: Settings;
  accounts: AccountBalance[];
  onSaved: () => void;
  refreshAccounts: () => void;
  bumpVersion: () => void;
}) {
  const { expense, income, refresh: refreshCategories } = useCategories();
  const display = useCurrency();
  const router = useRouter();
  const [budget, setBudget] = useState(settings.monthlyBudget);
  const [rate, setRate] = useState(
    formatNumericInput(String(settings.usdRate), true),
  );
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>(
    settings.defaultCurrency,
  );
  const [payday, setPayday] = useState(settings.payday);
  const [buffer, setBuffer] = useState(settings.forecastBufferUgx);
  const [defaultAccountId, setDefaultAccountId] = useState(
    settings.defaultAccountId,
  );
  const [profileName, setProfileName] = useState(settings.profileName ?? "");
  const [profileEmail, setProfileEmail] = useState(
    settings.profileEmail ?? "",
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

  const dirty = useMemo(
    () =>
      budget !== settings.monthlyBudget ||
      (parseNumericInput(rate) || 0) !== settings.usdRate ||
      defaultCurrency !== settings.defaultCurrency ||
      payday !== settings.payday ||
      buffer !== settings.forecastBufferUgx ||
      defaultAccountId !== settings.defaultAccountId ||
      profileName !== (settings.profileName ?? "") ||
      profileEmail !== (settings.profileEmail ?? "") ||
      avatarDataUrl !== (settings.avatarDataUrl ?? ""),
    [
      avatarDataUrl,
      budget,
      buffer,
      defaultAccountId,
      defaultCurrency,
      payday,
      profileEmail,
      profileName,
      rate,
      settings,
    ],
  );

  function discard() {
    setBudget(settings.monthlyBudget);
    setRate(formatNumericInput(String(settings.usdRate), true));
    setDefaultCurrency(settings.defaultCurrency);
    setPayday(settings.payday);
    setBuffer(settings.forecastBufferUgx);
    setDefaultAccountId(settings.defaultAccountId);
    setProfileName(settings.profileName ?? "");
    setProfileEmail(settings.profileEmail ?? "");
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
      await api.patch("/api/settings", {
        monthlyBudget: budget,
        usdRate: parseNumericInput(rate) || settings.usdRate,
        defaultCurrency,
        payday,
        forecastBufferUgx: buffer,
        defaultAccountId,
        profileName: profileName.trim(),
        profileEmail: profileEmail.trim(),
        avatarDataUrl,
      });
      gooeyToast.success("Settings updated", {
        description: "Your preferences and money defaults are up to date.",
      });
      onSaved();
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
    if (deletingAccount.id === settings.defaultAccountId) {
      gooeyToast.error("Default account required", {
        description: "Choose another default account before removing this one.",
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
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl leading-none md:text-5xl">
            Make it yours.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Profile, money defaults, accounts and the categories behind every
            chart.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? (
            <span className="text-[11px] text-muted-foreground">
              Unsaved changes
            </span>
          ) : null}
          <Button
            variant="ghost"
            onClick={discard}
            disabled={!dirty || saving}
          >
            Discard
          </Button>
          <Button
            onClick={save}
            loading={saving}
            disabled={!dirty}
          >
            <Icon icon={Tick02Icon} className="size-4" />
            Save changes
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <SectionPanel
          title="Profile"
          info="Your display name, email and avatar for this mock account."
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
              <Input
                label="Email"
                value={profileEmail}
                onChange={setProfileEmail}
                placeholder="you@example.com"
              />
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Preferences"
          info="Appearance, default currency and the USD rate used for display."
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
                className="size-10 rounded-xl border border-border"
                iconClassName="size-4"
              />
            </div>
            <div className="grid grid-cols-[88px_176px] items-center gap-2">
              <p className="text-[13px] text-muted-foreground">Currency</p>
              <div className="flex rounded-full border border-border bg-muted p-0.5">
                {(["UGX", "USD"] as Currency[]).map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => setDefaultCurrency(currency)}
                    className={cn(
                      "flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium transition-colors",
                      defaultCurrency === currency
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground",
                    )}
                  >
                    {currency}
                  </button>
                ))}
              </div>
            </div>
            <Input
              label="USD rate (UGX per 1 USD)"
              value={rate}
              onChange={(value) => setRate(formatNumericInput(value, true))}
              placeholder="3720"
            />
          </div>
        </SectionPanel>

        <SectionPanel
          title="Money defaults"
          info="The monthly budget, payday and forecast buffer that drive Home and Plan."
          hint="Budget, payday and forecast behavior"
          className="col-span-12"
          bodyClassName="p-5"
        >
          <div className="mb-5">
            <Money value={budget} size="xl" />
          </div>
          <InlineSlider
            label="Monthly budget"
            value={budget}
            onValueChange={setBudget}
            min={0}
            max={8_000_000}
            step={50_000}
            format={(value) => display.formatMoney(value)}
            aria-label="Monthly budget"
          />
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <div>
              <p className="mb-2 text-[13px] text-muted-foreground">
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
                className="w-28 border-x-0"
                aria-label="Payday of the month"
              />
            </div>
            <div>
              <InlineSlider
                label="Forecast buffer"
                value={buffer}
                onValueChange={setBuffer}
                min={0}
                max={1_000_000}
                step={25_000}
                format={(value) => display.formatMoney(value)}
                aria-label="Forecast buffer"
              />
            </div>
            <AccountSelect
              label="Default account"
              value={defaultAccountId}
              accounts={accounts}
              onValueChange={setDefaultAccountId}
            />
          </div>
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
          <ul className="grid gap-2 md:grid-cols-2">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center gap-3 rounded-xl border border-foreground/5 px-2 py-2.5"
              >
                <span
                  className="grid size-8 place-items-center rounded-lg"
                  style={{
                    background: `color-mix(in oklab, ${account.color} 14%, transparent)`,
                  }}
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
      </div>

      <MorphingModal
        viewId={pendingHref ? "unsaved-changes" : null}
        onClose={() => setPendingHref(null)}
        placement="center"
        className="max-w-sm"
        ariaLabel="Unsaved changes"
      >
        {pendingHref ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                Save your changes first?
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                You have unsaved settings. Save them before leaving, or leave
                without saving.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => setPendingHref(null)}
                disabled={saving}
              >
                Stay
              </Button>
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
        ) : null}
      </MorphingModal>

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

      <MorphingModal
        viewId={categoryModalOpen ? "category" : null}
        onClose={closeCategory}
        placement="center"
        className="max-w-md"
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
        ariaLabel="Delete category"
      >
        {deletingCategory ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                Delete {deletingCategory.label}?
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                Categories used by transactions or budgets cannot be removed.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => setDeletingCategory(null)}
                disabled={categoryDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={removeCategory}
                loading={categoryDeleting}
              >
                <Icon icon={Delete02Icon} className="size-4" /> Delete
              </Button>
            </div>
          </div>
        ) : null}
      </MorphingModal>

      <MorphingModal
        viewId={deletingAccount ? "delete-account" : null}
        onClose={() => {
          if (!accountDeleting) setDeletingAccount(null);
        }}
        placement="center"
        className="max-w-sm"
        ariaLabel="Remove account"
      >
        {deletingAccount ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                Remove {deletingAccount.name}?
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                The account disappears from balances. Its transactions remain
                in the ledger.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                onClick={() => setDeletingAccount(null)}
                disabled={accountDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmRemoveAccount}
                loading={accountDeleting}
              >
                <Icon icon={Delete02Icon} className="size-4" /> Remove
              </Button>
            </div>
          </div>
        ) : null}
      </MorphingModal>
    </div>
  );
}

function initials(name: string | undefined) {
  return (name ?? "")
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
              className="grid size-7 shrink-0 place-items-center rounded-lg"
              style={{
                background: `color-mix(in oklab, ${category.color} 14%, transparent)`,
              }}
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
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.02em]">
          {category ? "Edit category" : "Add category"}
        </h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Name, type, color and icon used across charts.
        </p>
      </div>

      <Input
        label="Name"
        value={label}
        onChange={setLabel}
        placeholder="Groceries"
      />

      {!category ? (
        <div className="grid grid-cols-[88px_176px] items-center gap-2">
          <p className="text-[13px] text-muted-foreground">Type</p>
          <DropdownSelect
            value={kind}
            onValueChange={(value) => setKind(value as CategoryKind)}
            ariaLabel="Category type"
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

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} loading={saving} disabled={!label.trim()}>
          <Icon icon={Tick02Icon} className="size-4" />
          {category ? "Save category" : "Add category"}
        </Button>
      </div>
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
  const display = useCurrency();
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
          description: `${name.trim()} is ready with a ${display.formatMoney(
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

      <Input
        label="Name"
        value={name}
        onChange={setName}
        placeholder="MTN MoMo"
      />

      <div className="grid grid-cols-[88px_176px] items-center gap-2">
        <p className="text-[13px] text-muted-foreground">Type</p>
        <DropdownSelect
          value={type}
          onValueChange={(value) => setType(value as AccountType)}
          ariaLabel="Account type"
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
        label="Opening balance (UGX)"
        value={openingBalance}
        onChange={(value) => setOpeningBalance(formatNumericInput(value))}
        placeholder="0"
      />

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={submit} loading={saving} disabled={!name.trim()}>
          <Icon icon={Tick02Icon} className="size-4" />
          {account ? "Save account" : "Add account"}
        </Button>
      </div>
    </div>
  );
}
