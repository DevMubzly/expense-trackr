import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const currency = v.union(
  v.literal("UGX"),
  v.literal("USD"),
  v.literal("KES"),
  v.literal("RWF"),
  v.literal("TZS"),
);
type Currency = "UGX" | "USD" | "KES" | "RWF" | "TZS";

const transactionType = v.union(
  v.literal("expense"),
  v.literal("income"),
  v.literal("transfer"),
);
type TransactionType = "expense" | "income" | "transfer";

const transactionSource = v.union(
  v.literal("manual"),
  v.literal("ai"),
  v.literal("receipt"),
  v.literal("recurring"),
  v.literal("import"),
);

const accountType = v.union(
  v.literal("cash"),
  v.literal("bank"),
  v.literal("momo"),
);

const categoryKind = v.union(v.literal("expense"), v.literal("income"));

/**
 * Accounts and categories still live in the app's mock store. These
 * descriptors carry enough data for Convex to mirror them (keyed by
 * `legacyId`) until those data paths move over too.
 */
const accountInput = v.object({
  legacyId: v.string(),
  name: v.string(),
  type: accountType,
  color: v.string(),
  provider: v.optional(v.string()),
});

const categoryInput = v.object({
  legacyId: v.string(),
  label: v.string(),
  kind: categoryKind,
  color: v.string(),
  iconKey: v.string(),
});

type AccountInput = {
  legacyId: string;
  name: string;
  type: "cash" | "bank" | "momo";
  color: string;
  provider?: string;
};

type CategoryInput = {
  legacyId: string;
  label: string;
  kind: "expense" | "income";
  color: string;
  iconKey: string;
};

type ShapedTransaction = {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  amountUgx: number;
  usdRate: number;
  category: string;
  accountId: string;
  toAccountId?: string;
  feeUgx?: number;
  note: string;
  spentOn: string;
  spentTime: string;
  createdAt: string;
  source: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function requireDate(value: string) {
  if (!DATE_PATTERN.test(value)) {
    throw new ConvexError("spentOn must be YYYY-MM-DD.");
  }
}

function requireTime(value: string) {
  if (!TIME_PATTERN.test(value)) {
    throw new ConvexError("spentTime must be HH:mm.");
  }
}

async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError("Sign in before managing transactions.");
  }
  return userId;
}

async function lookups(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const categories = await ctx.db
    .query("categories")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return {
    accountById: new Map(
      accounts.map((account) => [account._id as string, account]),
    ),
    categoryById: new Map(
      categories.map((category) => [category._id as string, category]),
    ),
  };
}

function shapeTransaction(
  transaction: Doc<"transactions">,
  accountById: Map<string, Doc<"accounts">>,
  categoryById: Map<string, Doc<"categories">>,
): ShapedTransaction {
  const account = accountById.get(transaction.accountId as string);
  const category = transaction.categoryId
    ? categoryById.get(transaction.categoryId as string)
    : undefined;
  const destination =
    transaction.type === "transfer" && transaction.toAccountId
      ? accountById.get(transaction.toAccountId as string)
      : undefined;

  const toAccountId = destination?.legacyId ?? transaction.toAccountId;
  const shaped: ShapedTransaction = {
    id: transaction._id as string,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    amountUgx: transaction.amountUgx,
    usdRate: transaction.usdRate,
    category:
      transaction.type === "transfer"
        ? ""
        : category?.legacyId ?? transaction.categoryId ?? "",
    accountId: account?.legacyId ?? transaction.accountId,
    note: transaction.note,
    spentOn: transaction.spentOn,
    spentTime: transaction.spentTime,
    createdAt: new Date(transaction.createdAt).toISOString(),
    source: transaction.source,
  };
  if (toAccountId) shaped.toAccountId = toAccountId;
  if ((transaction.feeUgx ?? 0) > 0) shaped.feeUgx = transaction.feeUgx;
  return shaped;
}

async function shapeOne(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  transaction: Doc<"transactions">,
) {
  const { accountById, categoryById } = await lookups(ctx, userId);
  return shapeTransaction(transaction, accountById, categoryById);
}

