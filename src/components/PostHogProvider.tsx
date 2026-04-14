"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function PostHogInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const isDev = process.env.NODE_ENV !== "production";
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      ui_host: "https://eu.posthog.com",
      capture_pageview: false, // handled manually below
      capture_pageleave: true,
      person_profiles: "identified_only",
      // In development: load feature flags but don't send any events
      opt_out_capturing_by_default: isDev,
    });
  }, []);

  return null;
}

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      const url =
        searchParams.toString()
          ? `${pathname}?${searchParams.toString()}`
          : pathname;
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

function UserIdentifier() {
  const { data: session, status } = useSession();
  const ph = usePostHog();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      ph.identify(session.user.id, { name: session.user.name ?? undefined });
    }
    if (status === "unauthenticated") {
      ph.reset();
    }
  }, [status, session, ph]);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PHProvider client={posthog}>
      <PostHogInit />
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <UserIdentifier />
      {children}
    </PHProvider>
  );
}
