import { clsx } from "clsx";

export default function PageWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={clsx(
        "mx-auto mt-16 min-h-screen max-w-6xl px-4 py-8",
        className
      )}
    >
      {children}
    </main>
  );
}
