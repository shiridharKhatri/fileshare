/**
 * POST /api/rooms/[slug]/logout — Clear room session
 */

import { NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await params; // consume params
  await clearSessionCookie();
  return Response.json({ success: true });
}
