import type { NextRequest } from "next/server";
import { CATEGORY_BY_ID, isCategoryOfKind } from "@/lib/categories";
import {
  deleteRecurring,
  getAccount,
  listRecurring,
  updateRecurring,
} from "@/lib/db";
import type { RecurringRule, TransactionType } from "@/lib/types";

const TYPES: TransactionType[] = ["expense", "income", "transfer"];
const FREQUENCIES: RecurringRule["frequency"][] = ["daily", "weekly", "monthly"];

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!listRecurring().some((rule) => rule.id === id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return Response.json({ error: "Invalid name" }, { status: 400 });
    patch.name = name;
  }
  if (body.type !== undefined) {
    if (!TYPES.includes(body.type as TransactionType)) {
      return Response.json({ error: "Invalid type" }, { status: 400 });
    }
    patch.type = body.type;
  }
  if (body.amountUgx !== undefined) {
    const value = Number(body.amountUgx);
    if (!Number.isFinite(value) || value <= 0) {
      return Response.json({ error: "Invalid amount" }, { status: 400 });
    }
    patch.amountUgx = Math.round(value);
  }
  if (body.category !== undefined) {
    const category = String(body.category);
    if (category && !CATEGORY_BY_ID.has(category)) {
      return Response.json({ error: "Invalid category" }, { status: 400 });
    }
    patch.category = category;
  }
  if (body.accountId !== undefined) {
    if (typeof body.accountId !== "string" || !getAccount(body.accountId)) {
      return Response.json({ error: "Unknown account" }, { status: 400 });
    }
    patch.accountId = body.accountId;
  }
  if (body.toAccountId !== undefined) {
    if (body.toAccountId && !getAccount(String(body.toAccountId))) {
      return Response.json({ error: "Unknown destination" }, { status: 400 });
    }
    patch.toAccountId = body.toAccountId || undefined;
  }
  if (body.frequency !== undefined) {
    if (!FREQUENCIES.includes(body.frequency as RecurringRule["frequency"])) {
      return Response.json({ error: "Invalid frequency" }, { status: 400 });
    }
    patch.frequency = body.frequency;
  }
  if (body.nextOn !== undefined) {
    if (typeof body.nextOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.nextOn)) {
      return Response.json({ error: "Invalid next date" }, { status: 400 });
    }
    patch.nextOn = body.nextOn;
  }
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (body.note !== undefined) patch.note = String(body.note).slice(0, 240);

  if (patch.type && patch.type !== "transfer" && patch.category) {
    if (!isCategoryOfKind(String(patch.category), patch.type as "expense" | "income")) {
      return Response.json({ error: "Invalid category" }, { status: 400 });
    }
  }

  return Response.json(updateRecurring(id, patch));
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!deleteRecurring(id)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
