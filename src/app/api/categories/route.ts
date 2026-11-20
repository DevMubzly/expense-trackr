import { connection, type NextRequest } from "next/server";
import { CATEGORY_ICON_OPTIONS, type CategoryKind } from "@/lib/categories";
import { addCategory, listCategories } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json(listCategories());
}

export async function POST(request: NextRequest) {
  await connection();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  const kind: CategoryKind =
    body.kind === "income" ? "income" : "expense";
  const color = typeof body.color === "string" ? body.color.trim() : "";
  const iconKey =
    typeof body.iconKey === "string" ? body.iconKey : "package";

  if (!label) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  if (!color) {
    return Response.json({ error: "Color is required" }, { status: 400 });
  }
  if (!CATEGORY_ICON_OPTIONS.some((option) => option.key === iconKey)) {
    return Response.json({ error: "Invalid icon" }, { status: 400 });
  }

  return Response.json(
    addCategory({
      label,
      kind,
      color,
      iconKey: iconKey as (typeof CATEGORY_ICON_OPTIONS)[number]["key"],
    }),
    { status: 201 },
  );
}
