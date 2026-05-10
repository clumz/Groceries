type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

type Listener = (toasts: ToastItem[]) => void;

class ToastStore {
  private toasts: ToastItem[] = [];
  private listeners: Set<Listener> = new Set();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn([...this.toasts]));
  }

  show(message: string, variant: ToastVariant = "info", duration = 3000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.toasts = [...this.toasts.slice(-2), { id, message, variant }];
    this.emit();
    const timer = setTimeout(() => this.dismiss(id), duration);
    this.timers.set(id, timer);
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.emit();
    const timer = this.timers.get(id);
    if (timer) { clearTimeout(timer); this.timers.delete(id); }
  }

  success(message: string) { this.show(message, "success"); }
  error(message: string) { this.show(message, "error", 5000); }
  info(message: string) { this.show(message, "info"); }
  warning(message: string) { this.show(message, "warning", 4000); }
}

export const toast = new ToastStore();
