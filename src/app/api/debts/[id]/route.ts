import type { NextRequest } from "next/server";
import { deleteDebt, listDebts, updateDebt } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!listDebts().some((debt) => debt.id === id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.direction !== undefined) {
    if (body.direction !== "borrowed" && body.direction !== "lent") {
      return Response.json({ error: "Invalid direction" }, { status: 400 });
    }
    patch.direction = body.direction;
  }
  if (body.counterparty !== undefined) {
    const value = String(body.counterparty).trim();
    if (!value) return Response.json({ error: "Invalid counterparty" }, { status: 400 });
    patch.counterparty = value;
  }
  if (body.principalUgx !== undefined) {
    const value = Number(body.principalUgx);
    if (!Number.isFinite(value) || value <= 0) {
      return Response.json({ error: "Invalid principal" }, { status: 400 });
    }
    patch.principalUgx = Math.round(value);
  }
  if (body.balanceUgx !== undefined) {
    const value = Number(body.balanceUgx);
    if (!Number.isFinite(value) || value < 0) {
      return Response.json({ error: "Invalid balance" }, { status: 400 });
    }
    patch.balanceUgx = Math.round(value);
  }
  if (body.dueOn !== undefined) {
    if (typeof body.dueOn !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dueOn)) {
      return Response.json({ error: "Invalid due date" }, { status: 400 });
    }
    patch.dueOn = body.dueOn;
  }
  if (body.note !== undefined) patch.note = String(body.note).slice(0, 240);

  return Response.json(updateDebt(id, patch));
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!deleteDebt(id)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
