import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ComingSoon } from './ComingSoon';

describe('ComingSoon', () => {
  it('renders the given title and a coming-soon message', () => {
    render(<ComingSoon title="My Health" />);
    expect(screen.getByRole('heading', { name: 'My Health' })).toBeInTheDocument();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
