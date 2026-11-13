// 3단계 줄거리 화면. AI가 줄거리 3개를 제안하면 고르고 고친다. 직접 쓸 수도 있다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AiErrorNotice, Busy, Notice, to_provider_error } from '../components/Notice';
import { StepShell } from '../components/Shell';
import { useT } from '../i18n';
import { get_text_provider, type ProviderError } from '../providers';
import { useBook } from '../store/book_store';
import { make_input_key } from '../store/book_model';
import { useSettings } from '../store/settings_store';
import './PlotScreen.css';

/** 직접 쓸 때 줄거리에 붙이는 식별자 */
const SELF_PLOT_ID = 'self';
/** 제목과 줄거리 칸 크기 */
const TITLE_MAX_LENGTH = 60;
const SUMMARY_ROWS = 4;

/**
 * 3단계 화면. 줄거리를 고르거나 직접 쓰고 나면 쪽 나누기 화면으로 간다.
 */
export function PlotScreen() {
  const t = useT();
  const book = useBook((state) => state.book);
  const go = useBook((state) => state.go);
  const choose_plot = useBook((state) => state.choose_plot);
  const set_write_mode = useBook((state) => state.set_write_mode);
  const has_connection = useSettings((state) => state.practice || state.text_key !== '');
  const [is_busy, set_busy] = useState(false);
  const [error, set_error] = useState<ProviderError | null>(null);
  const [show_need_title, set_show_need_title] = useState(false);
  // 같은 입력으로 자동 호출을 두 번 하지 않게 막는다 (StrictMode에서도 한 번).
  const requested_ref = useRef(false);

  const provider = has_connection ? get_text_provider() : null;
  const has_provider = provider !== null;
  const write_mode = book?.write_mode ?? 'ai';
  const plots_count = book?.plots.length ?? 0;

  /** 줄거리를 AI에게 한 번 묻고 결과를 책에 저장한다. */
  const run_suggest = useCallback(async () => {
    const text_provider = get_text_provider();
    const current = useBook.getState().book;
    if (!text_provider || !current) return;
    set_busy(true);
    set_error(null);
    try {
      const plots = await text_provider.suggestPlots(current.seed, current.lang);
      useBook.getState().set_plots(plots, make_input_key(current.seed, current.lang));
    } catch (cause) {
      set_error(to_provider_error(cause));
    } finally {
      set_busy(false);
    }
  }, []);

  useEffect(() => {
    if (write_mode === 'self') {
      requested_ref.current = false;
      return;
    }
    if (!has_provider || plots_count > 0 || requested_ref.current) return;
    requested_ref.current = true;
    void run_suggest();
  }, [write_mode, has_provider, plots_count, run_suggest]);

  if (!book) return null;

  const is_self = write_mode === 'self' || !has_provider;
  const chosen = book.chosen_plot;
  const show_editor = is_self || chosen !== null;
  const need_title = show_need_title && (chosen === null || chosen.title.trim() === '');

  /** 입력을 시작하면 "제목이 비었어요" 안내를 지운다. */
  const clear_need_title = () => set_show_need_title(false);

  /** 제목이나 줄거리를 고칠 때마다 고른 줄거리로 저장한다. */
  const edit_chosen = (patch: { title?: string; summary?: string }) => {
    clear_need_title();
    choose_plot({
      id: chosen?.id ?? SELF_PLOT_ID,
      title: patch.title ?? chosen?.title ?? '',
      summary: patch.summary ?? chosen?.summary ?? '',
    });
  };

  /** 제목이 있으면 다음 단계로 간다. */
  const handle_next = () => {
    if (!chosen || chosen.title.trim() === '') {
      set_show_need_title(true);
      return;
    }
    go('pages');
  };

  /** 줄거리 오류에서 "내가 직접 쓸게요"를 누른다. */
  const switch_to_self = () => {
    set_error(null);
    set_write_mode('self');
  };

  const self_button = (
    <button type="button" className="btn small" onClick={switch_to_self}>
      {t('plot.self')}
    </button>
  );

  return (
    <StepShell screen="plot" on_prev={() => go('seed')} on_next={handle_next}>
      <h1 className="title-lg">{t('plot.heading')}</h1>

      {is_busy && <Busy>{t('plot.loading')}</Busy>}
      {error && !is_busy && <AiErrorNotice error={error} on_retry={() => void run_suggest()} extra_action={self_button} />}

      {is_self && (
        <div className="stack">
          <p className="hint">{t(has_provider ? 'plot.self_hint' : 'plot.no_ai')}</p>
          {has_provider && (
            <div className="row">
              <button type="button" className="btn" onClick={() => set_write_mode('ai')}>
                {t('plot.ask_ai')}
              </button>
            </div>
          )}
        </div>
      )}

      {!is_self && book.plots.length > 0 && (
        <div className="stack">
          <p className="hint">{t('plot.pick_hint')}</p>
          <div className="plot-cards">
            {book.plots.map((plot, index) => (
              <button
                key={plot.id}
                type="button"
                className="card selectable"
                aria-pressed={chosen?.id === plot.id}
                aria-label={t('plot.option_aria', { n: index + 1, title: plot.title })}
                onClick={() => {
                  clear_need_title();
                  choose_plot({ ...plot });
                }}
              >
                <span className="plot-card-title">{plot.title}</span>
                <span className="plot-card-summary">{plot.summary}</span>
              </button>
            ))}
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={() => void run_suggest()} disabled={is_busy}>
              {t('plot.again')}
            </button>
            <button type="button" className="btn" onClick={switch_to_self}>
              {t('plot.self')}
            </button>
          </div>
        </div>
      )}

      {show_editor && (
        <div className="stack loose">
          <div className="plot-field">
            <label htmlFor="plot-title" className="field-label">
              {t('plot.title_label')}
            </label>
            <input
              id="plot-title"
              type="text"
              className="text-input"
              maxLength={TITLE_MAX_LENGTH}
              placeholder={t('plot.title_placeholder')}
              value={chosen?.title ?? ''}
              onChange={(event) => edit_chosen({ title: event.target.value })}
            />
          </div>
          <div className="plot-field">
            <label htmlFor="plot-summary" className="field-label">
              {t('plot.summary_label')}
            </label>
            <textarea
              id="plot-summary"
              className="text-area"
              rows={SUMMARY_ROWS}
              placeholder={t('plot.summary_placeholder')}
              value={chosen?.summary ?? ''}
              onChange={(event) => edit_chosen({ summary: event.target.value })}
            />
          </div>
        </div>
      )}

      {need_title && (
        <Notice kind="warn" role="alert">
          {t('plot.need_title')}
        </Notice>
      )}
    </StepShell>
  );
}
