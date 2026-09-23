/**
 * Dynamic room page — handles room access, authentication, and room UI.
 * Server-side: checks room existence/expiration.
 * Client-side: handles authentication form and room view.
 */

import { connectDB } from "@/lib/db";
import Room from "@/models/Room";
import RoomClient from "./RoomClient";
import type { Metadata } from "next";
import Link from "next/link";

// noindex/nofollow for room pages
export const metadata: Metadata = {
  robots: "noindex, nofollow",
};

interface PageProps {
  params: Promise<{ room: string }>;
}

export default async function RoomPage({ params }: PageProps) {
  const { room: slug } = await params;

  await connectDB();

  const room = await Room.findOne({ slug });

  if (!room) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold">Room not found.</h1>
          <p className="text-sm text-muted-foreground">
            This room doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-block text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Go home
          </Link>
        </div>
      </main>
    );
  }

  const isExpired = room.status === "expired" || room.expiresAt <= new Date();

  if (isExpired) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold">This room has expired.</h1>
          <p className="text-sm text-muted-foreground">
            All files and messages have been deleted.
          </p>
          <Link
            href="/"
            className="inline-block text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Go home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <RoomClient
      slug={room.slug}
      expiresAt={room.expiresAt.toISOString()}
    />
  );
}
