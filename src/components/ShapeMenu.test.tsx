// Book shape menu: opens a list that works with the mouse and the keyboard (arrows, Enter, Escape).
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translate } from '../i18n';
import { useSettings } from '../store/settings_store';
import type { PageShape } from '../types';
import { ShapeMenu } from './ShapeMenu';

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);

beforeEach(() => useSettings.setState({ lang: 'ko' }));
afterEach(() => cleanup());

function setup(value: PageShape = 'square') {
  const on_change = vi.fn();
  render(<ShapeMenu value={value} on_change={on_change} />);
  const button = screen.getByRole('button', { name: ko('editor.shape_aria', { name: ko(`editor.shape.${value}`) }) });
  return { on_change, button };
}

describe('ShapeMenu', () => {
  it('lists the three shapes with the current one selected', () => {
    const { button } = setup('portrait');
    fireEvent.click(button);
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([ko('editor.shape.square'), ko('editor.shape.portrait'), ko('editor.shape.landscape')]);
    expect(screen.getByRole('option', { name: ko('editor.shape.portrait') })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('listbox')).toHaveFocus();
  });

  it('arrow keys move and Enter picks; the focus goes back to the button', () => {
    const { on_change, button } = setup();
    fireEvent.keyDown(button, { key: 'ArrowDown' });
    const list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(list).toHaveAttribute('aria-activedescendant', 'shape-option-landscape');
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(on_change).toHaveBeenCalledWith('landscape');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('Escape closes the list without a change', () => {
    const { on_change, button } = setup();
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(on_change).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
  });

  it('a click on an option picks it', () => {
    const { on_change, button } = setup();
    fireEvent.click(button);
    fireEvent.click(screen.getByRole('option', { name: ko('editor.shape.portrait') }));
    expect(on_change).toHaveBeenCalledWith('portrait');
  });
});
