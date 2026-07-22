import type { ComponentType, SVGProps } from 'react';
import { cn } from '@/lib/cn';
import { CalendarIcon, DropIcon, HomeIcon, UserIcon } from '@/components/icons';

export type Tab = 'home' | 'calendar' | 'log' | 'settings';

const TABS: ReadonlyArray<{ id: Tab; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = [
  { id: 'home', label: 'Início', Icon: HomeIcon },
  { id: 'calendar', label: 'Calendário', Icon: CalendarIcon },
  { id: 'log', label: 'Registrar', Icon: DropIcon },
  { id: 'settings', label: 'Você', Icon: UserIcon },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30">
      <div className="mx-auto max-w-md px-5 pb-[max(16px,env(safe-area-inset-bottom))]">
        <div className="glass flex items-center justify-around rounded-[26px] px-2 py-2">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-[20px] py-2 transition-colors',
                  isActive ? 'text-ink' : 'text-faint hover:text-muted',
                )}
                style={isActive ? { color: 'var(--phase)' } : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon />
                <span className="text-[10px] font-medium tracking-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
