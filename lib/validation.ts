/**
 * Zod validation schemas for all API inputs.
 */

import { z } from "zod";

/** Room slug: alphanumeric + hyphens, 2-50 chars, URL-safe */
export const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/,
    "Slug must contain only letters, numbers, and hyphens, and cannot start or end with a hyphen"
  );

/** 4-digit passcode */
export const passcodeSchema = z
  .string()
  .length(4, "Access code must be exactly 4 digits")
  .regex(/^\d{4}$/, "Access code must be 4 digits");

/** Expiration hours: one of the allowed options */
export const expirationSchema = z
  .number()
  .int()
  .refine((v) => [10, 18, 24].includes(v), {
    message: "Expiration must be 10, 18, or 24 hours",
  });

/** Create room request body */
export const createRoomSchema = z.object({
  slug: slugSchema.optional(),
  passcode: passcodeSchema.optional(),
  expirationHours: expirationSchema.default(18),
});

/** Auth request body */
export const authSchema = z.object({
  passcode: passcodeSchema,
});

/** Message content: sanitized HTML, max 50KB */
export const messageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(50000, "Message is too long"),
});

/** MongoDB ObjectId format */
export const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid ID format");

/** Slug URL param */
export const slugParamSchema = z.object({
  slug: z.string().min(1),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type AuthInput = z.infer<typeof authSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
