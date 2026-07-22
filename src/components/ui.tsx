import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

/* ---------------------------------------------------------------- Button --- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
};

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex h-[52px] items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold tracking-tight transition-transform duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        variant === 'ghost' && 'text-muted hover:text-ink',
        className,
      )}
      style={
        variant === 'primary'
          ? {
              color: 'var(--color-void)',
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--phase) 92%, white) 0%, var(--phase) 100%)',
              boxShadow: '0 10px 30px -8px color-mix(in srgb, var(--phase) 60%, transparent)',
            }
          : undefined
      }
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- TextField --- */

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, hint, error, className, ...props }, ref) => (
    <label className="block">
      <span className="mb-2 block text-[13px] font-medium text-muted">{label}</span>
      <input ref={ref} className={cn('field', error && 'field-invalid', className)} {...props} />
      {error ? (
        <span className="mt-1.5 block text-[12px]" style={{ color: 'var(--color-menstrual)' }}>
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-faint">{hint}</span>
      ) : null}
    </label>
  ),
);
TextField.displayName = 'TextField';

/* --------------------------------------------------------- ChoiceGroup ----- */

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface ChoiceGroupProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<Choice<T>>;
}

export function ChoiceGroup<T extends string>({ value, onChange, options }: ChoiceGroupProps<T>) {
  return (
    <div className="grid gap-2.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-2xl border px-4 py-3.5 text-left transition',
              active ? 'border-transparent' : 'border-hairline hover:border-white/20',
            )}
            style={
              active
                ? {
                    background: 'color-mix(in srgb, var(--phase) 14%, transparent)',
                    boxShadow: '0 0 0 1.5px var(--phase) inset',
                  }
                : { background: 'rgba(255,255,255,0.02)' }
            }
          >
            <span className="block text-[15px] font-semibold">{opt.label}</span>
            {opt.description ? (
              <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">
                {opt.description}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- Stepper ----- */

export function NumberStepper({
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix?: string;
}) {
  const clampSet = (v: number) => onChange(Math.min(Math.max(v, min), max));
  return (
    <div className="flex items-center justify-between rounded-2xl border border-hairline bg-white/[0.03] px-2 py-2">
      <StepButton label="−" onClick={() => clampSet(value - 1)} disabled={value <= min} />
      <div className="text-center">
        <span className="text-display text-3xl font-semibold tabular-nums">{value}</span>
        {suffix ? <span className="ml-1.5 text-sm text-muted">{suffix}</span> : null}
      </div>
      <StepButton label="+" onClick={() => clampSet(value + 1)} disabled={value >= max} />
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
}: {
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-hairline bg-white/[0.04] text-xl text-ink transition disabled:opacity-30"
    >
      {label}
    </motion.button>
  );
}
