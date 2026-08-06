import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GaugeRing } from './GaugeRing';

describe('GaugeRing', () => {
  it('renders the label text', () => {
    render(<GaugeRing percent={72} colorVar="var(--mint-500)" label="120" />);
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('uses the small size class when size="sm"', () => {
    render(<GaugeRing percent={50} colorVar="var(--mint-500)" label="97" size="sm" />);
    expect(screen.getByText('97').parentElement).toHaveClass('ring--sm');
  });

  it('defaults to the large size class', () => {
    render(<GaugeRing percent={50} colorVar="var(--mint-500)" label="72" />);
    const el = screen.getByText('72').parentElement;
    expect(el).toHaveClass('ring');
    expect(el).not.toHaveClass('ring--sm');
  });

  it('clamps percent into 0-100 for the --p custom property', () => {
    render(<GaugeRing percent={150} colorVar="var(--mint-500)" label="x" />);
    const el = screen.getByText('x').parentElement as HTMLElement;
    expect(el.style.getPropertyValue('--p')).toBe('100');
  });
});
