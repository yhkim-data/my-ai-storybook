// Step 4 page split screen: edit each page's text and image description. One AI call splits the pages.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AiErrorNotice, Busy, to_provider_error } from '../components/Notice';
import { StepShell } from '../components/Shell';
import { page_name, useT } from '../i18n';
import { get_text_provider, type ProviderError } from '../providers';
import { make_input_key } from '../store/book_model';
import { useBook } from '../store/book_store';
import './PagesScreen.css';

const TEXT_ROWS = 3;
const DESC_ROWS = 2;

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
  const is_ai = book.write_mode === 'ai' && book.chosen_plot !== null && get_text_provider() !== null;

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
    <StepShell screen="pages" on_prev={() => go('plot')} on_next={() => go('style')}>
      <h1 className="title-lg">{t('pages.heading')}</h1>

      {is_busy && <Busy>{t('pages.loading')}</Busy>}
      {error && !is_busy && <AiErrorNotice error={error} on_retry={() => void run_split()} extra_action={self_button} />}

      {story_pages.length > 0 && (
        <>
          <p className="hint">{t(is_ai ? 'pages.hint' : 'pages.self_hint')}</p>
          {story_pages.map((page, index) => {
            const n = index + 1;
            return (
              <div key={page.id} className="card stack">
                <span className="pages-card-name">{page_name(t, n)}</span>
                <div className="pages-card-grid">
                  <div className="pages-field">
                    <label htmlFor={`page-text-${n}`} className="field-label small">
                      {t('pages.text_label', { n })}
                    </label>
                    <textarea
                      id={`page-text-${n}`}
                      className="text-area"
                      rows={TEXT_ROWS}
                      placeholder={t('pages.text_placeholder')}
                      value={page.text}
                      onChange={(event) => update_page(n, { text: event.target.value })}
                    />
                  </div>
                  <div className="pages-field">
                    <label htmlFor={`page-desc-${n}`} className="field-label small">
                      {t('pages.desc_label', { n })}
                    </label>
                    <textarea
                      id={`page-desc-${n}`}
                      className="text-area"
                      rows={DESC_ROWS}
                      placeholder={t('pages.desc_placeholder')}
                      value={page.image_prompt}
                      onChange={(event) => update_page(n, { image_prompt: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {is_ai && (
            <div className="row">
              <button type="button" className="btn" onClick={() => void run_split()} disabled={is_busy}>
                {t('pages.rewrite')}
              </button>
            </div>
          )}
        </>
      )}
    </StepShell>
  );
}
