import { connection, type NextRequest } from "next/server";
import { computeStats } from "@/lib/db";
import { isStatPeriod } from "@/lib/periods";


export async function GET(request: NextRequest) {
  await connection();
  const params = request.nextUrl.searchParams;
  const month = params.get("month") ?? undefined;
  const period = params.get("period");
  const dayOffset = Math.max(
    0,
    Number.parseInt(params.get("dayOffset") ?? "0", 10) || 0,
  );
  return Response.json(
    computeStats(
      month,
      isStatPeriod(period) ? period : undefined,
      dayOffset,
    ),
  );
}
