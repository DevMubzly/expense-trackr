import type { NextRequest } from "next/server";
import { categoryExists } from "@/lib/db";
import { deleteExpense, getExpense, updateExpense } from "@/lib/db";
import { CURRENCY_META } from "@/lib/currencies";
import type { Currency, NewExpense } from "@/lib/types";


const patchable = (body: Record<string, unknown>): Partial<NewExpense> => {
  const patch: Partial<NewExpense> = {};

  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");
    patch.amount = amount;
  }
  if (body.currency !== undefined) {
    if (
      typeof body.currency !== "string" ||
      !(body.currency in CURRENCY_META)
    ) {
      throw new Error("Invalid currency");
    }
    patch.currency = body.currency as Currency;
  }
  if (body.category !== undefined) {
    if (typeof body.category !== "string" || !categoryExists(body.category)) {
      throw new Error("Invalid category");
    }
    patch.category = body.category;
  }
  if (body.spentOn !== undefined) {
    if (typeof body.spentOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.spentOn)) {
      throw new Error("Invalid date");
    }
    patch.spentOn = body.spentOn;
  }
  if (body.note !== undefined) patch.note = String(body.note).slice(0, 240);

  return patch;
};

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!getExpense(id)) return Response.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let patch: Partial<NewExpense>;
  try {
    patch = patchable(body);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }

  return Response.json(updateExpense(id, patch));
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!deleteExpense(id)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
