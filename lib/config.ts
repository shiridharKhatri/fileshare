/**
 * Centralized application configuration.
 * All environment-dependent values are read here and exported as typed constants.
 */

import path from "path";

export const config = {
  // MongoDB
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/filesharing",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "change-this-in-production",

  // Storage
  uploadDir: path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || "./storage"),

  // File limits
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || "5000", 10),
  maxFilesPerRoom: parseInt(process.env.MAX_FILES_PER_ROOM || "100", 10),
  maxRoomStorageMB: parseInt(process.env.MAX_ROOM_STORAGE_MB || "10000", 10),

  // Computed byte values
  get maxFileSizeBytes() {
    return this.maxFileSizeMB * 1024 * 1024;
  },
  get maxRoomStorageBytes() {
    return this.maxRoomStorageMB * 1024 * 1024;
  },

  // Room defaults
  defaultRoomExpirationHours: parseInt(
    process.env.DEFAULT_ROOM_EXPIRATION_HOURS || "18",
    10
  ),

  // Expiration options available in the UI
  expirationOptions: [
    { label: "10 hours", hours: 10 },
    { label: "18 hours", hours: 18 },
    { label: "24 hours", hours: 24 },
  ],

  // Cleanup
  cleanupIntervalMinutes: parseInt(
    process.env.CLEANUP_INTERVAL_MINUTES || "15",
    10
  ),

  // Rate limiting
  rateLimitAuthMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || "5", 10),
  rateLimitAuthWindowMs: parseInt(
    process.env.RATE_LIMIT_AUTH_WINDOW_MS || "900000",
    10
  ),

  // Cookie
  cookieName: "room_session",
  cookieMaxAge: 60 * 60 * 24, // 24 hours in seconds

  // Node environment
  get isDev() {
    return process.env.NODE_ENV !== "production";
  },
} as const;
