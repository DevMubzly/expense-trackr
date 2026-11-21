import { connection, type NextRequest } from "next/server";
import { addAccount, addBudget, updateSettings } from "@/lib/db";
import { CURRENCY_META } from "@/lib/currencies";
import type { AccountType, Currency } from "@/lib/types";

const ACCOUNT_TYPES: AccountType[] = ["cash", "bank", "momo"];

export async function POST(request: NextRequest) {
  await connection();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const currency = body.currency as Currency;
  const accountName =
    typeof body.accountName === "string" ? body.accountName.trim() : "";
  const accountType = body.accountType as AccountType;
  const budget = Number(body.budget ?? 0);
  const payday = body.payday === undefined ? undefined : Number(body.payday);

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!currency || !(currency in CURRENCY_META)) {
    return Response.json({ error: "Unknown currency" }, { status: 400 });
  }
  if (!accountName) {
    return Response.json({ error: "Account name is required" }, { status: 400 });
  }
  if (!ACCOUNT_TYPES.includes(accountType)) {
    return Response.json({ error: "Unknown account type" }, { status: 400 });
  }
  if (budget < 0 || !Number.isFinite(budget)) {
    return Response.json({ error: "Invalid budget" }, { status: 400 });
  }
  if (payday !== undefined && (!Number.isInteger(payday) || payday < 1 || payday > 31)) {
    return Response.json({ error: "Invalid payday" }, { status: 400 });
  }

  const account = addAccount({
    name: accountName,
    type: accountType,
    color: "oklch(0.7 0.08 250)",
    openingBalanceUgx: 0,
  });

  updateSettings({
    profileName: name,
    defaultCurrency: currency,
    defaultAccountId: account.id,
    ...(payday !== undefined ? { payday } : {}),
  });

  if (budget > 0) {
    addBudget({
      name: "Monthly budget",
      categoryId: "all",
      limitUgx: Math.round(budget),
      period: "monthly",
      color: "oklch(0.56 0.14 152)",
    });
  }

  return Response.json({ ok: true, accountId: account.id }, { status: 201 });
}
