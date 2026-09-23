/**
 * Storage utilities for managing files on the VPS filesystem.
 * All path operations are sandboxed to prevent path traversal.
 */

import fs from "fs/promises";
import { existsSync, statSync } from "fs";
import path from "path";
import { config } from "./config";

/**
 * Get the base storage directory for rooms.
 * Creates it if it doesn't exist.
 */
export function getRoomsDir(): string {
  return path.join(config.uploadDir, "rooms");
}

/**
 * Ensure the storage directories exist.
 */
export async function ensureStorageDir(): Promise<void> {
  const roomsDir = getRoomsDir();
  await fs.mkdir(roomsDir, { recursive: true });
}

/**
 * Get the storage directory for a specific room.
 * Uses the room's MongoDB ObjectId as directory name (never user-provided slug).
 */
export function getRoomDir(roomId: string): string {
  // Validate roomId format to prevent path traversal
  if (!/^[a-fA-F0-9]{24}$/.test(roomId)) {
    throw new Error("Invalid room ID format");
  }
  return path.join(getRoomsDir(), roomId);
}

/**
 * Ensure a room's storage directory exists.
 */
export async function ensureRoomDir(roomId: string): Promise<string> {
  const dir = getRoomDir(roomId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Safely resolve a file path within a room's directory.
 * Prevents path traversal attacks.
 */
export function safeFilePath(roomId: string, filename: string): string {
  const roomDir = getRoomDir(roomId);
  const resolved = path.resolve(roomDir, filename);

  // Ensure the resolved path is within the room directory
  if (!resolved.startsWith(roomDir + path.sep) && resolved !== roomDir) {
    throw new Error("Path traversal detected");
  }

  return resolved;
}

/**
 * Delete a single file from a room's storage.
 */
export async function deleteFile(
  roomId: string,
  storedName: string
): Promise<void> {
  const filePath = safeFilePath(roomId, storedName);
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    // File might already be deleted — log but don't throw
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}

/**
 * Delete an entire room's storage directory.
 */
export async function deleteRoomDir(roomId: string): Promise<void> {
  const dir = getRoomDir(roomId);
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}

/**
 * Calculate the total storage used by a room.
 */
export async function getRoomStorageSize(roomId: string): Promise<number> {
  const dir = getRoomDir(roomId);

  try {
    const files = await fs.readdir(dir);
    let total = 0;
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        total += stat.size;
      }
    }
    return total;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return 0;
    }
    throw err;
  }
}

/**
 * Check available disk space (basic check using statfs).
 * Returns bytes available. Returns -1 if check fails.
 */
export async function getAvailableDiskSpace(): Promise<number> {
  try {
    const stats = await fs.statfs(config.uploadDir);
    return stats.bfree * stats.bsize;
  } catch {
    return -1;
  }
}

/**
 * Check if uploading a file of given size would exceed limits.
 */
export async function checkStorageLimits(
  roomId: string,
  incomingFileSize: number
): Promise<{ allowed: boolean; reason?: string }> {
  // Check individual file size
  if (incomingFileSize > config.maxFileSizeBytes) {
    return {
      allowed: false,
      reason: `File exceeds maximum size of ${config.maxFileSizeMB} MB`,
    };
  }

  // Check room storage limit
  const currentUsage = await getRoomStorageSize(roomId);
  if (currentUsage + incomingFileSize > config.maxRoomStorageBytes) {
    return {
      allowed: false,
      reason: `Room storage limit of ${config.maxRoomStorageMB} MB would be exceeded`,
    };
  }

  // Check available disk space (require at least 500MB free after this upload)
  const available = await getAvailableDiskSpace();
  if (available > 0 && available - incomingFileSize < 500 * 1024 * 1024) {
    return {
      allowed: false,
      reason: "The server currently cannot accept this upload. Please try again later.",
    };
  }

  return { allowed: true };
}

/**
 * Sanitize a filename for safe filesystem storage.
 * Removes path traversal attempts, null bytes, and unsafe characters.
 */
export function sanitizeFilename(filename: string): string {
  // Remove null bytes
  let safe = filename.replace(/\0/g, "");

  // Get just the basename (remove any directory components)
  safe = path.basename(safe);

  // Remove path traversal patterns
  safe = safe.replace(/\.\./g, "");

  // Replace unsafe filesystem characters
  safe = safe.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");

  // Limit length
  if (safe.length > 200) {
    const ext = path.extname(safe);
    safe = safe.substring(0, 200 - ext.length) + ext;
  }

  // Fallback for empty or invalid filenames
  if (!safe || safe === "." || safe === "..") {
    safe = "unnamed_file";
  }

  return safe;
}

/**
 * List all room directories in storage.
 */
export async function listRoomDirs(): Promise<string[]> {
  const roomsDir = getRoomsDir();
  try {
    const entries = await fs.readdir(roomsDir, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Check if a file exists on disk.
 */
export function fileExistsSync(filePath: string): boolean {
  try {
    return existsSync(filePath) && statSync(filePath).isFile();
  } catch {
    return false;
  }
}
