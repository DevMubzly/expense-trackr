import { connection } from "next/server";
import { listMonths } from "@/lib/db";


export async function GET() {
  await connection();
  return Response.json(listMonths());
}
