import type { NextRequest } from "next/server";
import { archiveAccount, getAccount, updateAccount } from "@/lib/db";
import type { AccountType } from "@/lib/types";

const TYPES: AccountType[] = ["cash", "bank", "momo"];

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!getAccount(id)) return Response.json({ error: "Not found" }, { status: 404 });

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
  if (body.type !== undefined) {
    if (!TYPES.includes(body.type as AccountType)) {
      return Response.json({ error: "Invalid account type" }, { status: 400 });
    }
    patch.type = body.type;
  }
  if (body.provider !== undefined) {
    patch.provider = body.provider === null ? undefined : String(body.provider);
  }
  if (body.color !== undefined) {
    patch.color = String(body.color);
  }
  if (body.openingBalanceUgx !== undefined) {
    const balance = Number(body.openingBalanceUgx);
    if (!Number.isFinite(balance) || balance < 0) {
      return Response.json({ error: "Invalid opening balance" }, { status: 400 });
    }
    patch.openingBalanceUgx = Math.round(balance);
  }
  if (typeof body.archived === "boolean") {
    patch.archived = body.archived;
  }

  return Response.json(updateAccount(id, patch));
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!archiveAccount(id)) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}
