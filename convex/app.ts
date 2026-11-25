import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { buildStats } from "./stats";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;


const monthKey = (date = new Date()) => ymd(date).slice(0, 7);

const daysInMonth = (key: string) =>
  new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
const sum = (rows: { amountUgx: number }[]) =>
  rows.reduce((total, row) => total + row.amountUgx, 0);

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Sign in to continue.");
  return userId;
}

async function rows(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const [accounts, categories, transactions, budgets, goals, goalContributions, debts, debtPayments, recurring, incomeSources, settings] =
    await Promise.all([
      ctx.db.query("accounts").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("categories").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("transactions").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("budgets").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("goals").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("goalContributions").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("debts").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("debtPayments").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("recurringRules").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("incomeSources").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("settings").withIndex("by_user", (q) => q.eq("userId", userId)).first(),
    ]);
  return { accounts, categories, transactions, budgets, goals, goalContributions, debts, debtPayments, recurring, incomeSources, settings };
}

function shapeAccount(account: Doc<"accounts">, transactions: Doc<"transactions">[]) {
  const outgoing = transactions.filter((t) => t.accountId === account._id);
  const incoming = transactions.filter((t) => t.toAccountId === account._id);
  let balance = account.openingBalanceUgx;
  for (const t of outgoing) {
    if (t.type === "income") balance += t.amountUgx;
    if (t.type === "expense") balance -= t.amountUgx + (t.feeUgx ?? 0);
    if (t.type === "transfer") balance -= t.amountUgx + (t.feeUgx ?? 0);
  }
  for (const t of incoming) if (t.type === "transfer") balance += t.amountUgx;
  return {
    id: account.legacyId ?? account._id,
    name: account.name,
    type: account.type,
    provider: account.provider,
    color: account.color,
    openingBalanceUgx: account.openingBalanceUgx,
    archived: account.archived,
    balanceUgx: balance,
  };
}

function shapeCategory(category: Doc<"categories">) {
  return {
    id: category.legacyId ?? category._id,
    label: category.label,
    color: category.color,
    kind: category.kind,
    iconKey: category.iconKey,
  };
}

