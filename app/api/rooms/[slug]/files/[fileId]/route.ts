/**
 * DELETE /api/rooms/[slug]/files/[fileId] — Delete a file
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireRoomAuth } from "@/lib/auth";
import Room from "@/models/Room";
import FileModel from "@/models/File";
import { deleteFile as deletePhysicalFile } from "@/lib/storage";
import { objectIdSchema } from "@/lib/validation";
import { emitToRoom } from "@/lib/socket-server";
import { errorResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; fileId: string }> }
) {
  try {
    const { slug, fileId } = await params;

    // Auth check
    const session = await requireRoomAuth(slug);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Validate fileId
    const idCheck = objectIdSchema.safeParse(fileId);
    if (!idCheck.success) {
      return errorResponse("Invalid file ID.", 400);
    }

    await connectDB();

    // Verify room is active
    const room = await Room.findOne({ slug, status: "active" });
    if (!room || room.expiresAt <= new Date()) {
      return errorResponse("Room not found or expired.", 404);
    }

    // Verify file belongs to this room (IDOR protection)
    const file = await FileModel.findOne({
      _id: fileId,
      roomId: room._id,
    });
    if (!file) {
      return errorResponse("File not found.", 404);
    }

    // Delete physical file first
    try {
      await deletePhysicalFile(room._id.toString(), file.storedName);
    } catch (err) {
      console.error("[API] Physical file deletion failed:", err);
      // Continue — still delete the DB record
    }

    // Delete MongoDB record
    await FileModel.deleteOne({ _id: file._id });

    // Emit real-time event
    emitToRoom(slug, "file:deleted", { id: fileId });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[API] File delete failed:", error);
    return errorResponse("Failed to delete file.", 500);
  }
}
