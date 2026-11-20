import type { NextRequest } from "next/server";
import { CATEGORY_ICON_OPTIONS } from "@/lib/categories";
import { deleteCategory, updateCategory } from "@/lib/db";

export async function PATCH(
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

  const patch: {
    label?: string;
    color?: string;
    iconKey?: (typeof CATEGORY_ICON_OPTIONS)[number]["key"];
  } = {};

  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    patch.label = label;
  }
  if (body.color !== undefined) {
    const color = String(body.color).trim();
    if (!color) {
      return Response.json({ error: "Color is required" }, { status: 400 });
    }
    patch.color = color;
  }
  if (body.iconKey !== undefined) {
    const iconKey = String(body.iconKey);
    if (!CATEGORY_ICON_OPTIONS.some((option) => option.key === iconKey)) {
      return Response.json({ error: "Invalid icon" }, { status: 400 });
    }
    patch.iconKey = iconKey as (typeof CATEGORY_ICON_OPTIONS)[number]["key"];
  }

  const category = updateCategory(id, patch);
  if (!category) {
    return Response.json({ error: "Category not found" }, { status: 404 });
  }
  return Response.json(category);
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const result = deleteCategory(id);
  if (!result.ok) {
    return Response.json(
      { error: result.error ?? "Could not delete category" },
      { status: 409 },
    );
  }
  return Response.json({ ok: true });
}
