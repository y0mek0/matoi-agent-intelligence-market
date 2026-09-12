import { NextResponse } from "next/server";
import { readAuditEvents } from "@/lib/audit-log";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ events: readAuditEvents() });
}
