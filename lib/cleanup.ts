/**
 * Cleanup service for expired rooms.
 * Handles MongoDB cleanup + physical file deletion.
 * All operations are idempotent and safe to retry.
 */

import { connectDB } from "./db";
import Room from "../models/Room";
import FileModel from "../models/File";
import Message from "../models/Message";
import { deleteRoomDir, listRoomDirs } from "./storage";

/**
 * Clean up all expired rooms:
 * 1. Find rooms where status="active" and expiresAt <= now
 * 2. Delete physical files
 * 3. Delete File records
 * 4. Delete Message records
 * 5. Mark room as expired
 */
export async function cleanupExpiredRooms(): Promise<{
  cleaned: number;
  errors: string[];
}> {
  await connectDB();

  const now = new Date();
  const errors: string[] = [];
  let cleaned = 0;

  try {
    const expiredRooms = await Room.find({
      status: "active",
      expiresAt: { $lte: now },
    });

    for (const room of expiredRooms) {
      try {
        const roomId = room._id.toString();

        // Delete physical files first
        try {
          await deleteRoomDir(roomId);
        } catch (err) {
          errors.push(`Failed to delete room dir ${roomId}: ${err}`);
          // Continue — we still want to clean up DB records
        }

        // Delete file metadata
        await FileModel.deleteMany({ roomId: room._id });

        // Delete messages
        await Message.deleteMany({ roomId: room._id });

        // Mark room as expired
        room.status = "expired";
        await room.save();

        cleaned++;
        console.log(`[Cleanup] Room ${room.slug} (${roomId}) cleaned up`);
      } catch (err) {
        errors.push(`Failed to cleanup room ${room.slug}: ${err}`);
      }
    }
  } catch (err) {
    errors.push(`Cleanup query failed: ${err}`);
  }

  return { cleaned, errors };
}

/**
 * Clean up orphaned room directories.
 * Finds directories in storage that don't have a corresponding active room in MongoDB.
 */
export async function cleanupOrphanFiles(): Promise<{
  cleaned: number;
  errors: string[];
}> {
  await connectDB();

  const errors: string[] = [];
  let cleaned = 0;

  try {
    const dirs = await listRoomDirs();

    for (const dirName of dirs) {
      // Only process valid ObjectId-named directories
      if (!/^[a-fA-F0-9]{24}$/.test(dirName)) {
        continue;
      }

      // Check if room exists and is active
      const room = await Room.findById(dirName);
      if (!room || room.status === "expired") {
        try {
          await deleteRoomDir(dirName);
          cleaned++;
          console.log(`[Cleanup] Orphan directory ${dirName} removed`);
        } catch (err) {
          errors.push(`Failed to delete orphan dir ${dirName}: ${err}`);
        }
      }
    }
  } catch (err) {
    errors.push(`Orphan cleanup failed: ${err}`);
  }

  return { cleaned, errors };
}

/**
 * Run full cleanup cycle.
 */
export async function runCleanup(): Promise<void> {
  console.log("[Cleanup] Starting cleanup cycle...");

  const expired = await cleanupExpiredRooms();
  console.log(
    `[Cleanup] Expired rooms cleaned: ${expired.cleaned}, errors: ${expired.errors.length}`
  );

  const orphans = await cleanupOrphanFiles();
  console.log(
    `[Cleanup] Orphan dirs cleaned: ${orphans.cleaned}, errors: ${orphans.errors.length}`
  );

  if (expired.errors.length > 0 || orphans.errors.length > 0) {
    console.error("[Cleanup] Errors:", [
      ...expired.errors,
      ...orphans.errors,
    ]);
  }

  console.log("[Cleanup] Cleanup cycle complete");
}
