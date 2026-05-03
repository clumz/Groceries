import type { SnackItem } from "@/types";

interface SnacksSectionProps {
  snacks: SnackItem[];
}

export function SnacksSection({ snacks }: SnacksSectionProps) {
  return (
    <div className="bg-surface rounded-3xl p-4 shadow-card mt-3">
      <h3 className="font-bold text-ink mb-3">Weekly Snacks</h3>
      <div className="space-y-2.5">
        {snacks.map((snack) => (
          <div key={snack.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{snack.name}</p>
              <p className="text-xs text-ink-tertiary">{snack.description}</p>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-xs text-ink-tertiary">{snack.quantity} {snack.unit}</p>
              <p className="text-sm font-semibold text-brand-600">~A${snack.estimatedCost.toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
