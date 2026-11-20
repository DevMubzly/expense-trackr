import { connection, type NextRequest } from "next/server";
import {
  addIncomeSource,
  getAccount,
  isCategoryKind,
  listIncomeSources,
} from "@/lib/db";
import type { IncomeSource } from "@/lib/types";

function payload(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const categoryId = typeof body.categoryId === "string" ? body.categoryId : "";
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  const expectedMonthlyUgx = Number(body.expectedMonthlyUgx);
  const cadence = body.cadence === "irregular" ? "irregular" : "fixed";
  const payday =
    body.payday === undefined ? undefined : Number(body.payday);
  const active = body.active !== false;

  if (!name) return { error: "Name is required" };
  if (!isCategoryKind(categoryId, "income")) return { error: "Choose an income category" };
  if (!getAccount(accountId)) return { error: "Unknown account" };
  if (!Number.isFinite(expectedMonthlyUgx) || expectedMonthlyUgx < 0) {
    return { error: "Invalid expected amount" };
  }
  if (
    payday !== undefined &&
    (!Number.isInteger(payday) || payday < 1 || payday > 31)
  ) {
    return { error: "Invalid payday" };
  }

  return {
    value: {
      name,
      categoryId,
      accountId,
      expectedMonthlyUgx: Math.round(expectedMonthlyUgx),
      cadence: cadence as IncomeSource["cadence"],
      payday,
      active,
    },
  };
}

export async function GET() {
  await connection();
  return Response.json(listIncomeSources());
}

export async function POST(request: NextRequest) {
  await connection();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = payload(body);
  if (!result.value) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json(addIncomeSource(result.value), { status: 201 });
}
