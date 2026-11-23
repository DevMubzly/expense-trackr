import { vMcpUser } from "@convex-dev/mcp";
import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const currency = v.union(
  v.literal("UGX"),
  v.literal("USD"),
  v.literal("KES"),
  v.literal("RWF"),
  v.literal("TZS"),
);
const transactionType = v.union(
  v.literal("expense"),
  v.literal("income"),
  v.literal("transfer"),
);
const accountType = v.union(
  v.literal("cash"),
  v.literal("bank"),
  v.literal("momo"),
);

const DEFAULT_ACCOUNTS = [
  {
    name: "Cash",
    type: "cash" as const,
    color: "oklch(0.70 0.14 70)",
    openingBalanceUgx: 0,
  },
  {
    name: "Bank",
    type: "bank" as const,
    color: "oklch(0.62 0.12 240)",
    openingBalanceUgx: 0,
  },
  {
    name: "Mobile Money",
    type: "momo" as const,
    provider: "MTN",
    color: "oklch(0.72 0.16 85)",
    openingBalanceUgx: 0,
  },
] as const;

const DEFAULT_CATEGORIES = [
  ["Food", "expense", "oklch(0.68 0.16 55)", "restaurant"],
  ["Transport", "expense", "oklch(0.62 0.15 250)", "bus"],
  ["Bills", "expense", "oklch(0.60 0.15 300)", "invoice"],
  ["Health", "expense", "oklch(0.66 0.16 150)", "health"],
  ["Fun", "expense", "oklch(0.64 0.18 345)", "party"],
  ["Shopping", "expense", "oklch(0.70 0.15 20)", "shopping-bag"],
  ["Salary", "income", "oklch(0.68 0.15 155)", "wallet"],
  ["Freelance", "income", "oklch(0.62 0.12 220)", "laptop"],
] as const;

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

