import type { NextRequest } from "next/server";
import { CATEGORY_BY_ID, isCategoryOfKind } from "@/lib/categories";
import { deleteTransaction, getAccount, getTransaction, updateTransaction } from "@/lib/db";
import type { Currency, TransactionSource, TransactionType } from "@/lib/types";

const TYPES: TransactionType[] = ["expense", "income", "transfer"];
const SOURCES: TransactionSource[] = ["manual", "ai", "receipt", "recurring", "import"];

function isTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const current = getTransaction(id);
  if (!current) return Response.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = (body.type ?? current.type) as TransactionType;
  if (!TYPES.includes(type)) {
    return Response.json({ error: "Unknown transaction type" }, { status: 400 });
  }

  const amount = body.amount !== undefined ? Number(body.amount) : current.amount;
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Amount must be a positive number" }, { status: 400 });
  }

  const currency: Currency =
    body.currency === "USD" || body.currency === "UGX"
      ? body.currency
      : current.currency;

  const accountId =
    typeof body.accountId === "string" ? body.accountId : current.accountId;
  if (!getAccount(accountId)) {
    return Response.json({ error: "Unknown account" }, { status: 400 });
  }

  const spentOn =
    typeof body.spentOn === "string" ? body.spentOn : current.spentOn;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
    return Response.json({ error: "spentOn must be YYYY-MM-DD" }, { status: 400 });
  }

  let spentTime = current.spentTime;
  if (body.spentTime !== undefined) {
    if (typeof body.spentTime !== "string" || !isTime(body.spentTime)) {
      return Response.json({ error: "spentTime must be HH:mm" }, { status: 400 });
    }
    spentTime = body.spentTime;
  }

  let category = "";
  let toAccountId: string | undefined;
  if (type === "transfer") {
    toAccountId =
      typeof body.toAccountId === "string"
        ? body.toAccountId
        : current.toAccountId ?? "";
    if (!toAccountId || toAccountId === accountId || !getAccount(toAccountId)) {
      return Response.json({ error: "Choose two different accounts" }, { status: 400 });
    }
  } else {
    category =
      typeof body.category === "string" ? body.category : current.category;
    if (!CATEGORY_BY_ID.has(category) || !isCategoryOfKind(category, type)) {
      return Response.json({ error: "Unknown category" }, { status: 400 });
    }
  }

  const feeUgx = Math.max(
    0,
    Math.round(
      body.feeUgx !== undefined ? Number(body.feeUgx) : current.feeUgx ?? 0,
    ),
  );
  if (!Number.isFinite(feeUgx)) {
    return Response.json({ error: "Invalid fee" }, { status: 400 });
  }

  const source = SOURCES.includes(body.source as TransactionSource)
    ? (body.source as TransactionSource)
    : current.source;

  return Response.json(
    updateTransaction(id, {
      type,
      amount,
      currency,
      category,
      accountId,
      toAccountId,
      feeUgx,
      note:
        typeof body.note === "string"
          ? body.note.slice(0, 240)
          : current.note,
      spentOn,
      spentTime,
      source,
    }),
  );
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!deleteTransaction(id)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
