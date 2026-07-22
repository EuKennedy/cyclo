import { cn } from '@/lib/cn';

export interface BarDatum {
  label: string;
  value: number;
  /** Optional per-bar colour override. */
  color?: string;
}

/**
 * Compact vertical bar chart. Deliberately dependency-free: keeps the bundle
 * small and the styling identical to the rest of the app.
 */
export function BarChart({
  data,
  unit = '',
  accent = 'var(--phase)',
  emptyLabel = 'Sem dados ainda',
}: {
  data: BarDatum[];
  unit?: string;
  accent?: string;
  emptyLabel?: string;
}) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-[13px] text-faint">{emptyLabel}</p>;
  }

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  // Give short bars a visible floor so they never collapse to nothing.
  const span = Math.max(max - min, 1);

  return (
    <div className="flex items-end justify-between gap-2" style={{ height: 132 }}>
      {data.map((d, i) => {
        const ratio = (d.value - min) / span;
        const heightPct = 34 + ratio * 66;
        return (
          <div key={`${d.label}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-[11px] font-semibold tabular-nums text-ink">
              {d.value}
              {unit}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: `${heightPct}%`,
                  background: `linear-gradient(180deg, ${d.color ?? accent} 0%, color-mix(in srgb, ${d.color ?? accent} 45%, transparent) 100%)`,
                }}
              />
            </div>
            <span className="max-w-full truncate text-[10px] text-faint">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** A labelled metric, used across the analysis screen. */
export function Metric({
  value,
  label,
  hint,
  className,
}: {
  value: string;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('text-center', className)}>
      <p className="text-display text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] text-faint">{label}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-faint/70">{hint}</p> : null}
    </div>
  );
}
