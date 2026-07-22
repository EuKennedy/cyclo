import { useState, type ReactNode } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

interface CollapsibleProps {
  title: string;
  /** Small line under the title, visible while collapsed. */
  meta?: string;
  /** Colour for the title (e.g. the current phase accent). */
  accent?: string;
  /** Leading glyph, aligned with the title. */
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Collapsed by default: the summary only expands when she asks for it. */
export function Collapsible({
  title,
  meta,
  accent,
  icon,
  defaultOpen = false,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="glass overflow-hidden rounded-3xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {icon ? <span className="flex shrink-0 items-center">{icon}</span> : null}
          <span className="min-w-0">
            <span
              className="block text-[15px] font-semibold"
              style={accent ? { color: accent } : undefined}
            >
              {title}
            </span>
            {meta ? (
              <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{meta}</span>
            ) : null}
          </span>
        </span>
        <ChevronDownIcon
          className={cn('shrink-0 text-muted transition-transform duration-300', open && 'rotate-180')}
        />
      </button>

      <div className={cn('collapse-grid', open && 'is-open')}>
        <div className="min-h-0 overflow-hidden" aria-hidden={!open}>
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </section>
  );
}