function shapeSettings(settings: Doc<"settings"> | null, userId: Id<"users">) {
  return {
    usdRate: settings?.usdRate ?? 3800,
    defaultCurrency: settings?.defaultCurrency ?? "UGX",
    defaultAccountId: settings?.defaultAccountId ?? "",
    payday: settings?.payday ?? 28,
    forecastBufferUgx: settings?.forecastBufferUgx ?? 0,
    weekPlan: {},
    profileName: settings?.profileName ?? "",
    profileEmail: settings?.profileEmail ?? "",
    profilePhone: settings?.profilePhone ?? "",
    avatarDataUrl: settings?.avatarDataUrl ?? "",
    userId,
  };
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export const read = query({
  args: { endpoint: v.string(), params: v.optional(v.any()) },
  handler: async (ctx, { endpoint, params }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const { accounts, categories, transactions, budgets, goals, goalContributions, debts, debtPayments, recurring, incomeSources, settings } =
      await rows(ctx, userId);

    const shapedAccounts = accounts.map((a) => shapeAccount(a, transactions));
    const shapedCategories = categories.map(shapeCategory);
    const shapedTransactions = transactions
      .filter((t) => t.source !== "savings")
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((t) => ({
        id: t._id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        amountUgx: t.amountUgx,
        usdRate: t.usdRate,
        category: categories.find((c) => c._id === t.categoryId)?.legacyId ?? "other",
        accountId: accounts.find((a) => a._id === t.accountId)?.legacyId ?? t.accountId,
        toAccountId: t.toAccountId
          ? accounts.find((a) => a._id === t.toAccountId)?.legacyId ?? t.toAccountId
          : undefined,
        feeUgx: t.feeUgx,
        note: t.note,
        spentOn: t.spentOn,
        spentTime: t.spentTime,
        source: t.source,
        createdAt: new Date(t.createdAt).toISOString(),
      }));

    if (endpoint === "settings") return shapeSettings(settings, userId);
    if (endpoint === "categories") return shapedCategories;
    if (endpoint === "accounts") return shapedAccounts;
    if (endpoint === "transactions") return shapedTransactions;

    if (endpoint === "budgets") {
      const month = typeof params?.month === "string" ? params.month : monthKey();
      return budgets.map((b) => ({
        id: b._id,
        name: b.name,
        categoryId: b.categoryId ? categories.find((c) => c._id === b.categoryId)?.legacyId ?? b.categoryId : "all",
        limitUgx: b.limitUgx,
        period: b.period,
        color: b.color,
        spentUgx: sum(
          transactions.filter(
            (t) =>
              t.type === "expense" &&
              t.spentOn.startsWith(month) &&
              (!b.categoryId || t.categoryId === b.categoryId),
          ),
        ),
      }));
    }

    if (endpoint === "goals") {
      return goals.map((g) => ({
        id: g._id,
        name: g.name,
        targetUgx: g.targetUgx,
        savedUgx: g.savedUgx,
        deadline: g.deadline,
        color: g.color,
        note: g.note,
        accountId: g.accountId
          ? accounts.find((a) => a._id === g.accountId)?.legacyId ?? g.accountId
          : undefined,
        createdAt: new Date(g.createdAt).toISOString(),
      }));
    }

    if (endpoint === "debts") {
      return debts.map((d) => ({
        id: d._id,
        direction: d.direction,
        counterparty: d.counterparty,
        principalUgx: d.principalUgx,
        balanceUgx: d.balanceUgx,
        dueOn: d.dueOn,
        note: d.note,
        createdAt: new Date(d.createdAt).toISOString(),
      }));
    }

    if (endpoint === "recurring") {
      return recurring.map((r) => ({
        id: r._id,
        name: r.name,
        type: r.type,
        amountUgx: r.amountUgx,
        category: categories.find((c) => c._id === r.categoryId)?.legacyId ?? "other",
        accountId: accounts.find((a) => a._id === r.accountId)?.legacyId ?? r.accountId,
        toAccountId: r.toAccountId
          ? accounts.find((a) => a._id === r.toAccountId)?.legacyId ?? r.toAccountId
          : undefined,
        frequency: r.frequency,
        nextOn: r.nextOn,
        enabled: r.enabled,
        note: r.note,
      }));
    }

    if (endpoint === "income-sources") {
      return incomeSources.map((s) => ({
        id: s._id,
        name: s.name,
        categoryId: categories.find((c) => c._id === s.categoryId)?.legacyId ?? s.categoryId,
        accountId: accounts.find((a) => a._id === s.accountId)?.legacyId ?? s.accountId,
        expectedMonthlyUgx: s.expectedMonthlyUgx,
        cadence: s.cadence,
        payday: s.payday,
        active: s.active,
        createdAt: new Date(s.createdAt).toISOString(),
      }));
    }

    if (endpoint === "networth") {
      const assets = shapedAccounts.reduce((t, a) => t + a.balanceUgx, 0) +
        goals.reduce((t, g) => t + g.savedUgx, 0) +
        debts.filter((d) => d.direction === "lent").reduce((t, d) => t + d.balanceUgx, 0);
      const liabilities = debts
        .filter((d) => d.direction === "borrowed")
        .reduce((t, d) => t + d.balanceUgx, 0);
      return { assets, liabilities, total: assets - liabilities, history: [] };
    }

    if (endpoint === "overview") {
      const liquidUgx = shapedAccounts.reduce((t, a) => t + a.balanceUgx, 0);
      const month = monthKey();
      const monthlyExpenses = transactions.filter(
        (t) => t.type === "expense" && t.spentOn.startsWith(month),
      );
      const monthlyIncome = transactions.filter(
        (t) => t.type === "income" && t.spentOn.startsWith(month),
      );
      const budget = budgets.find((b) => b.period === "monthly");
      const limitUgx = budget?.limitUgx ?? 0;
      const today = new Date();
      const payday = settings?.payday ?? 28;
      const daysToPayday = payday >= today.getDate()
        ? payday - today.getDate()
        : daysInMonth(month) - today.getDate() + payday;
      return {
        revision: 1,
        settings: shapeSettings(settings, userId),
        accounts: shapedAccounts,
        totals: {
          liquidUgx,
          goalsSavedUgx: goals.reduce((t, g) => t + g.savedUgx, 0),
          lentUgx: debts.filter((d) => d.direction === "lent").reduce((t, d) => t + d.balanceUgx, 0),
          borrowedUgx: debts.filter((d) => d.direction === "borrowed").reduce((t, d) => t + d.balanceUgx, 0),
          netWorthUgx: liquidUgx,
        },
        budget: {
          limitUgx,
          spentUgx: sum(monthlyExpenses),
          remainingUgx: limitUgx - sum(monthlyExpenses),
        },
        earnings: {
          expectedMonthlyUgx: incomeSources.filter((s) => s.active).reduce((t, s) => t + s.expectedMonthlyUgx, 0),
          actualMonthUgx: sum(monthlyIncome),
          actualAllTimeUgx: sum(transactions.filter((t) => t.type === "income")),
          sources: incomeSources.map((s) => ({
            id: s._id,
            name: s.name,
            categoryId: s.categoryId,
            accountId: s.accountId,
            expectedMonthlyUgx: s.expectedMonthlyUgx,
            actualMonthUgx: sum(
              monthlyIncome.filter((t) => t.categoryId === s.categoryId),
            ),
            cadence: s.cadence,
            active: s.active,
          })),
        },
        payday,
        daysToPayday,
      };
    }

    // Stats and plan activity come from the pure helpers in stats.ts / plan.ts.
    if (endpoint === "stats" || endpoint === "plan/activity") {
      const built = buildStats({
        params,
        userId,
        accounts: shapedAccounts,
        categories: shapedCategories,
        transactions: shapedTransactions,
        budgets,
        goals,
        goalContributions,
        debts,
        debtPayments,
        recurring,
        incomeSources,
        settings: shapeSettings(settings, userId),
      });
      if (endpoint === "plan/activity") return built.activity;
      return built;
    }

    throw new Error(`Unknown read endpoint: ${endpoint}`);
  },
});

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

const TABLES: Record<string, "accounts" | "categories" | "budgets" | "goals" | "debts" | "recurringRules" | "incomeSources" | "settings"> = {
  accounts: "accounts",
  categories: "categories",
  budgets: "budgets",
  goals: "goals",
  debts: "debts",
  recurring: "recurringRules",
  "income-sources": "incomeSources",
  settings: "settings",
};

async function resolveDoc(
  ctx: MutationCtx,
  table: keyof typeof TABLES,
  userId: Id<"users">,
  id: string | undefined,
) {
  if (!id) return null;
  const byLegacy = await ctx.db
    .query(TABLES[table])
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("legacyId"), id))
    .first();
  if (byLegacy) return byLegacy as Doc<"accounts">;
  try {
    return (await ctx.db.get(id as Id<"accounts">)) as Doc<"accounts"> | null;
  } catch {
    return null;
  }
}

