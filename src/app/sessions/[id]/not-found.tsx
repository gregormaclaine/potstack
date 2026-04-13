import Link from "next/link";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/Button";

export default function SessionNotFound() {
  return (
    <PageWrapper>
      <div className="py-20 text-center">
        <p className="text-5xl font-bold text-zinc-700">404</p>
        <h1 className="mt-4 text-xl font-semibold text-zinc-300">
          Session not found
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          This session doesn&apos;t exist or has been deleted.
        </p>
        <Link href="/sessions">
          <Button className="mt-6">Back to Sessions</Button>
        </Link>
      </div>
    </PageWrapper>
  );
}
