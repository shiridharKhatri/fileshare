/**
 * Socket.io server-side utilities.
 * Provides emitToRoom helper that API routes can call to push real-time updates.
 */

import type { Server as SocketIOServer } from "socket.io";

// Global reference to the Socket.io server instance (set by server.ts)
declare global {
  var socketIO: SocketIOServer | null;
}

/**
 * Get the Socket.io server instance.
 */
export function getIO(): SocketIOServer | null {
  return global.socketIO || null;
}

/**
 * Set the Socket.io server instance (called from server.ts).
 */
export function setIO(io: SocketIOServer): void {
  global.socketIO = io;
}

/**
 * Emit an event to all clients in a specific room.
 */
export function emitToRoom(
  slug: string,
  event: string,
  data: unknown
): void {
  const io = getIO();
  if (io) {
    io.to(`room:${slug}`).emit(event, data);
  }
}

/** Event types for type safety */
export type SocketEvent =
  | "file:uploaded"
  | "file:deleted"
  | "message:created"
  | "room:expired";
