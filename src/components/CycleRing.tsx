import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
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

/** Solid blood-drop path, drawn in a 24×24 box. */
const DROP_PATH = 'M12 3c3.6 4.1 6 7.2 6 10.2A6 6 0 0 1 6 13.2C6 10.2 8.4 7.1 12 3Z';

interface CycleRingProps {
  settings: CycleSettings;
  /** Status of the day currently being displayed (may be a scrubbed day). */
  status: CycleStatus;
  size?: number;
  /** When provided, the ring becomes interactive: tap or drag to scrub days. */
  onSelectDay?: (day: number) => void;
  children?: ReactNode;
}

/**
 * The cycle dial. Day 1 sits at the top and the cycle runs clockwise. When
 * `onSelectDay` is given you can tap anywhere on the ring or drag the handle to
 * travel through the cycle.
 */
export function CycleRing({ settings, status, size = 320, onSelectDay, children }: CycleRingProps) {
  const reduce = useStill();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const stroke = size * 0.05;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - stroke / 2 - size * 0.04;
  const circ = 2 * Math.PI * r;
  const n = status.cycleLength;
  const gapPx = 6;
  const interactive = typeof onSelectDay === 'function';

  const segs = cycleSegments(settings);

  const angleFor = (day: number) => ((day - 0.5) / n) * 2 * Math.PI - Math.PI / 2;
  const pointOn = (radius: number, day: number) => ({
    x: cx + radius * Math.cos(angleFor(day)),
    y: cy + radius * Math.sin(angleFor(day)),
  });

  const marker = pointOn(r, status.cycleDay);
  const fertR = r - stroke * 0.9;
  const fertCirc = 2 * Math.PI * fertR;
  const fw = status.fertileWindow;
  const fertFrac = (fw.endDay - fw.startDay + 1) / n;
  const fertStartFrac = (fw.startDay - 1) / n;
  const ov = pointOn(fertR, status.ovulationDay);

  // Blood drop sits just outside the middle of the menstrual arc.
  const menstrualMid = (1 + settings.avgPeriodLength) / 2;
  const dropAt = pointOn(r + stroke * 0.95, menstrualMid);
  const dropScale = (size * 0.085) / 24;

  /** Map a pointer position to a cycle day. Returns null near the centre. */
  const dayFromPointer = (e: ReactPointerEvent<SVGSVGElement>): number | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = ((e.clientX - rect.left) / rect.width) * size;
    const y = ((e.clientY - rect.top) / rect.height) * size;
    const dx = x - cx;
    const dy = y - cy;
    if (Math.hypot(dx, dy) < r * 0.52) return null; // protect the centre readout
    let frac = (Math.atan2(dy, dx) + Math.PI / 2) / (2 * Math.PI);
    frac = ((frac % 1) + 1) % 1;
    return Math.min(n, Math.max(1, Math.floor(frac * n) + 1));
  };

  const handleDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const day = dayFromPointer(e);
    if (day == null) return;
    setDragging(true);
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* pointer id not capturable (e.g. synthetic events) — dragging still works */
    }
    onSelectDay?.(day);
  };

  const handleMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive || !dragging) return;
    const day = dayFromPointer(e);
    if (day != null) onSelectDay?.(day);
  };

  const endDrag = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    setDragging(false);
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <motion.svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        initial={reduce ? false : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={interactive ? { touchAction: 'none', cursor: dragging ? 'grabbing' : 'pointer' } : undefined}
        role={interactive ? 'slider' : undefined}
        aria-label={interactive ? 'Navegar pelos dias do ciclo' : undefined}
        aria-valuemin={interactive ? 1 : undefined}
        aria-valuemax={interactive ? n : undefined}
        aria-valuenow={interactive ? status.cycleDay : undefined}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />

        <g transform={`rotate(-90 ${cx} ${cy})`}>
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

          {/* Fertile sub-band */}
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
        <circle cx={ov.x} cy={ov.y} r={size * 0.012} fill="#ffffff" opacity={0.95} />

        {/* Blood drop marking menstruation */}
        <g
          transform={`translate(${dropAt.x}, ${dropAt.y}) scale(${dropScale}) translate(-12, -12)`}
          style={{ filter: 'drop-shadow(0 0 5px color-mix(in srgb, var(--color-menstrual) 70%, transparent))' }}
        >
          <path d={DROP_PATH} fill="var(--color-menstrual)" />
        </g>

        {/* Draggable day handle */}
        <motion.circle
          cx={marker.x}
          cy={marker.y}
          r={size * 0.03}
          fill="var(--phase)"
          opacity={0.32}
          animate={{ cx: marker.x, cy: marker.y }}
          transition={reduce || dragging ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
          style={{ filter: 'blur(5px)' }}
        />
        <motion.circle
          cx={marker.x}
          cy={marker.y}
          r={size * (dragging ? 0.032 : 0.027)}
          fill="#ffffff"
          stroke="var(--phase)"
          strokeWidth={size * 0.013}
          animate={{ cx: marker.x, cy: marker.y }}
          transition={reduce || dragging ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 24 }}
          style={{ filter: 'drop-shadow(0 2px 10px color-mix(in srgb, var(--phase) 70%, transparent))' }}
        />
      </motion.svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {children}
      </div>
    </div>
  );
}
