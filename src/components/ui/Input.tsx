import { InputHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, wrapperClassName, className, id, ...props },
  ref
) {
  return (
    <div className={clsx("flex flex-col gap-1", wrapperClassName)}>
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-zinc-300"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={clsx(
          "rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
});

export default Input;
