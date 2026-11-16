import { connection, type NextRequest } from "next/server";
import { importData } from "@/lib/db";

export async function POST(request: NextRequest) {
  await connection();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = importData(body);
  if (!result.imported) {
    return Response.json({ error: result.error ?? "Import failed" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
