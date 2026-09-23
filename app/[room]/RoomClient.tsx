"use client";

import { useState, useEffect } from "react";
import AccessCodeForm from "@/components/AccessCodeForm";
import RoomView from "@/components/RoomView";

interface Props {
  slug: string;
  expiresAt: string;
}

export default function RoomClient({ slug, expiresAt }: Props) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if already authenticated (session cookie exists)
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch(`/api/rooms/${slug}`);
        if (res.ok) {
          const data = await res.json();
          setAuthenticated(data.authenticated === true);
        }
      } catch {
        // Not authenticated
      } finally {
        setChecking(false);
      }
    }
    checkAuth();
  }, [slug]);

  if (checking) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <AccessCodeForm
          slug={slug}
          onAuthenticated={() => setAuthenticated(true)}
        />
      </main>
    );
  }

  return <RoomView slug={slug} expiresAt={expiresAt} />;
}
