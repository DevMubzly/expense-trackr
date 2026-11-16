import type { NextRequest } from "next/server";
import { deleteMember, listMembers, updateMember } from "@/lib/db";
import type { HouseholdMember } from "@/lib/types";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!listMembers().some((member) => member.id === id)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Partial<HouseholdMember> = {};
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.email !== undefined) patch.email = String(body.email).trim();
  if (body.role !== undefined) {
    if (body.role !== "member" && body.role !== "viewer" && body.role !== "owner") {
      return Response.json({ error: "Invalid role" }, { status: 400 });
    }
    patch.role = body.role;
  }
  if (body.status !== undefined) {
    if (body.status !== "active" && body.status !== "invited") {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
  }

  return Response.json(updateMember(id, patch));
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!deleteMember(id)) {
    return Response.json({ error: "Cannot remove this member" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
