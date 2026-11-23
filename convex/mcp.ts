import { createTool, McpServer } from "@convex-dev/mcp";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

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

const accountShape = v.object({
  id: v.string(),
  name: v.string(),
  type: v.string(),
  provider: v.string(),
  balanceUgx: v.number(),
});

const transactionShape = v.object({
  id: v.string(),
  type: transactionType,
  amount: v.number(),
  currency,
  amountUgx: v.number(),
  accountId: v.string(),
  accountName: v.string(),
  categoryId: v.string(),
  categoryName: v.string(),
  note: v.string(),
  spentOn: v.string(),
  spentTime: v.string(),
  feeUgx: v.number(),
});

const categoryShape = v.object({
  id: v.string(),
  label: v.string(),
  kind: v.union(v.literal("expense"), v.literal("income")),
  color: v.string(),
  iconKey: v.string(),
});

const budgetShape = v.object({
  id: v.string(),
  name: v.string(),
  categoryId: v.string(),
  categoryName: v.string(),
  limitUgx: v.number(),
  spentUgx: v.number(),
  remainingUgx: v.number(),
  period: v.union(v.literal("monthly"), v.literal("weekly")),
});

const goalShape = v.object({
  id: v.string(),
  name: v.string(),
  targetUgx: v.number(),
  savedUgx: v.number(),
  deadline: v.string(),
  note: v.string(),
  progress: v.number(),
});

const debtShape = v.object({
  id: v.string(),
  direction: v.union(v.literal("borrowed"), v.literal("lent")),
  counterparty: v.string(),
  principalUgx: v.number(),
  balanceUgx: v.number(),
  dueOn: v.string(),
  note: v.string(),
});

const tool = createTool<Id<"users">>();

