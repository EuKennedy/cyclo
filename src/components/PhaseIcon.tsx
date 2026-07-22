import type { ComponentType, SVGProps } from 'react';
import type { PhaseId } from '@/domain/types';
import { PHASES } from '@/lib/phases';
import { CloudFilledIcon, DropFilledIcon, OvumIcon, SproutIcon } from './icons';

const ICONS: Record<PhaseId, ComponentType<SVGProps<SVGSVGElement>>> = {
  menstrual: DropFilledIcon,
  follicular: SproutIcon,
  ovulatory: OvumIcon,
  luteal: CloudFilledIcon,
};

/** The single source of truth for "which glyph represents this phase". */
export function PhaseIcon({
  phase,
  colored = true,
  style,
  ...props
}: { phase: PhaseId; colored?: boolean } & SVGProps<SVGSVGElement>) {
  const Icon = ICONS[phase];
  return <Icon {...props} style={colored ? { color: PHASES[phase].color, ...style } : style} />;
}
