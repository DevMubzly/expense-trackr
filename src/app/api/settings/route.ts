import { connection, type NextRequest } from "next/server";
import { getAccount, getSettings, updateSettings } from "@/lib/db";
import type { Settings } from "@/lib/types";


export async function GET() {
  await connection();
  return Response.json(getSettings());
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Partial<Settings> = {};

  if (body.monthlyBudget !== undefined) {
    const budget = Number(body.monthlyBudget);
    if (!Number.isFinite(budget) || budget < 0) {
      return Response.json({ error: "Invalid budget" }, { status: 400 });
    }
    patch.monthlyBudget = Math.round(budget);
  }
  if (body.usdRate !== undefined) {
    const rate = Number(body.usdRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      return Response.json({ error: "Invalid rate" }, { status: 400 });
    }
    patch.usdRate = rate;
  }
  if (body.defaultCurrency !== undefined) {
    if (body.defaultCurrency !== "UGX" && body.defaultCurrency !== "USD") {
      return Response.json({ error: "Invalid currency" }, { status: 400 });
    }
    patch.defaultCurrency = body.defaultCurrency;
  }
  if (body.defaultAccountId !== undefined) {
    if (typeof body.defaultAccountId !== "string" || !getAccount(body.defaultAccountId)) {
      return Response.json({ error: "Invalid default account" }, { status: 400 });
    }
    patch.defaultAccountId = body.defaultAccountId;
  }
  if (body.payday !== undefined) {
    const payday = Number(body.payday);
    if (!Number.isInteger(payday) || payday < 1 || payday > 31) {
      return Response.json({ error: "Invalid payday" }, { status: 400 });
    }
    patch.payday = payday;
  }
  if (body.forecastBufferUgx !== undefined) {
    const buffer = Number(body.forecastBufferUgx);
    if (!Number.isFinite(buffer) || buffer < 0) {
      return Response.json({ error: "Invalid forecast buffer" }, { status: 400 });
    }
    patch.forecastBufferUgx = Math.round(buffer);
  }
  if (body.weekPlan !== undefined) {
    if (typeof body.weekPlan !== "object" || body.weekPlan === null) {
      return Response.json({ error: "Invalid week plan" }, { status: 400 });
    }
    patch.weekPlan = body.weekPlan as Settings["weekPlan"];
  }
  if (body.profileName !== undefined) {
    const name = String(body.profileName).trim();
    if (!name) {
      return Response.json({ error: "Invalid profile name" }, { status: 400 });
    }
    patch.profileName = name.slice(0, 80);
  }
  if (body.profileEmail !== undefined) {
    const email = String(body.profileEmail).trim();
    if (!email || !email.includes("@")) {
      return Response.json({ error: "Invalid profile email" }, { status: 400 });
    }
    patch.profileEmail = email.slice(0, 160);
  }
  if (body.avatarDataUrl !== undefined) {
    const avatar = String(body.avatarDataUrl);
    if (avatar && !avatar.startsWith("data:image/")) {
      return Response.json({ error: "Invalid avatar" }, { status: 400 });
    }
    patch.avatarDataUrl = avatar;
  }

  return Response.json(updateSettings(patch));
}
