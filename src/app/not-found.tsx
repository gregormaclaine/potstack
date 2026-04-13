import Link from "next/link";
import PageWrapper from "@/components/layout/PageWrapper";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <PageWrapper>
      <div className="py-20 text-center">
        <p className="text-5xl font-bold text-zinc-700">404</p>
        <h1 className="mt-4 text-xl font-semibold text-zinc-300">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/dashboard">
          <Button className="mt-6">Go to Dashboard</Button>
        </Link>
      </div>
    </PageWrapper>
  );
}
