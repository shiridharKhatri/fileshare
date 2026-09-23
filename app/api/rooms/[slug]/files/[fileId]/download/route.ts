/**
 * GET /api/rooms/[slug]/files/[fileId]/download — Stream file download
 */

import { NextRequest } from "next/server";
import { createReadStream, statSync } from "fs";
import { Readable } from "stream";
import { connectDB } from "@/lib/db";
import { requireRoomAuth } from "@/lib/auth";
import { rateLimiters } from "@/lib/rate-limit";
import Room from "@/models/Room";
import FileModel from "@/models/File";
import { safeFilePath, fileExistsSync } from "@/lib/storage";
import { objectIdSchema } from "@/lib/validation";
import { errorResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * Sanitize a filename for use in Content-Disposition header.
 * Prevents header injection attacks.
 */
function sanitizeContentDispositionFilename(filename: string): string {
  // Remove any characters that could cause header injection
  return filename
    .replace(/[\r\n]/g, "")
    .replace(/["\\]/g, "_")
    .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, "_");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; fileId: string }> }
) {
  try {
    const { slug, fileId } = await params;

    // Auth check
    const session = await requireRoomAuth(slug);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Rate limit
    const rateCheck = rateLimiters.download(session.sessionId);
    if (!rateCheck.allowed) {
      return errorResponse("Too many downloads. Please wait.", 429);
    }

    // Validate fileId
    const idCheck = objectIdSchema.safeParse(fileId);
    if (!idCheck.success) {
      return errorResponse("Invalid file ID.", 400);
    }

    await connectDB();

    // Verify room
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

    // Verify file exists on disk
    const filePath = safeFilePath(room._id.toString(), file.storedName);
    if (!fileExistsSync(filePath)) {
      // File missing from disk — clean up DB record
      await FileModel.deleteOne({ _id: file._id });
      return errorResponse("File not found on server.", 404);
    }

    // Get file stats
    const stat = statSync(filePath);

    // Create read stream
    const readStream = createReadStream(filePath);

    // Convert Node.js Readable to Web ReadableStream
    const webStream = Readable.toWeb(readStream) as ReadableStream;

    // Safe content-disposition header
    const safeName = sanitizeContentDispositionFilename(file.originalName);
    const encodedName = encodeURIComponent(file.originalName);

    // Check if inline preview requested
    const isInline = request.nextUrl.searchParams.get("inline") === "true";

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": isInline
          ? `inline; filename="${safeName}"; filename*=UTF-8''${encodedName}`
          : `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(stat.size),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("[API] Download failed:", error);
    return errorResponse("Download failed.", 500);
  }
}
