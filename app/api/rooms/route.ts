/**
 * POST /api/rooms — Create a new room
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { hashPasscode } from "@/lib/auth";
import { rateLimiters } from "@/lib/rate-limit";
import { createRoomSchema } from "@/lib/validation";
import { generateSlug } from "@/lib/slug";
import { ensureRoomDir, ensureStorageDir } from "@/lib/storage";
import Room from "@/models/Room";
import { getClientIP, errorResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const ip = await getClientIP();
    const rateCheck = rateLimiters.createRoom(ip);
    if (!rateCheck.allowed) {
      return errorResponse("Too many rooms created. Try again later.", 429);
    }

    // Parse and validate body
    const body = await request.json();
    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const { passcode, expirationHours } = parsed.data;
    const finalPasscode = passcode || Math.floor(1000 + Math.random() * 9000).toString();
    let { slug } = parsed.data;

    await connectDB();

    // Generate slug if not provided
    if (!slug) {
      let attempts = 0;
      do {
        slug = generateSlug();
        const existing = await Room.findOne({ slug });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return errorResponse("Could not generate a unique room name. Try again.", 500);
      }
    } else {
      // Check if slug already exists
      const existing = await Room.findOne({ slug });
      if (existing) {
        return errorResponse("A room with this name already exists.", 409);
      }
    }

    // Hash passcode
    const passcodeHash = await hashPasscode(finalPasscode);

    // Calculate expiration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationHours * 60 * 60 * 1000);

    // Create room in MongoDB
    const room = await Room.create({
      slug,
      passcodeHash,
      expiresAt,
      status: "active",
    });

    // Create storage directory
    await ensureStorageDir();
    await ensureRoomDir(room._id.toString());

    // Automatically authenticate the creator
    const { createRoomSession, setSessionCookie } = await import("@/lib/auth");
    const { token } = await createRoomSession(room._id.toString(), room.slug);
    await setSessionCookie(token);

    return Response.json(
      {
        slug: room.slug,
        passcode: finalPasscode,
        expiresAt: room.expiresAt.toISOString(),
        createdAt: room.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] Room creation failed:", error);
    return errorResponse("Failed to create room.", 500);
  }
}
