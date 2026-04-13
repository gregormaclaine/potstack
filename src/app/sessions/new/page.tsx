import PageWrapper from "@/components/layout/PageWrapper";
import SessionForm from "@/components/sessions/SessionForm";

export default function NewSessionPage() {
  return (
    <PageWrapper className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-zinc-100">New Session</h1>
      <SessionForm mode="create" />
    </PageWrapper>
  );
}
