import { connection, type NextRequest } from "next/server";
import { categoryExists, isCategoryKind } from "@/lib/db";
import { addBudget, listBudgets } from "@/lib/db";

export async function GET(request: NextRequest) {
  await connection();
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  return Response.json(
    listBudgets(
      month && /^\d{4}-\d{2}$/.test(month) ? month : undefined,
    ),
  );
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const categoryId =
    typeof body.categoryId === "string" ? body.categoryId : "all";
  const limitUgx = Number(body.limitUgx);
  const period = body.period === "weekly" ? "weekly" : "monthly";

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (categoryId !== "all" && (!categoryExists(categoryId) || !isCategoryKind(categoryId, "expense"))) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!Number.isFinite(limitUgx) || limitUgx <= 0) {
    return Response.json({ error: "Invalid limit" }, { status: 400 });
  }

  return Response.json(
    addBudget({
      name,
      categoryId,
      limitUgx: Math.round(limitUgx),
      period,
      color:
        typeof body.color === "string" && body.color.trim()
          ? body.color
          : "oklch(0.56 0.14 152)",
    }),
    { status: 201 },
  );
}
