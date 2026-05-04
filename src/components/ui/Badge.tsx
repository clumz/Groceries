import { clsx } from "clsx";

type BadgeVariant = "lime" | "coral" | "butter" | "sky" | "plum" | "ghost" | "green" | "blue" | "orange" | "red" | "gray" | "purple";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  lime:   "bg-plate-lime text-plate-ink border-plate-ink shadow-sticker-sm",
  coral:  "bg-plate-coral text-white border-plate-ink shadow-sticker-sm",
  butter: "bg-plate-butter text-plate-ink border-plate-ink shadow-sticker-sm",
  sky:    "bg-plate-sky text-plate-ink border-plate-ink shadow-sticker-sm",
  plum:   "bg-plate-plum text-white border-plate-ink shadow-sticker-sm",
  ghost:  "bg-transparent text-plate-ink-3 border-plate-line",
  // legacy aliases
  green:  "bg-plate-lime text-plate-ink border-plate-ink shadow-sticker-sm",
  blue:   "bg-plate-sky text-plate-ink border-plate-ink shadow-sticker-sm",
  orange: "bg-plate-butter text-plate-ink border-plate-ink shadow-sticker-sm",
  red:    "bg-plate-coral text-white border-plate-ink shadow-sticker-sm",
  gray:   "bg-plate-line text-plate-ink-2 border-plate-line",
  purple: "bg-plate-plum text-white border-plate-ink shadow-sticker-sm",
};

export function Badge({ children, variant = "gray", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-[11px] py-[5px] rounded-full border border-[1.5px] text-xs font-semibold leading-none",
        variants[variant],
        className
      )}
      style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
    >
      {children}
    </span>
  );
}
