/**
 * Custom Node.js server for Next.js with Socket.io support.
 * Handles: HTTP requests (via Next.js), WebSocket connections (via Socket.io),
 * and periodic cleanup of expired rooms.
 */

import { AsyncLocalStorage } from "node:async_hooks";

// Next.js 16 requires AsyncLocalStorage to be available on globalThis
if (typeof (globalThis as unknown as { AsyncLocalStorage?: unknown }).AsyncLocalStorage !== "function") {
  (globalThis as unknown as { AsyncLocalStorage: unknown }).AsyncLocalStorage = AsyncLocalStorage;
}

import "next/dist/server/node-environment-baseline";

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { setIO } from "./lib/socket-server";
import { verifyRoomSession } from "./lib/auth";
import { runCleanup } from "./lib/cleanup";
import { config } from "./lib/config";
import { ensureStorageDir } from "./lib/storage";
import { connectDB } from "./lib/db";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const port = parseInt(process.env.PORT || "3000", 10);

  // Ensure storage directory exists
  await ensureStorageDir();

  // Connect to MongoDB
  await connectDB();

  // Create HTTP server
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // Attach Socket.io
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: dev ? [`http://localhost:${port}`, `http://127.0.0.1:${port}`] : undefined,
      credentials: true,
    },
    // Parse cookies from the handshake
    allowRequest: (req, callback) => {
      callback(null, true);
    },
  });

  // Store the IO instance globally for use by API routes
  setIO(io);

  // Socket.io authentication and room management
  io.on("connection", async (socket) => {
    try {
      // Extract session token from cookies in the handshake
      const cookieHeader = socket.handshake.headers.cookie || "";
      const cookies = parseCookies(cookieHeader);
      const token = cookies[config.cookieName];

      if (!token) {
        socket.disconnect(true);
        return;
      }

      // Verify session
      const session = await verifyRoomSession(token);
      if (!session) {
        socket.disconnect(true);
        return;
      }

      // Join the room channel
      const roomChannel = `room:${session.slug}`;
      socket.join(roomChannel);

      // Store session data on the socket
      socket.data.session = session;

      console.log(
        `[Socket] Client connected to room ${session.slug} (session: ${session.sessionId.substring(0, 8)}...)`
      );

      socket.on("disconnect", () => {
        console.log(
          `[Socket] Client disconnected from room ${session.slug}`
        );
      });
    } catch (error) {
      console.error("[Socket] Connection error:", error);
      socket.disconnect(true);
    }
  });

  // Start cleanup scheduler
  const cleanupInterval = config.cleanupIntervalMinutes * 60 * 1000;
  setInterval(async () => {
    try {
      await runCleanup();
    } catch (error) {
      console.error("[Cleanup] Scheduled cleanup failed:", error);
    }
  }, cleanupInterval);

  // Run initial cleanup on startup
  setTimeout(async () => {
    try {
      await runCleanup();
    } catch (error) {
      console.error("[Cleanup] Initial cleanup failed:", error);
    }
  }, 5000);

  // Start the server
  httpServer.listen(port, () => {
    console.log(
      `> Server listening at http://localhost:${port} (${dev ? "development" : "production"})`
    );
  });
});

/**
 * Simple cookie parser for handshake headers.
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) {
      cookies[name.trim()] = decodeURIComponent(rest.join("="));
    }
  });
  return cookies;
}