function pick(body: Record<string, unknown>, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

export const write = mutation({
  args: {
    endpoint: v.string(),
    method: v.string(),
    id: v.optional(v.string()),
    body: v.optional(v.any()),
  },
  handler: async (ctx, { endpoint, method, id, body }) => {
    const userId = await requireUser(ctx);
    const b = (body ?? {}) as Record<string, unknown>;
    const parts = endpoint.split("?")[0].split("/").filter(Boolean);
    const resource = parts[0] ?? "";
    const table = TABLES[resource];
    const now = Date.now();

    if (resource === "goals" && parts[2] === "contributions" && method === "POST") {
      const goal = (await resolveDoc(ctx, "goals", userId, parts[1])) as unknown as Doc<"goals"> | null;
      if (!goal) throw new Error("Goal not found.");
      const amountUgx = Number(b.amountUgx ?? 0);
      const date = String(b.date ?? todayIso());
      const account = await resolveDoc(
        ctx,
        "accounts",
        userId,
        String(b.accountId ?? goal.accountId ?? ""),
      );
      await ctx.db.insert("goalContributions", {
        userId,
        goalId: goal._id as unknown as Id<"goals">,
        amountUgx,
        date,
        accountId: account?._id,
        note: String(b.note ?? ""),
        createdAt: now,
      });
      if (account) {
        const settings = await ctx.db
          .query("settings")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first();
        await ctx.db.insert("transactions", {
          userId,
          type: "transfer",
          amount: amountUgx,
          currency: "UGX",
          amountUgx,
          usdRate: Number(settings?.usdRate ?? 3800),
          categoryId: undefined,
          accountId: account._id,
          toAccountId: undefined,
          feeUgx: undefined,
          note: `${amountUgx >= 0 ? "Saved to" : "Withdrawn from"} ${goal.name}`,
          spentOn: date,
          spentTime: "12:00",
          source: "savings",
          createdAt: now,
        });
      }
      await ctx.db.patch(goal._id, {
        savedUgx: Number(goal.savedUgx ?? 0) + amountUgx,
      });
      return { ok: true };
    }

    if (resource === "debts" && parts[2] === "payments" && method === "POST") {
      const debt = (await resolveDoc(ctx, "debts", userId, parts[1])) as unknown as Doc<"debts"> | null;
      if (!debt) throw new Error("Debt not found.");
      const amountUgx = Number(b.amountUgx ?? 0);
      await ctx.db.insert("debtPayments", {
        userId,
        debtId: debt._id as unknown as Id<"debts">,
        amountUgx,
        date: String(b.date ?? todayIso()),
        note: String(b.note ?? ""),
        createdAt: now,
      });
      await ctx.db.patch(debt._id, {
        balanceUgx: Math.max(0, Number(debt.balanceUgx ?? 0) - amountUgx),
      });
      return { ok: true };
    }

    if (resource === "recurring" && parts[2] === "run") {
      const settings = await ctx.db
        .query("settings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      const rules = await ctx.db
        .query("recurringRules")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const today = todayIso();
      let created = 0;
      for (const rule of rules) {
        if (!rule.enabled || rule.nextOn > today) continue;
        await ctx.db.insert("transactions", {
          userId,
          type: rule.type,
          amount: rule.amountUgx,
          currency: rule.currency,
          amountUgx: rule.amountUgx,
          usdRate: Number(settings?.usdRate ?? 3800),
          categoryId: rule.categoryId,
          accountId: rule.accountId,
          toAccountId: undefined,
          feeUgx: undefined,
          note: rule.name,
          spentOn: rule.nextOn,
          spentTime: "09:00",
          source: "recurring",
          createdAt: now + created,
        });
        const next = new Date(`${rule.nextOn}T00:00:00`);
        if (rule.frequency === "daily") next.setDate(next.getDate() + 1);
        if (rule.frequency === "weekly") next.setDate(next.getDate() + 7);
        if (rule.frequency === "monthly") next.setMonth(next.getMonth() + 1);
        if (rule.frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
        await ctx.db.patch(rule._id, {
          nextOn: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
        });
        created += 1;
      }
      return { created };
    }

    if (resource === "recurring" && parts[2] === "skip") {
      const rule = (await resolveDoc(ctx, "recurring", userId, parts[1])) as unknown as Doc<"recurringRules"> | null;
      if (!rule) throw new Error("Rule not found.");
      const next = new Date(`${String(b.nextOn ?? rule.nextOn)}T00:00:00`);
      const frequency = rule.frequency;
      if (frequency === "daily") next.setDate(next.getDate() + 1);
      if (frequency === "weekly") next.setDate(next.getDate() + 7);
      if (frequency === "monthly") next.setMonth(next.getMonth() + 1);
      if (frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
      await ctx.db.patch(rule._id, {
        nextOn: `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
      });
      return { ok: true };
    }

    if (resource === "settings" && method === "PATCH") {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      const account = await resolveDoc(ctx, "accounts", userId, String(b.defaultAccountId ?? ""));
      const patch = {
        ...pick(b, ["usdRate", "defaultCurrency", "payday", "forecastBufferUgx", "profileName", "profileEmail", "profilePhone", "avatarDataUrl"]),
        ...(b.defaultAccountId !== undefined ? { defaultAccountId: account?._id } : {}),
      };
      if (existing) await ctx.db.patch(existing._id, patch);
      return { ok: true };
    }

    if (!table) return { unsupported: endpoint, method };

    if (method === "GET") return { ok: true };
    if (method === "POST") {
      const common = { userId, createdAt: now };
      if (resource === "accounts") {
        return await ctx.db.insert("accounts", {
          ...common,
          name: String(b.name ?? "Account"),
          type: (b.type ?? "cash") as "cash" | "bank" | "momo",
          provider: b.provider ? String(b.provider) : undefined,
          color: String(b.color ?? "oklch(0.7 0.08 250)"),
          openingBalanceUgx: Number(b.openingBalanceUgx ?? 0),
        });
      }
      if (resource === "categories") {
        return await ctx.db.insert("categories", {
          ...common,
          label: String(b.label ?? "Category"),
          kind: (b.kind ?? "expense") as "expense" | "income",
          color: String(b.color ?? "oklch(0.7 0.08 250)"),
          iconKey: String(b.iconKey ?? "package"),
        });
      }
      if (resource === "budgets") {
        const category = await resolveDoc(ctx, "categories", userId, String(b.categoryId ?? ""));
        return await ctx.db.insert("budgets", {
          ...common,
          name: String(b.name ?? "Budget"),
          categoryId: category?._id as unknown as Id<"categories"> | undefined,
          limitUgx: Number(b.limitUgx ?? 0),
          period: (b.period ?? "monthly") as "monthly" | "weekly",
          color: String(b.color ?? "oklch(0.56 0.14 152)"),
        });
      }
      if (resource === "goals") {
        const account = await resolveDoc(ctx, "accounts", userId, String(b.accountId ?? ""));
        return await ctx.db.insert("goals", {
          ...common,
          name: String(b.name ?? "Goal"),
          targetUgx: Number(b.targetUgx ?? 0),
          savedUgx: Number(b.savedUgx ?? 0),
          deadline: String(b.deadline ?? todayIso()),
          color: String(b.color ?? "oklch(0.6 0.16 150)"),
          note: String(b.note ?? ""),
          accountId: account?._id,
        });
      }
      if (resource === "debts") {
        return await ctx.db.insert("debts", {
          ...common,
          direction: (b.direction ?? "borrowed") as "borrowed" | "lent",
          counterparty: String(b.counterparty ?? ""),
          principalUgx: Number(b.principalUgx ?? 0),
          balanceUgx: Number(b.balanceUgx ?? Number(b.principalUgx ?? 0)),
          dueOn: String(b.dueOn ?? todayIso()),
          note: String(b.note ?? ""),
        });
      }
      if (resource === "recurring") {
        const account = await resolveDoc(ctx, "accounts", userId, String(b.accountId ?? ""));
        const category = await resolveDoc(ctx, "categories", userId, String(b.category ?? b.categoryId ?? ""));
        return await ctx.db.insert("recurringRules", {
          ...common,
          name: String(b.name ?? "Recurring"),
          type: (b.type ?? "expense") as "expense" | "income" | "transfer",
          amountUgx: Number(b.amountUgx ?? 0),
          currency: (b.currency ?? "UGX") as "UGX" | "USD" | "KES" | "RWF" | "TZS",
          accountId: account?._id ?? ("" as unknown as Id<"accounts">),
          toAccountId: undefined,
          categoryId: category?._id as unknown as Id<"categories"> | undefined,
          frequency: (b.frequency ?? "monthly") as "daily" | "weekly" | "monthly" | "yearly",
          nextOn: String(b.nextOn ?? todayIso()),
          enabled: b.enabled !== false,
          note: String(b.note ?? ""),
        });
      }
      if (resource === "income-sources") {
        const account = await resolveDoc(ctx, "accounts", userId, String(b.accountId ?? ""));
        const category = await resolveDoc(ctx, "categories", userId, String(b.categoryId ?? ""));
        return await ctx.db.insert("incomeSources", {
          ...common,
          name: String(b.name ?? "Income"),
          categoryId: (category?._id ?? "") as unknown as Id<"categories">,
          accountId: account?._id ?? ("" as unknown as Id<"accounts">),
          expectedMonthlyUgx: Number(b.expectedMonthlyUgx ?? 0),
          cadence: (b.cadence ?? "fixed") as "fixed" | "irregular",
          payday: b.payday ? Number(b.payday) : undefined,
          active: b.active !== false,
        });
      }
    }

    const doc = (await resolveDoc(ctx, resource, userId, id)) as Doc<"accounts"> | null;
    if (!doc) return { error: "Not found" };

    if (method === "DELETE") {
      await ctx.db.delete(doc._id);
      return { ok: true };
    }

    if (resource === "budgets") {
      const patch = pick(b, ["name", "limitUgx", "period", "color"]);
      if (b.categoryId !== undefined) {
        const category = await resolveDoc(ctx, "categories", userId, String(b.categoryId));
        patch.categoryId = category?._id as unknown as Id<"categories"> | undefined;
      }
      await ctx.db.patch(doc._id, patch as Record<string, unknown>);
      return { ok: true };
    }

    if (resource === "goals") {
      const patch = pick(b, ["name", "targetUgx", "savedUgx", "deadline", "color", "note"]);
      if (b.accountId !== undefined) {
        const account = await resolveDoc(ctx, "accounts", userId, String(b.accountId));
        patch.accountId = account?._id;
      }
      await ctx.db.patch(doc._id, patch as Record<string, unknown>);
      return { ok: true };
    }

    const patch = pick(b, ["name", "label", "type", "provider", "color", "openingBalanceUgx", "kind", "iconKey", "targetUgx", "savedUgx", "deadline", "note", "direction", "counterparty", "principalUgx", "balanceUgx", "dueOn", "amountUgx", "currency", "frequency", "nextOn", "enabled", "expectedMonthlyUgx", "cadence", "payday", "active"]);
    await ctx.db.patch(doc._id, patch as Record<string, unknown>);
    return { ok: true };
  },
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
