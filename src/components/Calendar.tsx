import { useState } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfToday,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/cn';

interface CalendarProps {
  selected: Date | null;
  onSelect: (date: Date) => void;
  /** Disallow dates after today (a last period can't be in the future). */
  maxToday?: boolean;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function Calendar({ selected, onSelect, maxToday = true }: CalendarProps) {
  const today = startOfToday();
  const [month, setMonth] = useState<Date>(startOfMonth(selected ?? today));

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const atCurrentMonth = isSameMonth(month, today);

  return (
    <div className="glass rounded-3xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <Chevron dir="prev" onClick={() => setMonth(subMonths(month, 1))} />
        <span className="text-[15px] font-semibold capitalize">
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <Chevron
          dir="next"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={maxToday && atCurrentMonth}
        />
      </div>

      <div className="mb-1.5 grid grid-cols-7 text-center text-[11px] font-medium text-faint">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, month);
          const isToday = isSameDay(d, today);
          const isSelected = selected != null && isSameDay(d, selected);
          const disabled = maxToday && isAfter(d, today);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(d)}
              className={cn(
                'relative flex aspect-square items-center justify-center rounded-xl text-[13px] transition',
                !inMonth && 'text-faint/40',
                disabled && 'pointer-events-none opacity-25',
                inMonth && !isSelected && 'text-ink hover:bg-white/[0.06]',
              )}
              style={
                isSelected
                  ? { background: 'var(--phase)', color: 'var(--color-void)', fontWeight: 600 }
                  : undefined
              }
            >
              {format(d, 'd')}
              {isToday && !isSelected ? (
                <span
                  className="absolute bottom-1 h-1 w-1 rounded-full"
                  style={{ background: 'var(--phase)' }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chevron({
  dir,
  onClick,
  disabled,
}: {
  dir: 'prev' | 'next';
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Mês anterior' : 'Próximo mês'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-white/[0.04] text-muted transition hover:text-ink disabled:opacity-25"
    >
      {dir === 'prev' ? '‹' : '›'}
    </button>
  );
}
