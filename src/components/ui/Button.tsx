import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type Variant = "primary" | "lime" | "coral" | "ghost" | "secondary" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  lime:      "bg-plate-lime text-plate-ink border border-[1.5px] border-plate-ink shadow-sticker active:translate-y-px",
  primary:   "bg-plate-ink text-plate-bg border border-[1.5px] border-plate-ink active:translate-y-px",
  coral:     "bg-plate-coral text-white border border-[1.5px] border-plate-ink shadow-sticker active:translate-y-px",
  secondary: "bg-plate-surface text-plate-ink border border-[1.5px] border-plate-ink active:translate-y-px",
  ghost:     "bg-transparent text-plate-ink border border-[1.5px] border-plate-ink active:translate-y-px",
  danger:    "bg-plate-coral-deep text-white border border-[1.5px] border-plate-ink active:translate-y-px",
};

const sizes: Record<Size, string> = {
  sm: "h-[38px] px-[14px] text-[13px] rounded-full",
  md: "h-[44px] px-[18px] text-[14px] rounded-full",
  lg: "h-[52px] px-[22px] text-[16px] rounded-full",
  xl: "h-[52px] px-[22px] text-[16px] rounded-full",
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
          "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plate-lime focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none",
          "font-display",
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className
        )
      )}
      style={{ fontFamily: "var(--font-display)" }}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
