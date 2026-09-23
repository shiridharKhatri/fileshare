/**
 * POST /api/rooms/[slug]/auth — Authenticate to a room
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import {
  verifyPasscode,
  createRoomSession,
  setSessionCookie,
} from "@/lib/auth";
import { rateLimiters } from "@/lib/rate-limit";
import { authSchema } from "@/lib/validation";
import Room from "@/models/Room";
import { getClientIP, errorResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Rate limit (strict for auth)
    const ip = await getClientIP();
    const rateCheck = rateLimiters.auth(ip, slug);
    if (!rateCheck.allowed) {
      const retryAfter = rateCheck.retryAfterMs
        ? Math.ceil(rateCheck.retryAfterMs / 1000)
        : 900;
      return new Response(
        JSON.stringify({
          error: "Too many attempts. Try again later.",
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    // Parse body
    const body = await request.json();
    const parsed = authSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    await connectDB();

    // Find room
    const room = await Room.findOne({ slug });
    if (!room) {
      return errorResponse("Room not found.", 404);
    }

    // Check if expired
    if (room.status === "expired" || room.expiresAt <= new Date()) {
      return errorResponse("This room has expired.", 410);
    }

    // Verify passcode
    const valid = await verifyPasscode(parsed.data.passcode, room.passcodeHash);
    if (!valid) {
      return errorResponse("Incorrect access code.", 401);
    }

    // Create session
    const { token, sessionId } = await createRoomSession(
      room._id.toString(),
      room.slug
    );

    // Set HTTP-only cookie
    await setSessionCookie(token);

    return Response.json({
      success: true,
      slug: room.slug,
      expiresAt: room.expiresAt.toISOString(),
      sessionId,
    });
  } catch (error) {
    console.error("[API] Auth failed:", error);
    return errorResponse("Authentication failed.", 500);
  }
}