export const mcp: McpServer<Id<"users">> = new McpServer(components.mcp, {
  name: "expense-trackr",
  title: "Expense Trackr",
  version: "1.0.0",
  instructions:
    "Manage the signed-in user's personal finances: accounts, transactions, budgets, goals and debts. Always resolve account and category IDs with the list tools before writing. Amounts are in UGX unless a tool says otherwise.",
  consentUrl: process.env.MCP_CONSENT_URL!,
  scopes: {
    "finance:read":
      "View accounts, transactions, categories, budgets, goals, debts and summaries.",
    "finance:write":
      "Add and edit transactions, budgets, goal contributions and debt payments.",
  },
  tools: {
    get_money_snapshot: tool({
      description:
        "Get the user's current money picture: account balances, net worth, this month's budget, expected and actual income, payday and safe daily spending.",
      args: {},
      returns: v.object({
        accounts: v.array(accountShape),
        totals: v.object({
          liquidUgx: v.number(),
          goalsSavedUgx: v.number(),
          lentUgx: v.number(),
          borrowedUgx: v.number(),
          netWorthUgx: v.number(),
        }),
        budget: v.object({
          limitUgx: v.number(),
          spentUgx: v.number(),
          remainingUgx: v.number(),
        }),
        earnings: v.object({
          expectedMonthlyUgx: v.number(),
          actualMonthUgx: v.number(),
        }),
        payday: v.number(),
        daysToPayday: v.number(),
        safePerDayUgx: v.number(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "finance:read",
      handler: async (ctx, _args, user) => {
        await ctx.runMutation(internal.finance.ensureSeed, { user });
        return await ctx.runQuery(internal.finance.snapshot, { user });
      },
    }),

    list_transactions: tool({
      description:
        "List the user's transactions, newest first. Filter by type, account, category, date range or a text search.",
      args: {
        type: v.optional(transactionType),
        accountId: v.optional(v.id("accounts")),
        categoryId: v.optional(v.id("categories")),
        from: v.optional(v.string()),
        to: v.optional(v.string()),
        search: v.optional(v.string()),
        limit: v.optional(v.number()),
      },
      returns: v.object({ transactions: v.array(transactionShape) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "finance:read",
      handler: async (ctx, args, user) => {
        await ctx.runMutation(internal.finance.ensureSeed, { user });
        return {
          transactions: await ctx.runQuery(
            internal.finance.listTransactions,
            { user, ...args },
          ),
        };
      },
    }),

    add_transaction: tool({
      description:
        "Add an expense, income entry or account transfer for the user. For non-UGX currencies also provide amountUgx (the same value in UGX).",
      args: {
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
      returns: transactionShape,
      annotations: { openWorldHint: false },
      scope: "finance:write",
      handler: async (ctx, args, user) => {
        await ctx.runMutation(internal.finance.ensureSeed, { user });
        return await ctx.runMutation(internal.finance.addTransaction, {
          user,
          ...args,
        });
      },
    }),

    update_transaction: tool({
      description:
        "Edit one of the user's transactions: note, category, amount in UGX, date or time.",
      args: {
        transactionId: v.id("transactions"),
        note: v.optional(v.string()),
        categoryId: v.optional(v.id("categories")),
        amountUgx: v.optional(v.number()),
        spentOn: v.optional(v.string()),
        spentTime: v.optional(v.string()),
      },
      returns: v.object({ id: v.string(), updated: v.boolean() }),
      annotations: { openWorldHint: false },
      scope: "finance:write",
      handler: async (ctx, args, user) =>
        await ctx.runMutation(internal.finance.updateTransaction, {
          user,
          ...args,
        }),
    }),

    delete_transaction: tool({
      description: "Permanently delete one of the user's transactions.",
      args: { transactionId: v.id("transactions") },
      returns: v.object({ id: v.string(), deleted: v.boolean() }),
      annotations: { destructiveHint: true, openWorldHint: false },
      scope: "finance:write",
      handler: async (ctx, args, user) =>
        await ctx.runMutation(internal.finance.deleteTransaction, {
          user,
          transactionId: args.transactionId,
        }),
    }),

    list_accounts: tool({
      description: "List the user's accounts with current balances.",
      args: {},
      returns: v.object({ accounts: v.array(accountShape) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "finance:read",
      handler: async (ctx, _args, user) => {
        await ctx.runMutation(internal.finance.ensureSeed, { user });
        return {
          accounts: await ctx.runQuery(internal.finance.listAccounts, {
            user,
          }),
        };
      },
    }),

    list_categories: tool({
      description:
        "List the user's expense and income categories, including IDs for use when adding transactions.",
      args: {},
      returns: v.object({ categories: v.array(categoryShape) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "finance:read",
      handler: async (ctx, _args, user) => {
        await ctx.runMutation(internal.finance.ensureSeed, { user });
        return {
          categories: await ctx.runQuery(
            internal.finance.listCategories,
            { user },
          ),
        };
      },
    }),

    get_spending_breakdown: tool({
      description:
        "Get spending grouped by category for an optional date range. Useful for answering where the money went.",
      args: { from: v.optional(v.string()), to: v.optional(v.string()) },
      returns: v.object({
        categories: v.array(
          v.object({
            id: v.string(),
            label: v.string(),
            color: v.string(),
            totalUgx: v.number(),
          }),
        ),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "finance:read",
      handler: async (ctx, args, user) => {
        await ctx.runMutation(internal.finance.ensureSeed, { user });
        return {
          categories: await ctx.runQuery(
            internal.finance.spendingBreakdown,
            { user, ...args },
          ),
        };
      },
    }),

    list_budgets: tool({
      description:
        "List the user's budgets with their limits, current spend and remaining amount.",
      args: {},
      returns: v.object({ budgets: v.array(budgetShape) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "finance:read",
      handler: async (ctx, _args, user) => {
        await ctx.runMutation(internal.finance.ensureSeed, { user });
        return {
          budgets: await ctx.runQuery(internal.finance.listBudgets, {
            user,
          }),
        };
      },
    }),

    set_budget: tool({
      description:
        "Create or update a monthly or weekly budget. Omit categoryId for the overall budget.",
      args: {
        categoryId: v.optional(v.id("categories")),
        name: v.string(),
        limitUgx: v.number(),
        period: v.union(v.literal("monthly"), v.literal("weekly")),
      },
      returns: v.object({ id: v.string(), updated: v.boolean() }),
      annotations: { openWorldHint: false },
      scope: "finance:write",
      handler: async (ctx, args, user) => {
        await ctx.runMutation(internal.finance.ensureSeed, { user });
        return await ctx.runMutation(internal.finance.setBudget, {
          user,
          ...args,
        });
      },
    }),

    list_goals: tool({
      description: "List the user's savings goals and progress.",
      args: {},
      returns: v.object({ goals: v.array(goalShape) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "finance:read",
      handler: async (ctx, _args, user) => {
        await ctx.runMutation(internal.finance.ensureSeed, { user });
        return {
          goals: await ctx.runQuery(internal.finance.listGoals, { user }),
        };
      },
    }),

    contribute_to_goal: tool({
      description:
        "Add money to a savings goal and record the contribution against the user's account.",
      args: {
        goalId: v.id("goals"),
        amountUgx: v.number(),
        accountId: v.optional(v.id("accounts")),
        note: v.optional(v.string()),
        date: v.string(),
      },
      returns: v.object({
        id: v.string(),
        savedUgx: v.number(),
        targetUgx: v.number(),
      }),
      annotations: { openWorldHint: false },
      scope: "finance:write",
      handler: async (ctx, args, user) =>
        await ctx.runMutation(internal.finance.contributeToGoal, {
          user,
          ...args,
        }),
    }),

    list_debts: tool({
      description: "List money the user borrowed or lent and the balances.",
      args: {},
      returns: v.object({ debts: v.array(debtShape) }),
      annotations: { readOnlyHint: true, openWorldHint: false },
      scope: "finance:read",
      handler: async (ctx, _args, user) => {
        await ctx.runMutation(internal.finance.ensureSeed, { user });
        return {
          debts: await ctx.runQuery(internal.finance.listDebts, { user }),
        };
      },
    }),

    record_debt_payment: tool({
      description:
        "Record a payment against a debt. The balance decreases by the payment amount.",
      args: {
        debtId: v.id("debts"),
        amountUgx: v.number(),
        accountId: v.optional(v.id("accounts")),
        note: v.optional(v.string()),
        date: v.string(),
      },
      returns: v.object({
        id: v.string(),
        balanceUgx: v.number(),
        paidUgx: v.number(),
      }),
      annotations: { openWorldHint: false },
      scope: "finance:write",
      handler: async (ctx, args, user) =>
        await ctx.runMutation(internal.finance.recordDebtPayment, {
          user,
          ...args,
        }),
    }),
  },
});

export const {
  getAuthRequest,
  findAuthRequest,
  authorize,
  listConnections,
  revokeConnection,
  createApiKey,
} = mcp.api({ getUserId: getAuthUserId });

export const { createApiKeyForUser } = mcp.internalApi();
