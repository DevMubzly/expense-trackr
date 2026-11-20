import { type NextRequest } from "next/server";
import { listPlanActivity } from "@/lib/db";
import { isStatPeriod } from "@/lib/periods";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period");
  return Response.json(
    listPlanActivity(isStatPeriod(period) ? period : "30d"),
  );
}
