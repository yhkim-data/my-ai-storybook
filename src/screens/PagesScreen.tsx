// Step 4 page split screen: a page list, and the chosen page's text and image description. One AI call splits the pages.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AiErrorNotice, Busy, to_provider_error } from '../components/Notice';
import { StepShell } from '../components/Shell';
import { page_name, useT } from '../i18n';
import { get_text_provider, type ProviderError } from '../providers';
import { make_input_key } from '../store/book_model';
import { useBook } from '../store/book_store';
import './PagesScreen.css';

/** Both inputs use the same rows so they are always the same height. */
const FIELD_ROWS = 6;
/** Page list rows before it adds a column, so long books still fit on one screen. */
const LIST_ROWS_MAX = 8;
const CHECK_ICON_SIZE = 16;

/** From this many list columns, items show only the page number (the full name stays for screen readers). */
const COMPACT_LIST_COLUMNS = 3;

/** Number of columns for the page list. */
function list_columns(count: number): number {
  return Math.max(1, Math.ceil(count / LIST_ROWS_MAX));
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" width={CHECK_ICON_SIZE} height={CHECK_ICON_SIZE} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.2 3L13 4.5" />
    </svg>
  );
}

function can_split_with_ai(): boolean {
  const book = useBook.getState().book;
  return book !== null && book.write_mode === 'ai' && book.chosen_plot !== null && get_text_provider() !== null;
}

/** Step 4 screen; continues to the style screen. */
export function PagesScreen() {
  const t = useT();
  const book = useBook((state) => state.book);
  const go = useBook((state) => state.go);
  const update_page = useBook((state) => state.update_page);
  /** 1-based story page shown on the right. */
  const [selected, set_selected] = useState(1);
  const [is_busy, set_busy] = useState(false);
  const [error, set_error] = useState<ProviderError | null>(null);
  // Decide only once on entry, even under StrictMode's double effects.
  const started_ref = useRef(false);

  /** Asks the AI to split the plot into pages; replaces the current page text. */
  const run_split = useCallback(async () => {
    const provider = get_text_provider();
    const current = useBook.getState().book;
    if (!provider || !current || !current.chosen_plot) return;
    set_busy(true);
    set_error(null);
    try {
      const drafts = await provider.splitIntoPages(current.chosen_plot, current.seed, current.lang);
      useBook
        .getState()
        .set_page_drafts(drafts, make_input_key(current.chosen_plot, current.seed, current.lang));
    } catch (cause) {
      set_error(to_provider_error(cause));
    } finally {
      set_busy(false);
    }
  }, []);

  useEffect(() => {
    if (started_ref.current) return;
    started_ref.current = true;
    const current = useBook.getState().book;
    if (!current) return;
    if (can_split_with_ai()) {
      // Skip the call when pages already match the page count, to keep the user's edits.
      const story_count = current.pages.length - 1;
      if (current.pages.length <= 1 || story_count !== current.seed.page_count) void run_split();
      return;
    }
    useBook.getState().ensure_page_count();
  }, [run_split]);

  if (!book) return null;

  const story_pages = book.pages.slice(1);
  const story_count = story_pages.length;
  // n is the 1-based story page number; book.pages[n] is that page.
  const n = Math.max(1, Math.min(selected, story_count));
  const page = book.pages[n];
  const is_ai = book.write_mode === 'ai' && book.chosen_plot !== null && get_text_provider() !== null;
  const columns = list_columns(story_count);
  const is_compact = columns >= COMPACT_LIST_COLUMNS;

  /** "Write it myself" from the error notice: switch to self-writing with blank pages. */
  const switch_to_self = () => {
    set_error(null);
    useBook.getState().set_write_mode('self');
    useBook.getState().ensure_page_count();
  };

  const self_button = (
    <button type="button" className="btn small" onClick={switch_to_self}>
      {t('plot.self')}
    </button>
  );

  return (
    <StepShell screen="pages" width="wider" on_prev={() => go('plot')} on_next={() => go('style')}>
      <div className="pages-top">
        <h1 className="title-lg">{t('pages.heading')}</h1>
        {story_count > 0 && <p className="hint">{t(is_ai ? 'pages.hint' : 'pages.self_hint')}</p>}
      </div>

      {is_busy && <Busy>{t('pages.loading')}</Busy>}
      {error && !is_busy && <AiErrorNotice error={error} on_retry={() => void run_split()} extra_action={self_button} />}

      {story_count > 0 && page && !is_busy && (
        <div className="pages-layout">
          <nav className="pages-nav" aria-label={t('pages.list')}>
            <div className="pages-list" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
              {story_pages.map((item, index) => {
                const number = index + 1;
                const has_text = item.text.trim().length > 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="pages-item"
                    aria-current={number === n ? 'true' : undefined}
                    onClick={() => set_selected(number)}
                  >
                    {is_compact ? (
                      <>
                        <span aria-hidden="true">{number}</span>
                        <span className="sr-only">{page_name(t, number)}</span>
                      </>
                    ) : (
                      <span>{page_name(t, number)}</span>
                    )}
                    {has_text && (
                      <>
                        <CheckIcon />
                        <span className="sr-only">{t('pages.filled')}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <section className="pages-main" aria-label={page_name(t, n)}>
            <div className="pages-fields">
              <label htmlFor={`page-text-${n}`} className="field-label small pages-label-text">
                {t('pages.text_label', { n })}
              </label>
              <textarea
                id={`page-text-${n}`}
                className="text-area pages-input pages-input-text"
                rows={FIELD_ROWS}
                placeholder={t('pages.text_placeholder')}
                value={page.text}
                onChange={(event) => update_page(n, { text: event.target.value })}
              />
              <label htmlFor={`page-desc-${n}`} className="field-label small pages-label-desc">
                {t('pages.desc_label', { n })}
              </label>
              <textarea
                id={`page-desc-${n}`}
                className="text-area pages-input pages-input-desc"
                rows={FIELD_ROWS}
                placeholder={t('pages.desc_placeholder')}
                value={page.image_prompt}
                onChange={(event) => update_page(n, { image_prompt: event.target.value })}
              />
            </div>
            <div className="row spread">
              <div className="row">
                <button type="button" className="btn small" disabled={n <= 1} onClick={() => set_selected(n - 1)}>
                  {t('pages.prev_page')}
                </button>
                <button type="button" className="btn small" disabled={n >= story_count} onClick={() => set_selected(n + 1)}>
                  {t('pages.next_page')}
                </button>
              </div>
              {is_ai && (
                <button type="button" className="btn small" onClick={() => void run_split()} disabled={is_busy}>
                  {t('pages.rewrite')}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </StepShell>
  );
}
