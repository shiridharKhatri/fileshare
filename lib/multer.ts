/**
 * Multer configuration for disk-based file uploads.
 * Wrapped in a promise-based utility for use in Next.js App Router route handlers.
 */

import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { IncomingMessage, ServerResponse } from "http";
import { Readable } from "stream";
import { config } from "./config";
import { sanitizeFilename, getRoomDir } from "./storage";

/**
 * Create a Multer instance configured for a specific room.
 */
export function createMulterForRoom(roomId: string) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = getRoomDir(roomId);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const sanitized = sanitizeFilename(file.originalname);
      const ext = path.extname(sanitized);
      const base = path.basename(sanitized, ext);
      // UUID prefix ensures uniqueness and prevents collisions
      const storedName = `${uuidv4()}-${base}${ext}`;
      cb(null, storedName);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: config.maxFileSizeBytes,
      files: config.maxFilesPerRoom,
    },
  });
}

/**
 * Parse a multipart form upload using Multer within an App Router route handler.
 * Converts the Web API Request into a Node.js IncomingMessage for Multer compatibility.
 */
export async function parseUpload(
  request: Request,
  roomId: string
): Promise<{ files: Express.Multer.File[]; error?: string }> {
  const upload = createMulterForRoom(roomId);

  return new Promise((resolve) => {
    // Create a minimal IncomingMessage-compatible object from the Web API Request
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // We need the body as a Node.js readable stream
    const bodyStream = request.body;
    if (!bodyStream) {
      resolve({ files: [], error: "No request body" });
      return;
    }

    // Create a mock IncomingMessage from web stream
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const readable = Readable.fromWeb(bodyStream as any);

    // Merge IncomingMessage-like properties
    const req = Object.assign(readable, {
      headers,
      method: request.method,
      url: "",
    }) as unknown as IncomingMessage & { files?: Express.Multer.File[] };

    const res = {} as ServerResponse;

    const uploadMiddleware = upload.array("files", config.maxFilesPerRoom);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uploadMiddleware(req as any, res as any, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            resolve({
              files: [],
              error: `File exceeds maximum size of ${config.maxFileSizeMB} MB`,
            });
          } else if (err.code === "LIMIT_FILE_COUNT") {
            resolve({
              files: [],
              error: `Maximum ${config.maxFilesPerRoom} files per room`,
            });
          } else {
            resolve({ files: [], error: `Upload error: ${err.message}` });
          }
        } else {
          console.error("[Multer parseUpload error]:", err);
          const msg = err instanceof Error ? err.message : String(err);
          resolve({ files: [], error: `Upload failed: ${msg}` });
        }
        return;
      }

      const files = req.files || [];
      resolve({ files });
    });
  });
}
