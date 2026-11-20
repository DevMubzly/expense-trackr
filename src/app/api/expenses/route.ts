import { connection, type NextRequest } from "next/server";
import { addExpense, listExpenses } from "@/lib/db";
import { categoryExists } from "@/lib/db";
import type { Currency } from "@/lib/types";


export async function GET(request: NextRequest) {
  await connection();
  const params = request.nextUrl.searchParams;
  const limit = params.get("limit");

  return Response.json(
    listExpenses({
      from: params.get("from") ?? undefined,
      to: params.get("to") ?? undefined,
      category: params.get("category") ?? undefined,
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

  const amount = Number(body.amount);
  const currency = body.currency === "USD" ? "USD" : ("UGX" satisfies Currency);
  const category = typeof body.category === "string" ? body.category : "";
  const spentOn = typeof body.spentOn === "string" ? body.spentOn : "";

  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Amount must be a positive number" }, { status: 400 });
  }
  if (!categoryExists(category)) {
    return Response.json({ error: "Unknown category" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) {
    return Response.json({ error: "spentOn must be YYYY-MM-DD" }, { status: 400 });
  }

  const expense = addExpense({
    amount,
    currency,
    category,
    note: typeof body.note === "string" ? body.note : "",
    spentOn,
  });

  return Response.json(expense, { status: 201 });
}
