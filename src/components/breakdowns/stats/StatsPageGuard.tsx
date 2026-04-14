"use client";

import { useFeatureFlagEnabled } from "posthog-js/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function StatsPageGuard({ children }: { children: React.ReactNode }) {
  const statsEnabled = useFeatureFlagEnabled("stats-analysis-page");
  const router = useRouter();

  useEffect(() => {
    if (statsEnabled === false) {
      router.replace("/breakdowns");
    }
  }, [statsEnabled, router]);

  if (statsEnabled === false) return null;

  return <>{children}</>;
}
