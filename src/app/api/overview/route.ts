import { connection } from "next/server";
import { computeOverview } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json(computeOverview());
}
