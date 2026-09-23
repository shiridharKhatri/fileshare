/**
 * GET /api/rooms/[slug] — Get room information (public: exists? expired? authenticated?)
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireRoomAuth } from "@/lib/auth";
import Room from "@/models/Room";
import { errorResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    await connectDB();

    const room = await Room.findOne({ slug });
    if (!room) {
      return errorResponse("Room not found.", 404);
    }

    const isExpired = room.status === "expired" || room.expiresAt <= new Date();

    if (isExpired) {
      return Response.json({
        slug: room.slug,
        status: "expired",
        exists: true,
        authenticated: false,
      });
    }

    // Check if user is authenticated for this room
    const session = await requireRoomAuth(slug);

    return Response.json({
      slug: room.slug,
      status: room.status,
      exists: true,
      authenticated: !!session,
      expiresAt: room.expiresAt.toISOString(),
      createdAt: room.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[API] Room fetch failed:", error);
    return errorResponse("Failed to fetch room.", 500);
  }
}
