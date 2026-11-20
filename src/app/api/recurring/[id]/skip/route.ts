import type { NextRequest } from "next/server";
import { skipRecurringNext } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const rule = skipRecurringNext(id);
  if (!rule) {
    return Response.json({ error: "Recurring rule not found" }, { status: 404 });
  }
  return Response.json(rule);
}
