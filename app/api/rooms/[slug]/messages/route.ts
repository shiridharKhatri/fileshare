/**
 * POST /api/rooms/[slug]/messages — Send a message
 * GET  /api/rooms/[slug]/messages — List messages
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireRoomAuth } from "@/lib/auth";
import { rateLimiters } from "@/lib/rate-limit";
import { messageSchema } from "@/lib/validation";
import Room from "@/models/Room";
import Message from "@/models/Message";
import { emitToRoom } from "@/lib/socket-server";
import { errorResponse } from "@/lib/api-helpers";
import DOMPurify from "isomorphic-dompurify";

export const dynamic = "force-dynamic";

// Configure DOMPurify allowlist for rich text
const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "a", "blockquote", "code", "pre",
  "span", "div",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "onmouseover", "onfocus", "onblur"],
  });
}

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
    const rateCheck = rateLimiters.message(session.sessionId);
    if (!rateCheck.allowed) {
      return errorResponse("Too many messages. Please wait.", 429);
    }

    // Parse body
    const body = await request.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    await connectDB();

    // Verify room is active
    const room = await Room.findOne({ slug, status: "active" });
    if (!room || room.expiresAt <= new Date()) {
      return errorResponse("Room not found or expired.", 404);
    }

    // Sanitize HTML content
    const sanitizedContent = sanitizeHTML(parsed.data.content);
    if (!sanitizedContent.trim()) {
      return errorResponse("Message cannot be empty.", 400);
    }

    // Create message
    const message = await Message.create({
      roomId: room._id,
      content: sanitizedContent,
      createdAt: new Date(),
      sessionId: session.sessionId,
      expiresAt: room.expiresAt,
    });

    const messageData = {
      id: message._id.toString(),
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      isOwn: true,
    };

    // Emit real-time event (broadcast includes sessionId so clients can determine ownership)
    emitToRoom(slug, "message:created", {
      ...messageData,
      sessionId: message.sessionId,
      isOwn: false, // For other clients
    });

    return Response.json(messageData, { status: 201 });
  } catch (error) {
    console.error("[API] Message creation failed:", error);
    return errorResponse("Failed to send message.", 500);
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

    const messages = await Message.find({ roomId: room._id })
      .sort({ createdAt: 1 })
      .select("content createdAt sessionId");

    return Response.json({
      messages: messages.map((m) => ({
        id: m._id.toString(),
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        isOwn: m.sessionId === session.sessionId,
      })),
    });
  } catch (error) {
    console.error("[API] Message list failed:", error);
    return errorResponse("Failed to list messages.", 500);
  }
}
