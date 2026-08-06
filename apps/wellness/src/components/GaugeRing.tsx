import type { CSSProperties } from 'react';

interface GaugeRingProps {
  percent: number;
  colorVar: string;
  label: string;
  size?: 'sm' | 'lg';
}

export function GaugeRing({ percent, colorVar, label, size = 'lg' }: GaugeRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const className = size === 'sm' ? 'ring ring--sm' : 'ring';
  const style = { '--p': clamped, '--accent': colorVar } as CSSProperties;

  return (
    <div className={className} style={style}>
      <b>{label}</b>
    </div>
  );
}