async function resolveAccount(
  ctx: MutationCtx,
  userId: Id<"users">,
  input: AccountInput,
): Promise<Doc<"accounts">> {
  const accounts = await ctx.db
    .query("accounts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const mirrored = accounts.find(
    (account) => account.legacyId === input.legacyId,
  );
  if (mirrored) return mirrored;

  // Adopt an unclaimed Convex account created by onboarding or the MCP seed
  // instead of creating a duplicate beside it.
  const sameName = accounts.find(
    (account) =>
      !account.legacyId &&
      account.name === input.name.trim() &&
      account.type === input.type &&
      (account.provider ?? "") === (input.provider ?? ""),
  );
  if (sameName) {
    await ctx.db.patch(sameName._id, { legacyId: input.legacyId });
    return { ...sameName, legacyId: input.legacyId };
  }

  const id = await ctx.db.insert("accounts", {
    userId,
    name: input.name.trim() || "Account",
    type: input.type,
    provider: input.provider?.trim() || undefined,
    color: input.color || "oklch(0.7 0.08 250)",
    // The mock store still owns balances; mirrored accounts only exist so
    // transactions have a real Convex reference.
    openingBalanceUgx: 0,
    createdAt: Date.now(),
    legacyId: input.legacyId,
  });
  const account = await ctx.db.get(id);
  if (!account) throw new ConvexError("Could not create account.");
  return account;
}

async function resolveCategory(
  ctx: MutationCtx,
  userId: Id<"users">,
  input: CategoryInput,
): Promise<Doc<"categories">> {
  const categories = await ctx.db
    .query("categories")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const mirrored = categories.find(
    (category) => category.legacyId === input.legacyId,
  );
  if (mirrored) return mirrored;

  const label = input.label.trim().toLowerCase();
  const sameLabel = categories.find(
    (category) =>
      !category.legacyId &&
      category.label.trim().toLowerCase() === label &&
      category.kind === input.kind,
  );
  if (sameLabel) {
    await ctx.db.patch(sameLabel._id, { legacyId: input.legacyId });
    return { ...sameLabel, legacyId: input.legacyId };
  }

  const id = await ctx.db.insert("categories", {
    userId,
    label: input.label.trim() || "Category",
    kind: input.kind,
    color: input.color || "oklch(0.64 0.02 275)",
    iconKey: input.iconKey || "package",
    createdAt: Date.now(),
    legacyId: input.legacyId,
  });
  const category = await ctx.db.get(id);
  if (!category) throw new ConvexError("Could not create category.");
  return category;
}

async function ugxValue(
  ctx: MutationCtx,
  userId: Id<"users">,
  args: {
    amount: number;
    currency: Currency;
    amountUgx?: number;
    usdRate?: number;
  },
) {
  if (!Number.isFinite(args.amount) || args.amount <= 0) {
    throw new ConvexError("Amount must be a positive number.");
  }
  let rate = args.usdRate;
  if (rate === undefined) {
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    rate = settings?.usdRate ?? 3800;
  }
  // Matches the mock ledger: only USD converts, other currencies are already
  // treated as UGX-equivalent amounts by the form.
  const value =
    args.amountUgx ?? (args.currency === "USD" ? args.amount * rate : args.amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new ConvexError("Amount must be a positive number.");
  }
  return { amountUgx: Math.round(value), usdRate: rate };
}

