// AI usage chip and panel: chip text, the connections, counts, cost only where the price is known, the picture limit,
// the provider usage links and switching connections.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translate } from '../i18n';
import { get_image_provider } from '../providers';
import provider_pages from '../providers/provider_pages.json';
import { ProviderError } from '../providers/types';
import { useSettings } from '../store/settings_store';
import { UsageChip } from './UsageChip';

const ko = (key: string, params?: Record<string, string | number>) => translate('ko', key, params);
const GEMINI_KEY = 'test-key-a1b2';
const OPENAI_KEY = 'sk-' + 'test-fake-c3d4';

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({
    lang: 'ko',
    practice: false,
    connections: [],
    text_connection: null,
    image_connection: null,
    text_key: '',
    image_key: '',
    image_limit: null,
    usage_today: { text: 0, image: 0 },
    usage_session: { text: 0, image: 0 },
  });
});
afterEach(() => cleanup());

function open_panel() {
  fireEvent.click(document.querySelector<HTMLButtonElement>('.usage-chip')!);
  return screen.getByRole('dialog', { name: ko('usage.title') });
}

describe('UsageChip', () => {
  it('says not connected, practice mode, or the pictures used with and without a limit', () => {
    const { rerender } = render(<UsageChip />);
    expect(screen.getByRole('button', { name: ko('usage.chip_aria', { text: ko('usage.chip_off') }) })).toBeInTheDocument();
    useSettings.setState({ practice: true });
    rerender(<UsageChip />);
    expect(screen.getByText(ko('usage.chip_practice'))).toBeInTheDocument();
    useSettings.setState({ practice: false });
    useSettings.getState().connect_key(GEMINI_KEY, 'text');
    useSettings.setState({ usage_today: { text: 3, image: 12 } });
    rerender(<UsageChip />);
    expect(screen.getByText(ko('usage.chip', { n: 12 }))).toBeInTheDocument();
    useSettings.getState().set_image_limit(30);
    rerender(<UsageChip />);
    expect(screen.getByText(ko('usage.chip_limit', { n: 12, max: 30 }))).toBeInTheDocument();
  });

  it('the panel shows the connections with only the key tail, both counts, the cost for a priced picture kind, and the usage pages', () => {
    useSettings.getState().connect_key(GEMINI_KEY, 'text');
    useSettings.setState({ usage_today: { text: 2, image: 10 }, usage_session: { text: 1, image: 4 } });
    render(<UsageChip />);
    const panel = open_panel();
    expect(panel).toHaveTextContent('…a1b2');
    expect(panel.textContent).not.toContain(GEMINI_KEY);
    expect(panel).toHaveTextContent(ko('usage.counts', { text: 1, image: 4 }));
    expect(panel).toHaveTextContent(ko('usage.counts', { text: 2, image: 10 }));
    // 10 pictures x $0.0336 x 1335 won = about 449 won.
    expect(within(panel).getByTestId('usage-cost')).toHaveTextContent('약 449원');
    const links = within(panel).getAllByRole('link').map((link) => link.getAttribute('href'));
    expect(links).toEqual([provider_pages.usage.gemini, provider_pages.usage.claude, provider_pages.usage.openai]);
  });

  it('hides the cost line for a picture kind without a stated per-picture price', () => {
    useSettings.getState().connect_key(OPENAI_KEY, 'text');
    useSettings.setState({ usage_today: { text: 0, image: 3 } });
    render(<UsageChip />);
    const panel = open_panel();
    expect(within(panel).queryByTestId('usage-cost')).toBeNull();
  });

  it('the picture limit warns at 80% and stops pictures when used up', async () => {
    useSettings.getState().connect_key(GEMINI_KEY, 'text');
    useSettings.setState({ usage_today: { text: 0, image: 8 } });
    render(<UsageChip />);
    const panel = open_panel();
    fireEvent.change(within(panel).getByLabelText(ko('usage.limit_label')), { target: { value: '10' } });
    expect(useSettings.getState().image_limit).toBe(10);
    expect(panel).toHaveTextContent(ko('usage.limit_near', { n: 8, max: 10 }));
    useSettings.setState({ usage_today: { text: 0, image: 10 } });
    expect(await within(panel).findByText(ko('error.limit'))).toBeInTheDocument();
    vi.stubGlobal('fetch', vi.fn());
    const provider = get_image_provider()!;
    await expect(provider.generate({ description: 'x', style_id: 'watercolor', custom_style: '', hero_card: '', reference_image: null, page_index: 1, lang: 'ko' })).rejects.toMatchObject({
      kind: 'limit',
    } satisfies Partial<ProviderError>);
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    // Emptying the box removes the limit.
    fireEvent.change(within(panel).getByLabelText(ko('usage.limit_label')), { target: { value: '' } });
    expect(useSettings.getState().image_limit).toBeNull();
  });

  it('switches the words and picture connections, and a connection without its key asks for it', () => {
    useSettings.getState().connect_key(GEMINI_KEY, 'text');
    useSettings.getState().connect_key(OPENAI_KEY, 'image');
    const [gemini, openai] = useSettings.getState().connections;
    useSettings.setState({ connections: [gemini!, { ...openai!, key: '' }] });
    render(<UsageChip />);
    const panel = open_panel();
    const text_select = within(panel).getByLabelText(ko('usage.text_role'));
    expect(Array.from((text_select as HTMLSelectElement).options).map((option) => option.textContent)).toEqual([
      'Google Gemini …a1b2',
      `OpenAI (${ko('usage.needs_key')})`,
      ko('usage.chip_practice'),
    ]);
    fireEvent.change(text_select, { target: { value: 'practice' } });
    expect(useSettings.getState().practice).toBe(true);
    fireEvent.change(text_select, { target: { value: openai!.id } });
    expect(useSettings.getState().text_connection).toBe(openai!.id);
    expect(useSettings.getState().key_prompt_open).toBe(true);
  });
});
