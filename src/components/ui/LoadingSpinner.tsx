import { clsx } from "clsx";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-8 h-8" };

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div
      className={clsx(
        "rounded-full border-2 border-plate-line border-t-plate-coral animate-spin",
        sizes[size],
        className
      )}
    />
  );
}