async function seedForUser(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("accounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (existing) return;

  const user = await ctx.db.get(userId);
  const now = Date.now();
  let defaultAccountId: Id<"accounts"> | undefined;

  for (const [index, account] of DEFAULT_ACCOUNTS.entries()) {
    const id = await ctx.db.insert("accounts", {
      userId,
      ...account,
      createdAt: now + index,
    });
    if (index === 0) defaultAccountId = id;
  }

  for (const [index, [label, kind, color, iconKey]] of DEFAULT_CATEGORIES.entries()) {
    await ctx.db.insert("categories", {
      userId,
      label,
      kind,
      color,
      iconKey,
      createdAt: now + 100 + index,
    });
  }

  await ctx.db.insert("settings", {
    userId,
    usdRate: 3800,
    defaultCurrency: "UGX",
    defaultAccountId,
    payday: 28,
    forecastBufferUgx: 200_000,
    profileName:
      typeof user?.name === "string" && user.name.trim()
        ? user.name
        : "Expense Trackr user",
    profileEmail: typeof user?.email === "string" ? user.email : "",
    profilePhone: "",
    avatarDataUrl: "",
    createdAt: now,
  });

  const categories = await ctx.db
    .query("categories")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const food = categories.find((category) => category.label === "Food");
  await ctx.db.insert("budgets", {
    userId,
    name: "Overall",
    categoryId: food?._id,
    limitUgx: 1_500_000,
    period: "monthly",
    color: "oklch(0.62 0.14 220)",
    createdAt: now + 300,
  });
}

export const ensureSeed = internalMutation({
  args: { user: vMcpUser(v.id("users")) },
  handler: async (ctx, { user }) => {
    await seedForUser(ctx, user.userId);
  },
});

async function accountBalances(ctx: QueryCtx, userId: Id<"users">) {
  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const transactions = await ctx.db
    .query("transactions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const balances = new Map<Id<"accounts">, number>(
    accounts.map((account) => [account._id, account.openingBalanceUgx]),
  );

  for (const transaction of transactions) {
    const amount = transaction.amountUgx;
    const fee = transaction.feeUgx ?? 0;
    if (transaction.type === "income") {
      balances.set(
        transaction.accountId,
        (balances.get(transaction.accountId) ?? 0) + amount,
      );
    } else if (transaction.type === "transfer") {
      balances.set(
        transaction.accountId,
        (balances.get(transaction.accountId) ?? 0) - amount - fee,
      );
      if (transaction.toAccountId) {
        balances.set(
          transaction.toAccountId,
          (balances.get(transaction.toAccountId) ?? 0) + amount,
        );
      }
    } else {
      balances.set(
        transaction.accountId,
        (balances.get(transaction.accountId) ?? 0) - amount - fee,
      );
    }
  }

  return accounts.map((account) => ({
    id: account._id as string,
    name: account.name,
    type: account.type as "cash" | "bank" | "momo",
    provider: account.provider ?? "",
    balanceUgx: balances.get(account._id) ?? 0,
  }));
}

export const snapshot = internalQuery({
  args: { user: vMcpUser(v.id("users")) },
  handler: async (ctx, { user }) => {
    const accounts = await accountBalances(ctx, user.userId);
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .collect();
    const debts = await ctx.db
      .query("debts")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .collect();
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .collect();
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .first();
    const incomeSources = await ctx.db
      .query("incomeSources")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .collect();
    const month = monthKey();
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user_and_spentOn", (q) =>
        q.eq("userId", user.userId).gte("spentOn", `${month}-01`),
      )
      .collect();

    const monthSpent = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((total, transaction) => total + transaction.amountUgx, 0);
    const monthIncome = transactions
      .filter((transaction) => transaction.type === "income")
      .reduce((total, transaction) => total + transaction.amountUgx, 0);
    const budget = budgets.find((entry) => entry.period === "monthly");
    const limitUgx = budget?.limitUgx ?? 0;

    const liquidUgx = accounts.reduce(
      (total, account) => total + account.balanceUgx,
      0,
    );
    const goalsSavedUgx = goals.reduce(
      (total, goal) => total + goal.savedUgx,
      0,
    );
    const lentUgx = debts
      .filter((debt) => debt.direction === "lent")
      .reduce((total, debt) => total + debt.balanceUgx, 0);
    const borrowedUgx = debts
      .filter((debt) => debt.direction === "borrowed")
      .reduce((total, debt) => total + debt.balanceUgx, 0);

    const today = new Date();
    const day = today.getDate();
    const payday = settings?.payday ?? 28;
    const daysToPayday = Math.max(
      0,
      payday >= day ? payday - day : 30 - day + payday,
    );
    const buffer = settings?.forecastBufferUgx ?? 0;
    const safePerDayUgx =
      daysToPayday > 0
        ? Math.max(0, Math.round((liquidUgx - buffer) / daysToPayday))
        : 0;

    return {
      accounts,
      totals: {
        liquidUgx,
        goalsSavedUgx,
        lentUgx,
        borrowedUgx,
        netWorthUgx: liquidUgx + goalsSavedUgx + lentUgx - borrowedUgx,
      },
      budget: {
        limitUgx,
        spentUgx: monthSpent,
        remainingUgx: Math.max(0, limitUgx - monthSpent),
      },
      earnings: {
        expectedMonthlyUgx: incomeSources
          .filter((source) => source.active)
          .reduce((total, source) => total + source.expectedMonthlyUgx, 0),
        actualMonthUgx: monthIncome,
      },
      payday,
      daysToPayday,
      safePerDayUgx,
    };
  },
});

function shapeTransaction(
  transaction: Doc<"transactions">,
  accountNames: Map<string, string>,
  categoryNames: Map<string, string>,
) {
  return {
    id: transaction._id as string,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    amountUgx: transaction.amountUgx,
    accountId: transaction.accountId as string,
    accountName: accountNames.get(transaction.accountId as string) ?? "Account",
    categoryId: (transaction.categoryId as string | undefined) ?? "",
    categoryName: transaction.categoryId
      ? (categoryNames.get(transaction.categoryId as string) ?? "Uncategorized")
      : "Uncategorized",
    note: transaction.note,
    spentOn: transaction.spentOn,
    spentTime: transaction.spentTime,
    feeUgx: transaction.feeUgx ?? 0,
  };
}

