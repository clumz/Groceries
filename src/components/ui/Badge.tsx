import { clsx } from "clsx";

type BadgeVariant = "green" | "blue" | "orange" | "red" | "gray" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  green: "bg-brand-100 text-brand-700",
  blue: "bg-blue-100 text-blue-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-slate-100 text-slate-600",
  purple: "bg-purple-100 text-purple-700",
};

export function Badge({ children, variant = "gray", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
