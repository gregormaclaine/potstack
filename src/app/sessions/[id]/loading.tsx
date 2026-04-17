import PageWrapper from "@/components/layout/PageWrapper";
import Skeleton from "@/components/ui/Skeleton";

export default function SessionDetailLoading() {
  return (
    <PageWrapper className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-900 p-5">
        <Skeleton className="mb-4 h-3 w-24" />
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="ml-auto flex flex-col items-end gap-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>

      <div className="mb-2">
        <Skeleton className="mb-2 h-5 w-32" />
        <div className="overflow-hidden rounded-xl border border-zinc-800">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-zinc-800 px-4 py-3 last:border-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="ml-auto h-4 w-14" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
