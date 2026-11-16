import { connection, type NextRequest } from "next/server";
import { addGoal, listGoals } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json(listGoals());
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const targetUgx = Number(body.targetUgx);
  const savedUgx = Number(body.savedUgx ?? 0);
  const deadline = typeof body.deadline === "string" ? body.deadline : "";

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!Number.isFinite(targetUgx) || targetUgx <= 0) {
    return Response.json({ error: "Invalid target" }, { status: 400 });
  }
  if (!Number.isFinite(savedUgx) || savedUgx < 0) {
    return Response.json({ error: "Invalid saved amount" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return Response.json({ error: "Invalid deadline" }, { status: 400 });
  }

  return Response.json(
    addGoal({
      name,
      targetUgx: Math.round(targetUgx),
      savedUgx: Math.round(savedUgx),
      deadline,
      color:
        typeof body.color === "string" && body.color.trim()
          ? body.color
          : "oklch(0.7 0.15 155)",
      note: typeof body.note === "string" ? body.note.slice(0, 240) : "",
    }),
    { status: 201 },
  );
}
