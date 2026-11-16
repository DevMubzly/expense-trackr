import { connection, type NextRequest } from "next/server";
import { addMember, listMembers } from "@/lib/db";
import type { HouseholdMember } from "@/lib/types";

const ROLES: HouseholdMember["role"][] = ["owner", "member", "viewer"];

export async function GET() {
  await connection();
  return Response.json(listMembers());
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const role = body.role as HouseholdMember["role"];
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (!ROLES.includes(role) || role === "owner") {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  return Response.json(
    addMember({ name, email, role, status: "invited" }),
    { status: 201 },
  );
}
