"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

/**
 * React hook for Socket.io client connection.
 * Connects when mounted, joins the room channel, and disconnects on unmount.
 */
export function useSocket(slug: string): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to the Socket.io server
    const newSocket = io({
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    newSocket.on("connect", () => {
      console.log("[Socket] Connected");
      setSocket(newSocket);
    });

    newSocket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setSocket(null);
    });

    newSocket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    socketRef.current = newSocket;

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [slug]);

  return socket;
}