export const listTransactions = internalQuery({
  args: {
    user: vMcpUser(v.id("users")),
    type: v.optional(transactionType),
    accountId: v.optional(v.id("accounts")),
    categoryId: v.optional(v.id("categories")),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.user.userId))
      .collect();
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", args.user.userId))
      .collect();
    const accountNames = new Map(
      accounts.map((account) => [account._id as string, account.name]),
    );
    const categoryNames = new Map(
      categories.map((category) => [category._id as string, category.label]),
    );
    const search = args.search?.trim().toLowerCase();

    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.user.userId))
      .collect();

    return rows
      .filter((transaction) => {
        if (args.type && transaction.type !== args.type) return false;
        if (args.accountId && transaction.accountId !== args.accountId) {
          return false;
        }
        if (args.categoryId && transaction.categoryId !== args.categoryId) {
          return false;
        }
        if (args.from && transaction.spentOn < args.from) return false;
        if (args.to && transaction.spentOn > args.to) return false;
        if (
          search &&
          !`${transaction.note} ${accountNames.get(transaction.accountId as string) ?? ""} ${categoryNames.get(transaction.categoryId as string) ?? ""}`
            .toLowerCase()
            .includes(search)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const date = b.spentOn.localeCompare(a.spentOn);
        return date !== 0 ? date : b.createdAt - a.createdAt;
      })
      .slice(0, Math.min(100, Math.max(1, args.limit ?? 40)))
      .map((transaction) =>
        shapeTransaction(transaction, accountNames, categoryNames),
      );
  },
});

export const listAccounts = internalQuery({
  args: { user: vMcpUser(v.id("users")) },
  handler: async (ctx, { user }) => accountBalances(ctx, user.userId),
});

export const listCategories = internalQuery({
  args: { user: vMcpUser(v.id("users")) },
  handler: async (ctx, { user }) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .collect();
    return categories.map((category) => ({
      id: category._id as string,
      label: category.label,
      kind: category.kind,
      color: category.color,
      iconKey: category.iconKey,
    }));
  },
});

export const spendingBreakdown = internalQuery({
  args: {
    user: vMcpUser(v.id("users")),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", args.user.userId))
      .collect();
    const categoryById = new Map(
      categories.map((category) => [category._id as string, category]),
    );
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", args.user.userId))
      .collect();
    const totals = new Map<
      string,
      { label: string; color: string; totalUgx: number }
    >();
    for (const transaction of transactions) {
      if (transaction.type !== "expense") continue;
      if (args.from && transaction.spentOn < args.from) continue;
      if (args.to && transaction.spentOn > args.to) continue;
      const key = (transaction.categoryId as string | undefined) ?? "uncategorized";
      const category = transaction.categoryId
        ? categoryById.get(key)
        : undefined;
      const current = totals.get(key) ?? {
        label: category?.label ?? "Uncategorized",
        color: category?.color ?? "oklch(0.6 0 0)",
        totalUgx: 0,
      };
      current.totalUgx += transaction.amountUgx;
      totals.set(key, current);
    }
    return [...totals.entries()]
      .map(([id, entry]) => ({ id, ...entry }))
      .sort((a, b) => b.totalUgx - a.totalUgx);
  },
});

async function budgetSpent(
  ctx: QueryCtx,
  userId: Id<"users">,
  budget: Doc<"budgets">,
) {
  const month = monthKey();
  const rows = await ctx.db
    .query("transactions")
    .withIndex("by_user_and_spentOn", (q) =>
      q.eq("userId", userId).gte("spentOn", `${month}-01`),
    )
    .collect();
  return rows
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        (!budget.categoryId || transaction.categoryId === budget.categoryId),
    )
    .reduce((total, transaction) => total + transaction.amountUgx, 0);
}

export const listBudgets = internalQuery({
  args: { user: vMcpUser(v.id("users")) },
  handler: async (ctx, { user }) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .collect();
    const categoryNames = new Map(
      categories.map((category) => [category._id as string, category.label]),
    );
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .collect();
    return Promise.all(
      budgets.map(async (budget) => {
        const spentUgx = await budgetSpent(ctx, user.userId, budget);
        return {
          id: budget._id as string,
          name: budget.name,
          categoryId: (budget.categoryId as string | undefined) ?? "",
          categoryName: budget.categoryId
            ? (categoryNames.get(budget.categoryId as string) ?? "Category")
            : "All categories",
          limitUgx: budget.limitUgx,
          spentUgx,
          remainingUgx: Math.max(0, budget.limitUgx - spentUgx),
          period: budget.period,
        };
      }),
    );
  },
});

export const listGoals = internalQuery({
  args: { user: vMcpUser(v.id("users")) },
  handler: async (ctx, { user }) => {
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .collect();
    return goals.map((goal) => ({
      id: goal._id as string,
      name: goal.name,
      targetUgx: goal.targetUgx,
      savedUgx: goal.savedUgx,
      deadline: goal.deadline,
      note: goal.note,
      progress:
        goal.targetUgx > 0
          ? Math.min(100, Math.round((goal.savedUgx / goal.targetUgx) * 100))
          : 0,
    }));
  },
});

