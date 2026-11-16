import { connection, type NextRequest } from "next/server";
import { addDebt, listDebts } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json(listDebts());
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const direction = body.direction === "lent" ? "lent" : body.direction === "borrowed" ? "borrowed" : null;
  const counterparty =
    typeof body.counterparty === "string" ? body.counterparty.trim() : "";
  const principalUgx = Number(body.principalUgx);
  const balanceUgx = Number(body.balanceUgx ?? body.principalUgx);
  const dueOn = typeof body.dueOn === "string" ? body.dueOn : "";

  if (!direction) return Response.json({ error: "Invalid direction" }, { status: 400 });
  if (!counterparty) {
    return Response.json({ error: "Counterparty is required" }, { status: 400 });
  }
  if (!Number.isFinite(principalUgx) || principalUgx <= 0) {
    return Response.json({ error: "Invalid principal" }, { status: 400 });
  }
  if (!Number.isFinite(balanceUgx) || balanceUgx < 0) {
    return Response.json({ error: "Invalid balance" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) {
    return Response.json({ error: "Invalid due date" }, { status: 400 });
  }

  return Response.json(
    addDebt({
      direction,
      counterparty,
      principalUgx: Math.round(principalUgx),
      balanceUgx: Math.round(balanceUgx),
      dueOn,
      note: typeof body.note === "string" ? body.note.slice(0, 240) : "",
    }),
    { status: 201 },
  );
}
