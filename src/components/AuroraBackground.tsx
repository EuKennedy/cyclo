import { motion } from 'framer-motion';
import { useStill } from '@/lib/motion';

/**
 * Full-viewport cinematic aurora. Colors are driven by the live `--phase` /
 * `--phase-deep` custom properties (set by the app from the current cycle
 * phase), so the whole backdrop morphs hue as you move through the cycle.
 * Motion is disabled under prefers-reduced-motion (or ?still).
 */
export function AuroraBackground() {
  const reduce = useStill();

  const drift = (dx: number, dy: number, scale: number, duration: number, delay = 0) =>
    reduce
      ? {}
      : {
          animate: {
            x: [0, dx, 0],
            y: [0, dy, 0],
            scale: [1, scale, 1],
          },
          transition: {
            duration,
            delay,
            repeat: Infinity,
            ease: 'easeInOut' as const,
          },
        };

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-void">
      {/* Phase primary — top-left */}
      <motion.div
        className="absolute -left-[15%] -top-[20%] h-[56vmax] w-[56vmax] rounded-full opacity-60 blur-[44px] will-change-transform"
        style={{
          background: 'radial-gradient(circle at center, var(--phase) 0%, transparent 66%)',
        }}
        {...drift(120, 80, 1.12, 26)}
      />
      {/* Phase deep — bottom-right */}
      <motion.div
        className="absolute -bottom-[25%] -right-[15%] h-[52vmax] w-[52vmax] rounded-full opacity-50 blur-[48px] will-change-transform"
        style={{
          background: 'radial-gradient(circle at center, var(--phase-deep) 0%, transparent 64%)',
        }}
        {...drift(-100, -70, 1.15, 32, 2)}
      />
      {/* Centre bloom — follows the phase so the backdrop never fights the palette */}
      <motion.div
        className="absolute left-[30%] top-[35%] h-[42vmax] w-[42vmax] rounded-full opacity-20 blur-[52px] will-change-transform"
        style={{
          background: 'radial-gradient(circle at center, var(--phase) 0%, transparent 68%)',
        }}
        {...drift(80, -110, 1.2, 38, 1)}
      />

      {/* Cinematic vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 30%, transparent 40%, rgba(5,5,7,0.75) 100%)',
        }}
      />
      {/* Fine film grain for texture */}
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-soft-light"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
