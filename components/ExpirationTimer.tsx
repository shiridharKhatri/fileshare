"use client";

import { useEffect, useState } from "react";

interface Props {
  expiresAt: string;
}

export default function ExpirationTimer({ expiresAt }: Props) {
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function update() {
      const now = Date.now();
      const exp = new Date(expiresAt).getTime();
      const diff = exp - now;

      if (diff <= 0) {
        setExpired(true);
        setTimeLeft("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (expired) {
    return (
      <span className="text-xs text-red-500 font-medium whitespace-nowrap" role="status">
        Expired
      </span>
    );
  }

  return (
    <span className="text-[11px] sm:text-xs text-slate-500 font-medium whitespace-nowrap" role="status">
      Expires in {timeLeft}
    </span>
  );
}
