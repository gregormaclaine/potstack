"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function InviteBadge() {
  const [count, setCount] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/notifications/count");
        if (!res.ok) return;
        const data: { count: number } = await res.json();
        setCount(data.count);
      } catch {
        // silently ignore
      }
    }
    fetchCount();
  }, [pathname]);

  if (count === 0 || pathname === "/notifications") return null;

  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
