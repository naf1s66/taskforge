import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TaskTagSelector } from './task-tag-selector';

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub as typeof ResizeObserver;
Element.prototype.scrollIntoView = vi.fn();

describe('TaskTagSelector', () => {
  it('allows creating a distinct tag that is a substring of an existing tag', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TaskTagSelector
        value={[]}
        onChange={onChange}
        availableTags={['api-v2']}
        placeholder="Select tags"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Select tags' }));
    await user.type(screen.getByRole('combobox'), 'api{Enter}');

    expect(onChange).toHaveBeenCalledWith(['api']);
  });

  it('does not create a duplicate for exact normalized tag matches', async () => {
    const user = userEvent.setup();

    render(
      <TaskTagSelector
        value={[]}
        onChange={vi.fn()}
        availableTags={['API']}
        placeholder="Select tags"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Select tags' }));
    await user.type(screen.getByRole('combobox'), 'api');

    expect(screen.queryByRole('button', { name: 'Create "api"' })).not.toBeInTheDocument();
  });
});
