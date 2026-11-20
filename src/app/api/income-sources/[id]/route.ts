import { connection, type NextRequest } from "next/server";
import {
  deleteIncomeSource,
  getAccount,
  isCategoryKind,
  updateIncomeSource,
} from "@/lib/db";
import type { IncomeSource } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  await connection();
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Partial<IncomeSource> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
    patch.name = name;
  }
  if (body.categoryId !== undefined) {
    const categoryId = String(body.categoryId);
    if (!isCategoryKind(categoryId, "income")) {
      return Response.json({ error: "Invalid income category" }, { status: 400 });
    }
    patch.categoryId = categoryId;
  }
  if (body.accountId !== undefined) {
    const accountId = String(body.accountId);
    if (!getAccount(accountId)) {
      return Response.json({ error: "Unknown account" }, { status: 400 });
    }
    patch.accountId = accountId;
  }
  if (body.expectedMonthlyUgx !== undefined) {
    const amount = Number(body.expectedMonthlyUgx);
    if (!Number.isFinite(amount) || amount < 0) {
      return Response.json({ error: "Invalid expected amount" }, { status: 400 });
    }
    patch.expectedMonthlyUgx = Math.round(amount);
  }
  if (body.cadence !== undefined) {
    patch.cadence = body.cadence === "irregular" ? "irregular" : "fixed";
  }
  if (body.payday !== undefined) {
    if (body.payday === null) {
      patch.payday = undefined;
    } else {
      const payday = Number(body.payday);
      if (!Number.isInteger(payday) || payday < 1 || payday > 31) {
        return Response.json({ error: "Invalid payday" }, { status: 400 });
      }
      patch.payday = payday;
    }
  }
  if (body.active !== undefined) patch.active = body.active !== false;

  const source = updateIncomeSource(id, patch);
  if (!source) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(source);
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  await connection();
  const { id } = await ctx.params;
  if (!deleteIncomeSource(id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ ok: true });
}
