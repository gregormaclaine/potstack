"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/stores/notificationStore";

export default function NotificationLoader() {
  const pathname = usePathname();
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/notifications/count");
        if (!res.ok) return;
        const data: { count: number } = await res.json();
        setUnreadCount(data.count);
      } catch {
        // silently ignore
      }
    }
    fetchCount();
  }, [pathname, setUnreadCount]);

  return null;
}
