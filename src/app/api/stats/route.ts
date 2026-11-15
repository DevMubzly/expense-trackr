import { connection, type NextRequest } from "next/server";
import { computeStats } from "@/lib/db";


export async function GET(request: NextRequest) {
  await connection();
  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  return Response.json(computeStats(month));
}
