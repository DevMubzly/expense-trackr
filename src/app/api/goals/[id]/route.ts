import type { NextRequest } from "next/server";
import { deleteGoal, listGoals, updateGoal } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!listGoals().some((goal) => goal.id === id)) {
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
  if (body.targetUgx !== undefined) {
    const value = Number(body.targetUgx);
    if (!Number.isFinite(value) || value <= 0) {
      return Response.json({ error: "Invalid target" }, { status: 400 });
    }
    patch.targetUgx = Math.round(value);
  }
  if (body.savedUgx !== undefined) {
    const value = Number(body.savedUgx);
    if (!Number.isFinite(value) || value < 0) {
      return Response.json({ error: "Invalid saved amount" }, { status: 400 });
    }
    patch.savedUgx = Math.round(value);
  }
  if (body.deadline !== undefined) {
    if (typeof body.deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.deadline)) {
      return Response.json({ error: "Invalid deadline" }, { status: 400 });
    }
    patch.deadline = body.deadline;
  }
  if (body.color !== undefined) patch.color = String(body.color);
  if (body.note !== undefined) patch.note = String(body.note).slice(0, 240);

  return Response.json(updateGoal(id, patch));
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!deleteGoal(id)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
