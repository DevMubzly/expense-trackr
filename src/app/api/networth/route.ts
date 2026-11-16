import { connection } from "next/server";
import { computeNetWorth } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json(computeNetWorth());
}
