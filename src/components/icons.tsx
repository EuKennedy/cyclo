import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

/** Blood drop — menstruation. */
export function DropIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5c3.5 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2.5-6 6-10Z" />
    </svg>
  );
}

/** Solid blood drop, for markers where fill reads better than stroke. */
export function DropFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 3c3.6 4.1 6 7.2 6 10.2A6 6 0 0 1 6 13.2C6 10.2 8.4 7.1 12 3Z" />
    </svg>
  );
}

/** Sprout — the follicular phase, when energy climbs back up. */
export function SproutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path
        d="M12 21.2v-6.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M12.4 14.4c0-3.4 2.8-6.2 6.2-6.2 0 3.4-2.8 6.2-6.2 6.2Z" />
      <path d="M11.6 15.4c0-2.9-2.3-5.2-5.2-5.2 0 2.9 2.3 5.2 5.2 5.2Z" opacity="0.8" />
    </svg>
  );
}

/**
 * Ovum with its corona — the fertile window. Deliberately built from dots
 * rather than rays: rays read as a sun, dots read as an egg cell.
 */
export function OvumIcon(props: SVGProps<SVGSVGElement>) {
  const dots = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    return { x: 12 + 8.9 * Math.cos(a), y: 12 + 8.9 * Math.sin(a) };
  });
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="5.3" />
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="1.15" opacity="0.85" />
      ))}
    </svg>
  );
}

/** Soft filled cloud — the luteal / premenstrual stretch. */
export function CloudFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 18.5h9.1a3.9 3.9 0 0 0 .35-7.78 5.75 5.75 0 0 0-10.98-1.3A4.3 4.3 0 0 0 8 18.5Z" />
    </svg>
  );
}

export function ChartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

/** Cloud with a lightning bolt — marks PMS (TPM) days. */
export function CloudLightningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6.5 15a4.5 4.5 0 0 1 .7-8.95 5.5 5.5 0 0 1 10.5 1.7A3.8 3.8 0 0 1 17.5 15" />
      <path d="M12.5 12.5 10 17h3.5L11 21.5" />
    </svg>
  );
}

/** Heart — sexual activity log. */
export function HeartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20Z" />
    </svg>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
