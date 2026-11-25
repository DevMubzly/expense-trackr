import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Category } from "./categories";
import type {
  Account,
  Transaction,
  TransactionSource,
} from "./types";

/** One row as returned by `convex/transactions.ts#list`. */
export type ConvexTransaction = FunctionReturnType<
  typeof api.transactions.list
>[number];

export type TransactionAccountInput = {
  legacyId: string;
  name: string;
  type: Account["type"];
  color: string;
  provider?: string;
};

export type TransactionCategoryInput = {
  legacyId: string;
  label: string;
  kind: Category["kind"];
  color: string;
  iconKey: string;
};

/** Transactions carry descriptors so Convex can resolve the matching rows. */
export function toAccountInput(
  account: Account,
): TransactionAccountInput {
  return {
    legacyId: account.id,
    name: account.name,
    type: account.type,
    color: account.color,
    provider: account.provider,
  };
}

export function toCategoryInput(
  category: Category,
): TransactionCategoryInput {
  return {
    legacyId: category.id,
    label: category.label,
    kind: category.kind,
    color: category.color,
    iconKey: category.iconKey,
  };
}

export function toTransaction(row: ConvexTransaction): Transaction {
  return {
    ...row,
    source: row.source as TransactionSource,
  };
}

export function asTransactionId(id: string): Id<"transactions"> {
  return id as Id<"transactions">;
}
