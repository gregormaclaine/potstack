"use client";

import { usePathname } from "next/navigation";
import { useNotificationStore } from "@/stores/notificationStore";

export default function InviteBadge() {
  const count = useNotificationStore((s) => s.unreadCount);
  const pathname = usePathname();

  if (count === 0 || pathname === "/notifications") return null;

  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}
