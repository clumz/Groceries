import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  secondary: "bg-surface-tertiary text-ink hover:bg-slate-200 active:bg-slate-300",
  ghost: "bg-transparent text-ink-secondary hover:bg-surface-tertiary active:bg-slate-200",
  danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-xl",
  md: "h-10 px-4 text-sm rounded-2xl",
  lg: "h-12 px-5 text-base rounded-2xl",
  xl: "h-14 px-6 text-base rounded-2xl font-semibold",
};

export function Button({
  variant = "primary",
  size = "lg",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={twMerge(
        clsx(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
