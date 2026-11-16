import { connection, type NextRequest } from "next/server";
import { addAccount, listAccountBalances } from "@/lib/db";
import type { AccountType } from "@/lib/types";

const TYPES: AccountType[] = ["cash", "bank", "momo"];

export async function GET() {
  await connection();
  return Response.json(listAccountBalances());
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  const type = body.type as AccountType;
  if (!TYPES.includes(type)) {
    return Response.json({ error: "Unknown account type" }, { status: 400 });
  }

  const openingBalanceUgx = Number(body.openingBalanceUgx ?? 0);
  if (!Number.isFinite(openingBalanceUgx) || openingBalanceUgx < 0) {
    return Response.json({ error: "Invalid opening balance" }, { status: 400 });
  }

  return Response.json(
    addAccount({
      name,
      type,
      provider: typeof body.provider === "string" ? body.provider : undefined,
      color:
        typeof body.color === "string" && body.color.trim()
          ? body.color
          : "oklch(0.7 0.08 250)",
      openingBalanceUgx: Math.round(openingBalanceUgx),
    }),
    { status: 201 },
  );
}
