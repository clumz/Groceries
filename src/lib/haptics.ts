const PATTERNS = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 10],
  error: [30, 50, 30],
} as const;

export function haptic(style: keyof typeof PATTERNS = "light") {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(PATTERNS[style]);
    }
  } catch {
    // Silently ignore — unsupported or permission denied
  }
}
