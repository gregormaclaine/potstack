import Link from "next/link";
import type { SessionStub } from "@/lib/adjacent-sessions";

interface SessionNavProps {
  prev: SessionStub | null;
  next: SessionStub | null;
}

export default function SessionNav({ prev, next }: SessionNavProps) {
  if (!prev && !next) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-4">
      <div>
        {prev && (
          <Link
            href={prev.url}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Previous
          </Link>
        )}
      </div>
      <div>
        {next && (
          <Link
            href={next.url}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:text-zinc-100"
          >
            Next
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
