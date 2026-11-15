import { connection } from "next/server";
import { getSettings } from "@/lib/db";


/**
 * Mock FX feed. Nudges the stored rate by a small deterministic amount per day
 * so the converter feels alive. Swap for a real provider later.
 */
export async function GET() {
  await connection();
  const base = getSettings().usdRate;
  const day = Math.floor(Date.now() / 86_400_000);
  const drift = Math.sin(day / 3) * 18 + Math.cos(day / 7) * 9;

  return Response.json({
    pair: "USD/UGX",
    rate: Math.round((base + drift) * 100) / 100,
    source: "mock",
    updatedAt: new Date().toISOString(),
  });
}
