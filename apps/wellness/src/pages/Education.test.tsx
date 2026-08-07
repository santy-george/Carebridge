import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Education } from './Education';
import { EDUCATION_ARTICLES, EDUCATION_TIPS } from '../lib/education';

function renderEducation() {
  return render(
    <MemoryRouter initialEntries={['/education']}>
      <Routes>
        <Route path="/education" element={<Education />} />
        <Route path="/more" element={<div>More content</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Education', () => {
  it('shows every article title and tag', () => {
    renderEducation();
    for (const article of EDUCATION_ARTICLES) {
      expect(screen.getByText(article.title)).toBeInTheDocument();
      expect(screen.getByText(article.tag)).toBeInTheDocument();
    }
  });

  it('shows every tip', () => {
    renderEducation();
    for (const tip of EDUCATION_TIPS) {
      expect(screen.getByText(tip)).toBeInTheDocument();
    }
  });

  it('back link goes to /more', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderEducation();

    await user.click(screen.getByRole('link', { name: /back to more/i }));
    expect(await screen.findByText('More content')).toBeInTheDocument();
  });
});
