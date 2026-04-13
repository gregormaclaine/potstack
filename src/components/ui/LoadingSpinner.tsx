import { clsx } from "clsx";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export default function LoadingSpinner({ size = "md" }: { size?: Size }) {
  return (
    <span
      className={clsx(
        "inline-block animate-spin rounded-full border-zinc-600 border-t-emerald-500",
        sizeClasses[size]
      )}
      aria-label="Loading"
    />
  );
}
