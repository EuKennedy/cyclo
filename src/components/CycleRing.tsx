import { type ReactNode, useId } from 'react';
import { motion } from 'framer-motion';
import { useStill } from '@/lib/motion';
import { cycleSegments } from '@/domain/cycle';
import type { CycleSettings, CycleStatus, PhaseId } from '@/domain/types';

const PHASE_STROKE: Record<PhaseId, string> = {
  menstrual: 'var(--color-menstrual)',
  follicular: 'var(--color-follicular)',
  ovulatory: 'var(--color-ovulatory)',
  luteal: 'var(--color-luteal)',
};

interface CycleRingProps {
  settings: CycleSettings;
  status: CycleStatus;
  size?: number;
  children?: ReactNode;
}

/**
 * The cycle dial — the app's spatial spine. Renders the four phase arcs
 * proportionally, a luminous fertile sub-band, an ovulation peak tick, and a
 * glowing marker that springs to the current cycle day. Day 1 sits at the top.
 */
export function CycleRing({ settings, status, size = 320, children }: CycleRingProps) {
  const reduce = useStill();
  const uid = useId();

  const stroke = size * 0.05;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - stroke / 2 - size * 0.04;
  const circ = 2 * Math.PI * r;
  const n = status.cycleLength;
  const gapPx = 6;

  const segs = cycleSegments(settings);

  // Marker position (−90° origin so day 1 is at the top).
  const markerAngle = ((status.cycleDay - 0.5) / n) * 2 * Math.PI - Math.PI / 2;
  const mx = cx + r * Math.cos(markerAngle);
  const my = cy + r * Math.sin(markerAngle);

  // Fertile sub-band geometry (inner, thinner arc).
  const fertR = r - stroke * 0.9;
  const fertCirc = 2 * Math.PI * fertR;
  const fw = status.fertileWindow;
  const fertFrac = (fw.endDay - fw.startDay + 1) / n;
  const fertStartFrac = (fw.startDay - 1) / n;

  // Ovulation peak tick.
  const ovAngle = ((status.ovulationDay - 0.5) / n) * 2 * Math.PI - Math.PI / 2;
  const ox = cx + fertR * Math.cos(ovAngle);
  const oy = cy + fertR * Math.sin(ovAngle);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        initial={reduce ? false : { opacity: 0, scale: 0.94, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Faint full track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />

        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {/* Phase arcs */}
          {segs.map((seg) => {
            const frac = (seg.endDay - seg.startDay + 1) / n;
            const startFrac = (seg.startDay - 1) / n;
            const arcLen = Math.max(frac * circ - gapPx, 1);
            const color = PHASE_STROKE[seg.phase];
            return (
              <circle
                key={`${seg.phase}-${seg.startDay}`}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${arcLen} ${circ - arcLen}`}
                strokeDashoffset={-startFrac * circ - gapPx / 2}
                style={{ filter: `drop-shadow(0 0 8px color-mix(in srgb, ${color} 55%, transparent))` }}
              />
            );
          })}

          {/* Fertile sub-band (inner, luminous, dashed) */}
          <circle
            cx={cx}
            cy={cy}
            r={fertR}
            fill="none"
            stroke="var(--color-ovulatory)"
            strokeWidth={stroke * 0.28}
            strokeLinecap="round"
            strokeDasharray={`${fertFrac * fertCirc} ${fertCirc - fertFrac * fertCirc}`}
            strokeDashoffset={-fertStartFrac * fertCirc}
            opacity={0.9}
            style={{ filter: 'drop-shadow(0 0 6px var(--color-ovulatory))' }}
          />
        </g>

        {/* Ovulation peak tick */}
        <circle cx={ox} cy={oy} r={size * 0.012} fill="#eafff8" opacity={0.9} />

        {/* Current-day marker with halo */}
        <motion.circle
          cx={mx}
          cy={my}
          r={size * 0.008}
          fill="var(--phase)"
          opacity={0.35}
          animate={{ cx: mx, cy: my }}
          transition={
            reduce ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 15 }
          }
          style={{ filter: 'blur(6px)' }}
          key={`${uid}-halo`}
        />
        <motion.circle
          cx={mx}
          cy={my}
          r={size * 0.026}
          fill="#ffffff"
          stroke="var(--phase)"
          strokeWidth={size * 0.012}
          animate={{ cx: mx, cy: my }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 16 }}
          style={{
            filter: 'drop-shadow(0 2px 10px color-mix(in srgb, var(--phase) 70%, transparent))',
          }}
        />
      </motion.svg>

      {/* Center content */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
