import { connection, type NextRequest } from "next/server";
import { exportData, transactionsCsv } from "@/lib/db";

export async function GET(request: NextRequest) {
  await connection();
  const format = request.nextUrl.searchParams.get("format");

  if (format === "csv") {
    return new Response(transactionsCsv(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="expense-trackr-transactions.csv"',
      },
    });
  }

  return new Response(JSON.stringify(exportData(), null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="expense-trackr-backup.json"',
    },
  });
}
