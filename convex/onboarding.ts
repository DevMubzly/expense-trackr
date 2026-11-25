import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const currency = v.union(
  v.literal("UGX"),
  v.literal("USD"),
  v.literal("KES"),
  v.literal("RWF"),
  v.literal("TZS"),
);
const accountType = v.union(
  v.literal("cash"),
  v.literal("bank"),
  v.literal("momo"),
);

const CATEGORIES = [
  ["Food", "expense", "oklch(0.68 0.16 55)", "restaurant"],
  ["Transport", "expense", "oklch(0.62 0.15 250)", "bus"],
  ["Bills", "expense", "oklch(0.60 0.15 300)", "invoice"],
  ["Health", "expense", "oklch(0.66 0.16 150)", "health"],
  ["Fun", "expense", "oklch(0.64 0.18 345)", "party"],
  ["Shopping", "expense", "oklch(0.70 0.15 20)", "shopping-bag"],
  ["Salary", "income", "oklch(0.68 0.15 155)", "wallet"],
  ["Freelance", "income", "oklch(0.62 0.12 220)", "laptop"],
] as const;

export const complete = mutation({
  args: {
    name: v.string(),
    currency,
    accountName: v.string(),
    accountType,
    budget: v.number(),
    payday: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in before finishing onboarding.");

    const user = await ctx.db.get(userId);
    await ctx.db.patch(userId, { name: args.name.trim() });

    const now = Date.now();
    let accountId = (
      await ctx.db
        .query("accounts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first()
    )?._id;

    if (accountId) {
      await ctx.db.patch(accountId, {
        name: args.accountName.trim(),
        type: args.accountType,
      });
    } else {
      accountId = await ctx.db.insert("accounts", {
        userId,
        name: args.accountName.trim(),
        type: args.accountType,
        provider: args.accountType === "momo" ? "MTN" : undefined,
        color:
          args.accountType === "momo"
            ? "oklch(0.72 0.16 85)"
            : args.accountType === "bank"
              ? "oklch(0.62 0.12 240)"
              : "oklch(0.70 0.14 70)",
        openingBalanceUgx: 0,
        createdAt: now,
      });
    }

    const existingCategory = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existingCategory) {
      for (const [index, [label, kind, color, iconKey]] of CATEGORIES.entries()) {
        await ctx.db.insert("categories", {
          userId,
          label,
          kind,
          color,
          iconKey,
          createdAt: now + index,
        });
      }
    }

    const existingSettings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const settings = {
      userId,
      usdRate: 3800,
      defaultCurrency: args.currency,
      defaultAccountId: accountId,
      payday: Math.min(31, Math.max(1, Math.round(args.payday ?? 28))),
      forecastBufferUgx: 200_000,
      profileName: args.name.trim(),
      profileEmail: typeof user?.email === "string" ? user.email : "",
      profilePhone: "",
      avatarDataUrl: "",
      createdAt: now,
    };
    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, settings);
    } else {
      await ctx.db.insert("settings", settings);
    }

    const existingBudget = await ctx.db
      .query("budgets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!existingBudget) {
      await ctx.db.insert("budgets", {
        userId,
        name: "Overall",
        limitUgx: Math.max(0, Math.round(args.budget)),
        period: "monthly",
        color: "oklch(0.62 0.14 220)",
        createdAt: now,
      });
    } else {
      await ctx.db.patch(existingBudget._id, {
        limitUgx: Math.max(0, Math.round(args.budget)),
      });
    }

    return { userId, accountId };
  },
});

/** Whether this signed-in user has finished onboarding. */
export const status = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { completed: false };
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return { completed: settings !== null };
  },
});
