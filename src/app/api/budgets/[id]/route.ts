import type { NextRequest } from "next/server";
import { CATEGORY_BY_ID, isCategoryOfKind } from "@/lib/categories";
import { deleteBudget, listBudgets, updateBudget } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!listBudgets().some((budget) => budget.id === id)) {
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
  if (body.categoryId !== undefined) {
    const categoryId = String(body.categoryId);
    if (
      categoryId !== "all" &&
      (!CATEGORY_BY_ID.has(categoryId) || !isCategoryOfKind(categoryId, "expense"))
    ) {
      return Response.json({ error: "Invalid category" }, { status: 400 });
    }
    patch.categoryId = categoryId;
  }
  if (body.limitUgx !== undefined) {
    const value = Number(body.limitUgx);
    if (!Number.isFinite(value) || value <= 0) {
      return Response.json({ error: "Invalid limit" }, { status: 400 });
    }
    patch.limitUgx = Math.round(value);
  }
  if (body.period !== undefined) {
    if (body.period !== "monthly" && body.period !== "weekly") {
      return Response.json({ error: "Invalid period" }, { status: 400 });
    }
    patch.period = body.period;
  }
  if (body.color !== undefined) patch.color = String(body.color);

  return Response.json(updateBudget(id, patch));
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!deleteBudget(id)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
