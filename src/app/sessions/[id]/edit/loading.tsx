import PageWrapper from "@/components/layout/PageWrapper";
import Skeleton from "@/components/ui/Skeleton";

export default function EditSessionLoading() {
  return (
    <PageWrapper className="max-w-2xl">
      <div className="mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-1 h-3 w-48" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="mt-2 h-10 w-32" />
      </div>
    </PageWrapper>
  );
}
