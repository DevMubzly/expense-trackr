import type { NextRequest } from "next/server";
import { addGoalContribution } from "@/lib/db";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amountUgx = Number(body.amountUgx);
  if (!Number.isFinite(amountUgx) || amountUgx === 0) {
    return Response.json({ error: "Invalid amount" }, { status: 400 });
  }
  const date = String(body.date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }

  const contribution = addGoalContribution(id, {
    amountUgx,
    date,
    accountId: body.accountId ? String(body.accountId) : undefined,
    note: body.note ? String(body.note).slice(0, 240) : "",
  });
  if (!contribution) {
    return Response.json({ error: "Goal not found" }, { status: 404 });
  }
  return Response.json(contribution, { status: 201 });
}
