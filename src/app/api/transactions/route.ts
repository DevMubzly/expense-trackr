import { connection, type NextRequest } from "next/server";
import { categoryExists, isCategoryKind } from "@/lib/db";
import { addTransaction, getAccount, listTransactions } from "@/lib/db";
import type { Currency, TransactionSource, TransactionType } from "@/lib/types";

const TYPES: TransactionType[] = ["expense", "income", "transfer"];
const SOURCES: TransactionSource[] = ["manual", "ai", "receipt", "recurring", "import"];

function isTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59;
}

export async function GET(request: NextRequest) {
  await connection();
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const limit = params.get("limit");

  return Response.json(
    listTransactions({
      type: TYPES.includes(type as TransactionType) ? (type as TransactionType) : undefined,
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      category: params.get("category") ?? undefined,
      account: params.get("account") ?? undefined,
      q: params.get("q") ?? undefined,
      limit: limit ? Number(limit) : undefined,
    }),
  );
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const type = body.type as TransactionType;
  if (!TYPES.includes(type)) {
    return Response.json({ error: "Unknown transaction type" }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Amount must be a positive number" }, { status: 400 });
  }

  const currency = body.currency === "USD" ? "USD" : ("UGX" satisfies Currency);
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  if (!getAccount(accountId)) {
    return Response.json({ error: "Unknown account" }, { status: 400 });
  }

  const spentOn = typeof body.spentOn === "string" ? body.spentOn : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
    return Response.json({ error: "spentOn must be YYYY-MM-DD" }, { status: 400 });
  }

  let spentTime: string | undefined;
  if (body.spentTime !== undefined) {
    if (typeof body.spentTime !== "string" || !isTime(body.spentTime)) {
      return Response.json({ error: "spentTime must be HH:mm" }, { status: 400 });
    }
    spentTime = body.spentTime;
  }

  let category = "";
  let toAccountId: string | undefined;
  if (type === "transfer") {
    toAccountId = typeof body.toAccountId === "string" ? body.toAccountId : "";
    if (!toAccountId || toAccountId === accountId || !getAccount(toAccountId)) {
      return Response.json({ error: "Choose two different accounts" }, { status: 400 });
    }
  } else {
    category = typeof body.category === "string" ? body.category : "";
    if (!categoryExists(category) || !isCategoryKind(category, type)) {
      return Response.json({ error: "Unknown category" }, { status: 400 });
    }
  }

  const feeUgx = Math.max(0, Math.round(Number(body.feeUgx ?? 0)));
  if (!Number.isFinite(feeUgx)) {
    return Response.json({ error: "Invalid fee" }, { status: 400 });
  }

  const source = SOURCES.includes(body.source as TransactionSource)
    ? (body.source as TransactionSource)
    : "manual";

  const transaction = addTransaction({
    type,
    amount,
    currency,
    category,
    accountId,
    toAccountId,
    feeUgx,
    note: typeof body.note === "string" ? body.note.slice(0, 240) : "",
    spentOn,
    spentTime,
    source,
  });

  return Response.json(transaction, { status: 201 });
}