export const listDebts = internalQuery({
  args: { user: vMcpUser(v.id("users")) },
  handler: async (ctx, { user }) => {
    const debts = await ctx.db
      .query("debts")
      .withIndex("by_user", (q) => q.eq("userId", user.userId))
      .collect();
    return debts.map((debt) => ({
      id: debt._id as string,
      direction: debt.direction,
      counterparty: debt.counterparty,
      principalUgx: debt.principalUgx,
      balanceUgx: debt.balanceUgx,
      dueOn: debt.dueOn,
      note: debt.note,
    }));
  },
});

function requireAccount(
  account: Doc<"accounts"> | null,
  userId: Id<"users">,
): asserts account is Doc<"accounts"> {
  if (!account || account.userId !== userId) {
    throw new ConvexError("Account not found.");
  }
}

function requireCategory(
  category: Doc<"categories"> | null,
  userId: Id<"users">,
): asserts category is Doc<"categories"> {
  if (!category || category.userId !== userId) {
    throw new ConvexError("Category not found.");
  }
}

export const addTransaction = internalMutation({
  args: {
    user: vMcpUser(v.id("users")),
    type: transactionType,
    amount: v.number(),
    currency,
    amountUgx: v.optional(v.number()),
    accountId: v.id("accounts"),
    toAccountId: v.optional(v.id("accounts")),
    categoryId: v.optional(v.id("categories")),
    feeUgx: v.optional(v.number()),
    note: v.optional(v.string()),
    spentOn: v.string(),
    spentTime: v.optional(v.string()),
    usdRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId);
    requireAccount(account, args.user.userId);
    if (args.type === "transfer") {
      if (!args.toAccountId) {
        throw new ConvexError("A transfer needs a destination account.");
      }
      const destination = await ctx.db.get(args.toAccountId);
      requireAccount(destination, args.user.userId);
    }
    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      requireCategory(category, args.user.userId);
    }

    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.user.userId))
      .first();
    const usdRate = args.usdRate ?? settings?.usdRate ?? 3800;
    const amountUgx =
      args.amountUgx ??
      (args.currency === "UGX"
        ? args.amount
        : args.currency === "USD"
          ? args.amount * usdRate
          : null);
    if (amountUgx === null || !Number.isFinite(amountUgx) || amountUgx <= 0) {
      throw new ConvexError(
        "For non-UGX transactions provide amountUgx (the value in UGX).",
      );
    }

    const id = await ctx.db.insert("transactions", {
      userId: args.user.userId,
      type: args.type,
      amount: args.amount,
      currency: args.currency,
      amountUgx: Math.round(amountUgx),
      usdRate,
      categoryId: args.categoryId,
      accountId: args.accountId,
      toAccountId: args.toAccountId,
      feeUgx: args.feeUgx ?? 0,
      note: args.note?.trim() ?? "",
      spentOn: args.spentOn,
      spentTime: args.spentTime ?? "12:00",
      source: "ai",
      createdAt: Date.now(),
    });
    const row = await ctx.db.get(id);
    if (!row) throw new ConvexError("Could not create transaction.");
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", args.user.userId))
      .collect();
    return shapeTransaction(
      row,
      new Map([[account._id as string, account.name]]),
      new Map(
        categories.map((category) => [
          category._id as string,
          category.label,
        ]),
      ),
    );
  },
});

export const updateTransaction = internalMutation({
  args: {
    user: vMcpUser(v.id("users")),
    transactionId: v.id("transactions"),
    note: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    amountUgx: v.optional(v.number()),
    spentOn: v.optional(v.string()),
    spentTime: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.userId !== args.user.userId) {
      throw new ConvexError("Transaction not found.");
    }
    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      requireCategory(category, args.user.userId);
    }
    await ctx.db.patch(transaction._id, {
      ...(args.note !== undefined ? { note: args.note.trim() } : {}),
      ...(args.categoryId !== undefined
        ? { categoryId: args.categoryId }
        : {}),
      ...(args.amountUgx !== undefined
        ? { amountUgx: Math.round(args.amountUgx) }
        : {}),
      ...(args.spentOn !== undefined ? { spentOn: args.spentOn } : {}),
      ...(args.spentTime !== undefined ? { spentTime: args.spentTime } : {}),
    });
    const updated = await ctx.db.get(transaction._id);
    if (!updated) throw new ConvexError("Transaction not found.");
    return { id: updated._id as string, updated: true };
  },
});

