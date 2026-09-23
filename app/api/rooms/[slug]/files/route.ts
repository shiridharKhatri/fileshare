/**
 * POST /api/rooms/[slug]/files — Upload files
 * GET  /api/rooms/[slug]/files — List files
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireRoomAuth } from "@/lib/auth";
import { rateLimiters } from "@/lib/rate-limit";
import Room from "@/models/Room";
import FileModel from "@/models/File";
import { parseUpload } from "@/lib/multer";
import {
  ensureRoomDir,
  checkStorageLimits,
  getRoomStorageSize,
  deleteFile as deletePhysicalFile,
} from "@/lib/storage";
import { config } from "@/lib/config";
import { emitToRoom } from "@/lib/socket-server";
import { errorResponse } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// Disable Next.js body parsing — we need the raw body for Multer
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Auth check
    const session = await requireRoomAuth(slug);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    // Rate limit
    const rateCheck = rateLimiters.upload(session.sessionId);
    if (!rateCheck.allowed) {
      return errorResponse("Too many uploads. Please wait.", 429);
    }

    await connectDB();

    // Verify room is active
    const room = await Room.findOne({ slug, status: "active" });
    if (!room || room.expiresAt <= new Date()) {
      return errorResponse("Room not found or expired.", 404);
    }

    const roomId = room._id.toString();

    // Check file count limit
    const existingFileCount = await FileModel.countDocuments({
      roomId: room._id,
    });
    if (existingFileCount >= config.maxFilesPerRoom) {
      return errorResponse(
        `Maximum ${config.maxFilesPerRoom} files per room reached.`,
        400
      );
    }

    // Ensure room directory exists
    await ensureRoomDir(roomId);

    // Parse upload with Multer
    const { files, error } = await parseUpload(request, roomId);
    if (error) {
      return errorResponse(error, 400);
    }

    if (files.length === 0) {
      return errorResponse("No files uploaded.", 400);
    }

    // Validate storage limits and save metadata for each file
    const savedFiles = [];
    const failedFiles = [];

    for (const file of files) {
      // Check storage limits
      const limitCheck = await checkStorageLimits(roomId, file.size);
      if (!limitCheck.allowed) {
        // Delete the physical file since we can't accept it
        try {
          await deletePhysicalFile(roomId, file.filename);
        } catch {
          // Best effort cleanup
        }
        failedFiles.push({
          name: file.originalname,
          reason: limitCheck.reason,
        });
        continue;
      }

      // Save metadata to MongoDB
      const fileDoc = await FileModel.create({
        roomId: room._id,
        originalName: file.originalname,
        storedName: file.filename,
        relativePath: `rooms/${roomId}/${file.filename}`,
        mimeType: file.mimetype || "application/octet-stream",
        size: file.size,
        uploadedAt: new Date(),
        uploadedBySession: session.sessionId,
        expiresAt: room.expiresAt,
      });

      const savedFile = {
        id: fileDoc._id.toString(),
        originalName: fileDoc.originalName,
        size: fileDoc.size,
        mimeType: fileDoc.mimeType,
        uploadedAt: fileDoc.uploadedAt.toISOString(),
      };

      savedFiles.push(savedFile);

      // Emit real-time event
      emitToRoom(slug, "file:uploaded", savedFile);
    }

    return Response.json({
      files: savedFiles,
      failed: failedFiles,
      totalUploaded: savedFiles.length,
    }, { status: 201 });
  } catch (error) {
    console.error("[API] File upload failed:", error);
    return errorResponse("Upload failed.", 500);
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Auth check
    const session = await requireRoomAuth(slug);
    if (!session) {
      return errorResponse("Unauthorized", 401);
    }

    await connectDB();

    // Verify room
    const room = await Room.findOne({ slug });
    if (!room) {
      return errorResponse("Room not found.", 404);
    }

    const files = await FileModel.find({ roomId: room._id })
      .sort({ uploadedAt: 1 })
      .select("originalName size mimeType uploadedAt uploadedBySession");

    const storageUsed = await getRoomStorageSize(room._id.toString());

    return Response.json({
      files: files.map((f) => ({
        id: f._id.toString(),
        originalName: f.originalName,
        size: f.size,
        mimeType: f.mimeType,
        uploadedAt: f.uploadedAt.toISOString(),
        isOwn: f.uploadedBySession === session.sessionId,
      })),
      storageUsed,
      storageLimit: config.maxRoomStorageBytes,
    });
  } catch (error) {
    console.error("[API] File list failed:", error);
    return errorResponse("Failed to list files.", 500);
  }
}
