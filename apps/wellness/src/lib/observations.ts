import { calculateBmi } from './vitals';

export interface TimedReading {
  recorded_at: string;
  value: number;
}

export function scaleY(values: number[], height: number, pad: number): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => Math.round((pad + (1 - (v - min) / range) * (height - 2 * pad)) * 10) / 10);
}

export function buildSparklinePoints(values: number[], width: number, height: number, pad: number): string {
  if (values.length === 0) return '';
  const ys = scaleY(values, height, pad);
  if (ys.length === 1) return `0,${ys[0]}`;
  return ys.map((y, i) => `${Math.round((i * width) / (ys.length - 1))},${y}`).join(' ');
}

export function severityRank(chipClass: string): number {
  if (chipClass === 'chip2--alert') return 2;
  if (chipClass === 'chip2--warn') return 1;
  return 0;
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export interface BmiSeriesPoint {
  recorded_at: string;
  bmi: number;
}

// Weight is logged more often than height. Each weight point is paired with
// the most recent height recorded at or before it (falling back to the
// earliest known height for weights logged before any height was on file).
export function buildBmiSeries(weights: TimedReading[], heights: TimedReading[]): BmiSeriesPoint[] {
  if (heights.length === 0) return [];
  const sortedHeights = [...heights].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  return weights.map((w) => {
    const priorHeights = sortedHeights.filter((h) => h.recorded_at <= w.recorded_at);
    const height = priorHeights.length ? priorHeights[priorHeights.length - 1] : sortedHeights[0];
    return { recorded_at: w.recorded_at, bmi: calculateBmi(w.value, height.value) };
  });
}
