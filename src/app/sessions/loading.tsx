import PageWrapper from "@/components/layout/PageWrapper";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function SessionsLoading() {
  return (
    <PageWrapper>
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    </PageWrapper>
  );
}
