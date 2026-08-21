import type { CSSProperties } from 'react';

interface GaugeRingProps {
  percent: number;
  colorVar: string;
  label: string;
  size?: 'sm' | 'lg' | 'hero';
  sublabel?: string;
  trackColor?: string;
  textColor?: string;
}

export function GaugeRing({
  percent,
  colorVar,
  label,
  size = 'lg',
  sublabel,
  trackColor,
  textColor,
}: GaugeRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const className =
    size === 'sm' ? 'ring ring--sm' : size === 'hero' ? 'ring ring--hero' : 'ring';
  const style = {
    '--p': clamped,
    '--accent': colorVar,
    ...(trackColor ? { '--ring-track': trackColor } : {}),
    ...(textColor ? { '--ring-color': textColor } : {}),
  } as CSSProperties;

  return (
    <div className={className} style={style}>
      <b>{label}</b>
      {sublabel && <span className="ring__sub">{sublabel}</span>}
    </div>
  );
}