export const list = query({
  args: {
    type: v.optional(transactionType),
    category: v.optional(v.string()),
    accountId: v.optional(v.string()),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ShapedTransaction[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const { accountById, categoryById } = await lookups(ctx, userId);
    const rows = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const search = args.search?.trim().toLowerCase();

    const matches = rows.filter((transaction) => {
      if (args.type && transaction.type !== args.type) return false;
      if (args.from && transaction.spentOn < args.from) return false;
      if (args.to && transaction.spentOn > args.to) return false;
      if (args.category) {
        const category = transaction.categoryId
          ? categoryById.get(transaction.categoryId as string)
          : undefined;
        if (
          args.category !== transaction.categoryId &&
          args.category !== category?.legacyId
        ) {
          return false;
        }
      }
      if (args.accountId) {
        const source = accountById.get(transaction.accountId as string);
        const destination = transaction.toAccountId
          ? accountById.get(transaction.toAccountId as string)
          : undefined;
        const ids = [
          transaction.accountId,
          transaction.toAccountId,
          source?.legacyId,
          destination?.legacyId,
        ];
        if (!ids.includes(args.accountId)) return false;
      }
      if (search) {
        const source = accountById.get(transaction.accountId as string);
        const destination = transaction.toAccountId
          ? accountById.get(transaction.toAccountId as string)
          : undefined;
        const category = transaction.categoryId
          ? categoryById.get(transaction.categoryId as string)
          : undefined;
        const haystack = [
          transaction.note,
          transaction.type,
          String(transaction.amount),
          source?.name,
          source?.legacyId,
          destination?.name,
          category?.label,
          category?.legacyId,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    matches.sort((a, b) => {
      if (a.spentOn !== b.spentOn) return a.spentOn < b.spentOn ? 1 : -1;
      if (a.spentTime !== b.spentTime) {
        return a.spentTime < b.spentTime ? 1 : -1;
      }
      return b.createdAt - a.createdAt;
    });

    const limited =
      args.limit && args.limit > 0
        ? matches.slice(0, Math.min(500, Math.round(args.limit)))
        : matches;

    return limited.map((transaction) =>
      shapeTransaction(transaction, accountById, categoryById),
    );
  },
});

export const create = mutation({
  args: {
    type: transactionType,
    amount: v.number(),
    currency: currency,
    amountUgx: v.optional(v.number()),
    usdRate: v.optional(v.number()),
    account: accountInput,
    toAccount: v.optional(accountInput),
    category: v.optional(categoryInput),
    feeUgx: v.optional(v.number()),
    note: v.optional(v.string()),
    spentOn: v.string(),
    spentTime: v.optional(v.string()),
    source: v.optional(transactionSource),
  },
  handler: async (ctx, args): Promise<ShapedTransaction> => {
    const userId = await requireUserId(ctx);
    requireDate(args.spentOn);
    const spentTime = args.spentTime ?? "12:00";
    requireTime(spentTime);

    const account = await resolveAccount(ctx, userId, args.account);

    let toAccountId: Id<"accounts"> | undefined;
    if (args.type === "transfer") {
      if (!args.toAccount) {
        throw new ConvexError("A transfer needs a destination account.");
      }
      const destination = await resolveAccount(ctx, userId, args.toAccount);
      if (destination._id === account._id) {
        throw new ConvexError("Choose two different accounts.");
      }
      toAccountId = destination._id;
    }

    let categoryId: Id<"categories"> | undefined;
    if (args.type !== "transfer") {
      if (!args.category) {
        throw new ConvexError("Pick a category.");
      }
      const category = await resolveCategory(ctx, userId, args.category);
      if (category.kind !== args.type) {
        throw new ConvexError("Category does not match the transaction type.");
      }
      categoryId = category._id;
    }

    const { amountUgx, usdRate } = await ugxValue(ctx, userId, args);

    const id = await ctx.db.insert("transactions", {
      userId,
      type: args.type,
      amount: args.amount,
      currency: args.currency,
      amountUgx,
      usdRate,
      categoryId,
      accountId: account._id,
      toAccountId,
      feeUgx:
        args.type === "income"
          ? 0
          : Math.max(0, Math.round(args.feeUgx ?? 0)),
      note: args.note?.trim().slice(0, 240) ?? "",
      spentOn: args.spentOn,
      spentTime,
      source: args.source ?? "manual",
      createdAt: Date.now(),
    });

    const transaction = await ctx.db.get(id);
    if (!transaction) throw new ConvexError("Could not create transaction.");
    return await shapeOne(ctx, userId, transaction);
  },
});

export const update = mutation({
  args: {
    transactionId: v.id("transactions"),
    type: v.optional(transactionType),
    amount: v.optional(v.number()),
    currency: v.optional(currency),
    amountUgx: v.optional(v.number()),
    account: v.optional(accountInput),
    toAccount: v.optional(accountInput),
    category: v.optional(categoryInput),
    feeUgx: v.optional(v.number()),
    note: v.optional(v.string()),
    spentOn: v.optional(v.string()),
    spentTime: v.optional(v.string()),
    source: v.optional(transactionSource),
  },
  handler: async (ctx, args): Promise<ShapedTransaction> => {
    const userId = await requireUserId(ctx);
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.userId !== userId) {
      throw new ConvexError("Transaction not found.");
    }

    const type = args.type ?? transaction.type;
    const amount = args.amount ?? transaction.amount;
    const activeCurrency = args.currency ?? transaction.currency;

    const account = args.account
      ? await resolveAccount(ctx, userId, args.account)
      : await ctx.db.get(transaction.accountId);
    if (!account || account.userId !== userId) {
      throw new ConvexError("Account not found.");
    }

    let toAccountId: Id<"accounts"> | undefined;
    if (type === "transfer") {
      const destination = args.toAccount
        ? await resolveAccount(ctx, userId, args.toAccount)
        : transaction.toAccountId
          ? await ctx.db.get(transaction.toAccountId)
          : null;
      if (!destination || destination.userId !== userId) {
        throw new ConvexError("Choose a destination account.");
      }
      if (destination._id === account._id) {
        throw new ConvexError("Choose two different accounts.");
      }
      toAccountId = destination._id;
    }

    let categoryId: Id<"categories"> | undefined;
    if (type !== "transfer") {
      const category = args.category
        ? await resolveCategory(ctx, userId, args.category)
        : transaction.categoryId
          ? await ctx.db.get(transaction.categoryId)
          : null;
      if (!category || category.userId !== userId) {
        throw new ConvexError("Category not found.");
      }
      if (category.kind !== type) {
        throw new ConvexError("Category does not match the transaction type.");
      }
      categoryId = category._id;
    }

    const spentOn = args.spentOn ?? transaction.spentOn;
    requireDate(spentOn);
    const spentTime = args.spentTime ?? transaction.spentTime;
    requireTime(spentTime);

    let amountUgx = transaction.amountUgx;
    let usdRate = transaction.usdRate;
    if (args.amountUgx !== undefined) {
      if (!Number.isFinite(args.amountUgx) || args.amountUgx <= 0) {
        throw new ConvexError("Amount must be a positive number.");
      }
      amountUgx = Math.round(args.amountUgx);
    } else if (args.amount !== undefined || args.currency !== undefined) {
      const converted = await ugxValue(ctx, userId, {
        amount,
        currency: activeCurrency,
        usdRate:
          activeCurrency === transaction.currency
            ? transaction.usdRate
            : undefined,
      });
      amountUgx = converted.amountUgx;
      usdRate = converted.usdRate;
    }

    await ctx.db.patch(transaction._id, {
      type,
      amount,
      currency: activeCurrency,
      amountUgx,
      usdRate,
      accountId: account._id,
      toAccountId,
      categoryId,
      feeUgx:
        type === "income"
          ? 0
          : Math.max(
              0,
              Math.round(args.feeUgx ?? transaction.feeUgx ?? 0),
            ),
      note:
        args.note !== undefined
          ? args.note.trim().slice(0, 240)
          : transaction.note,
      spentOn,
      spentTime,
      source: args.source ?? transaction.source,
    });

    const updated = await ctx.db.get(transaction._id);
    if (!updated) throw new ConvexError("Transaction not found.");
    return await shapeOne(ctx, userId, updated);
  },
});

export const remove = mutation({
  args: { transactionId: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.userId !== userId) {
      throw new ConvexError("Transaction not found.");
    }
    await ctx.db.delete(transaction._id);
    return { id: transaction._id as string, deleted: true };
  },
});
