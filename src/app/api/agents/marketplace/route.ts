import { NextResponse } from "next/server";
import { buildMarketplaceResponse } from "@/lib/marketplace-response";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(buildMarketplaceResponse());
}
