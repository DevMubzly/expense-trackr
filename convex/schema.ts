import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

const categoryKind = v.union(v.literal("expense"), v.literal("income"));

export default defineSchema({
  ...authTables,

  accounts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: accountType,
    provider: v.optional(v.string()),
    color: v.string(),
    openingBalanceUgx: v.number(),
    archived: v.optional(v.boolean()),
    createdAt: v.number(),
    /** Transitional: id of the matching account in the still-mock app store. */
    legacyId: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  categories: defineTable({
    userId: v.id("users"),
    label: v.string(),
    kind: categoryKind,
    color: v.string(),
    iconKey: v.string(),
    createdAt: v.number(),
    /** Transitional: id of the matching category in the still-mock app store. */
    legacyId: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  transactions: defineTable({
    userId: v.id("users"),
    type: transactionType,
    amount: v.number(),
    currency,
    amountUgx: v.number(),
    usdRate: v.number(),
    categoryId: v.optional(v.id("categories")),
    accountId: v.id("accounts"),
    toAccountId: v.optional(v.id("accounts")),
    feeUgx: v.optional(v.number()),
    note: v.string(),
    spentOn: v.string(),
    spentTime: v.string(),
    source: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_spentOn", ["userId", "spentOn"])
    .index("by_user_and_account", ["userId", "accountId"]),

  budgets: defineTable({
    userId: v.id("users"),
    name: v.string(),
    categoryId: v.optional(v.id("categories")),
    limitUgx: v.number(),
    period: v.union(v.literal("monthly"), v.literal("weekly")),
    color: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  goals: defineTable({
    userId: v.id("users"),
    name: v.string(),
    targetUgx: v.number(),
    savedUgx: v.number(),
    deadline: v.string(),
    color: v.string(),
    note: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  goalContributions: defineTable({
    userId: v.id("users"),
    goalId: v.id("goals"),
    amountUgx: v.number(),
    date: v.string(),
    accountId: v.optional(v.id("accounts")),
    note: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_goal", ["goalId"]),

  debts: defineTable({
    userId: v.id("users"),
    direction: v.union(v.literal("borrowed"), v.literal("lent")),
    counterparty: v.string(),
    principalUgx: v.number(),
    balanceUgx: v.number(),
    dueOn: v.string(),
    note: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  debtPayments: defineTable({
    userId: v.id("users"),
    debtId: v.id("debts"),
    amountUgx: v.number(),
    date: v.string(),
    accountId: v.optional(v.id("accounts")),
    note: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_debt", ["debtId"]),

  incomeSources: defineTable({
    userId: v.id("users"),
    name: v.string(),
    categoryId: v.id("categories"),
    accountId: v.id("accounts"),
    expectedMonthlyUgx: v.number(),
    cadence: v.union(v.literal("fixed"), v.literal("irregular")),
    payday: v.optional(v.number()),
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  recurringRules: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: transactionType,
    amountUgx: v.number(),
    currency,
    accountId: v.id("accounts"),
    toAccountId: v.optional(v.id("accounts")),
    categoryId: v.optional(v.id("categories")),
    frequency: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
    ),
    nextOn: v.string(),
    enabled: v.boolean(),
    note: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  settings: defineTable({
    userId: v.id("users"),
    usdRate: v.number(),
    defaultCurrency: currency,
    defaultAccountId: v.optional(v.id("accounts")),
    payday: v.number(),
    forecastBufferUgx: v.number(),
    profileName: v.string(),
    profileEmail: v.string(),
    profilePhone: v.string(),
    avatarDataUrl: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});