export const deleteTransaction = internalMutation({
  args: {
    user: vMcpUser(v.id("users")),
    transactionId: v.id("transactions"),
  },
  handler: async (ctx, { user, transactionId }) => {
    const transaction = await ctx.db.get(transactionId);
    if (!transaction || transaction.userId !== user.userId) {
      throw new ConvexError("Transaction not found.");
    }
    await ctx.db.delete(transaction._id);
    return { id: transaction._id as string, deleted: true };
  },
});

export const setBudget = internalMutation({
  args: {
    user: vMcpUser(v.id("users")),
    categoryId: v.optional(v.id("categories")),
    name: v.string(),
    limitUgx: v.number(),
    period: v.union(v.literal("monthly"), v.literal("weekly")),
  },
  handler: async (ctx, args) => {
    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      requireCategory(category, args.user.userId);
    }
    const budgets = await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", args.user.userId))
      .collect();
    const existing = budgets.find(
      (budget) =>
        budget.categoryId === args.categoryId &&
        budget.period === args.period,
    );
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name.trim(),
        limitUgx: Math.round(args.limitUgx),
      });
      return { id: existing._id as string, updated: true };
    }
    const id = await ctx.db.insert("budgets", {
      userId: args.user.userId,
      name: args.name.trim(),
      categoryId: args.categoryId,
      limitUgx: Math.round(args.limitUgx),
      period: args.period,
      color: "oklch(0.62 0.14 220)",
      createdAt: Date.now(),
    });
    return { id: id as string, updated: false };
  },
});

export const contributeToGoal = internalMutation({
  args: {
    user: vMcpUser(v.id("users")),
    goalId: v.id("goals"),
    amountUgx: v.number(),
    accountId: v.optional(v.id("accounts")),
    note: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.amountUgx) || args.amountUgx <= 0) {
      throw new ConvexError("Contribution must be greater than zero.");
    }
    const goal = await ctx.db.get(args.goalId);
    if (!goal || goal.userId !== args.user.userId) {
      throw new ConvexError("Goal not found.");
    }
    if (args.accountId) {
      const account = await ctx.db.get(args.accountId);
      requireAccount(account, args.user.userId);
    }
    await ctx.db.patch(goal._id, {
      savedUgx: goal.savedUgx + Math.round(args.amountUgx),
    });
    await ctx.db.insert("goalContributions", {
      userId: args.user.userId,
      goalId: goal._id,
      amountUgx: Math.round(args.amountUgx),
      date: args.date,
      accountId: args.accountId,
      note: args.note?.trim() ?? "",
      createdAt: Date.now(),
    });
    return {
      id: goal._id as string,
      savedUgx: goal.savedUgx + Math.round(args.amountUgx),
      targetUgx: goal.targetUgx,
    };
  },
});

export const recordDebtPayment = internalMutation({
  args: {
    user: vMcpUser(v.id("users")),
    debtId: v.id("debts"),
    amountUgx: v.number(),
    accountId: v.optional(v.id("accounts")),
    note: v.optional(v.string()),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    if (!Number.isFinite(args.amountUgx) || args.amountUgx <= 0) {
      throw new ConvexError("Payment must be greater than zero.");
    }
    const debt = await ctx.db.get(args.debtId);
    if (!debt || debt.userId !== args.user.userId) {
      throw new ConvexError("Debt not found.");
    }
    if (args.accountId) {
      const account = await ctx.db.get(args.accountId);
      requireAccount(account, args.user.userId);
    }
    const amount = Math.min(Math.round(args.amountUgx), debt.balanceUgx);
    await ctx.db.patch(debt._id, {
      balanceUgx: debt.balanceUgx - amount,
    });
    await ctx.db.insert("debtPayments", {
      userId: args.user.userId,
      debtId: debt._id,
      amountUgx: amount,
      date: args.date,
      accountId: args.accountId,
      note: args.note?.trim() ?? "",
      createdAt: Date.now(),
    });
    return {
      id: debt._id as string,
      balanceUgx: debt.balanceUgx - amount,
      paidUgx: amount,
    };
  },
});

export const accountTypeValidator = accountType;
export const currencyValidator = currency;
