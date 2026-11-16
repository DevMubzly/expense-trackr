import { connection } from "next/server";
import { runDueRecurring } from "@/lib/db";

export async function POST() {
  await connection();
  return Response.json(runDueRecurring());
}
