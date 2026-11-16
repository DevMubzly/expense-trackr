import { connection, type NextRequest } from "next/server";
import { CATEGORY_BY_ID, isCategoryOfKind } from "@/lib/categories";
import { addRecurring, getAccount, listRecurring } from "@/lib/db";
import type { RecurringRule, TransactionType } from "@/lib/types";

const TYPES: TransactionType[] = ["expense", "income", "transfer"];
const FREQUENCIES: RecurringRule["frequency"][] = ["daily", "weekly", "monthly"];

export async function GET() {
  await connection();
  return Response.json(listRecurring());
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = body.type as TransactionType;
  const amountUgx = Number(body.amountUgx);
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  const frequency = body.frequency as RecurringRule["frequency"];
  const nextOn = typeof body.nextOn === "string" ? body.nextOn : "";
  const category = typeof body.category === "string" ? body.category : "";
  const toAccountId = typeof body.toAccountId === "string" ? body.toAccountId : undefined;

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!TYPES.includes(type)) {
    return Response.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!Number.isFinite(amountUgx) || amountUgx <= 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!getAccount(accountId)) {
    return Response.json({ error: "Unknown account" }, { status: 400 });
  }
  if (!FREQUENCIES.includes(frequency)) {
    return Response.json({ error: "Invalid frequency" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextOn)) {
    return Response.json({ error: "Invalid next date" }, { status: 400 });
  }
  if (type === "transfer") {
    if (!toAccountId || toAccountId === accountId || !getAccount(toAccountId)) {
      return Response.json({ error: "Choose two different accounts" }, { status: 400 });
    }
  } else if (!CATEGORY_BY_ID.has(category) || !isCategoryOfKind(category, type)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }

  return Response.json(
    addRecurring({
      name,
      type,
      amountUgx: Math.round(amountUgx),
      category: type === "transfer" ? "" : category,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : undefined,
      frequency,
      nextOn,
      enabled: body.enabled !== false,
      note: typeof body.note === "string" ? body.note.slice(0, 240) : "",
    }),
    { status: 201 },
  );
}
