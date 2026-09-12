import { NextRequest, NextResponse } from "next/server";
import { appendTelegramUpdate } from "@/lib/telegram-pulse";

export const runtime = "nodejs";

function isSet(value: string | undefined) {
  return Boolean(value && !value.includes("__PASTE_") && !value.includes("__GENERATE_"));
}

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (isSet(configuredSecret)) {
    const incomingSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (incomingSecret !== configuredSecret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const update = await request.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });

  const result = appendTelegramUpdate(update);
  return NextResponse.json({ ok: true, stored: result.stored, reason: result.stored ? undefined : result.reason });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "telegram-webhook", stores: "redacted-message-buffer" });
}
