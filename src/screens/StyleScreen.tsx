// Step 5 style screen: pick one of six art styles, or describe your own style in words. No AI calls.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { is_scene_art_ready, load_scene_art, render_scene_svg, subscribe_scene_art } from '../art/scenes';
import { Notice } from '../components/Notice';
import { StepShell } from '../components/Shell';
import { CUSTOM_STYLE_MAX_LENGTH, STYLE_IDS } from '../constants';
import { useT } from '../i18n';
import { useBook } from '../store/book_store';
import type { StyleId } from '../types';
import { svg_to_data_url } from '../utils/image';
import './StyleScreen.css';

/** Sample scene: the first story page. */
const SAMPLE_SCENE_INDEX = 1;
const CUSTOM_INPUT_ID = 'custom-style';
const CUSTOM_ROWS = 4;
const PENCIL_ICON_SIZE = 32;

/** Outline pencil for the "my own style" card. */
function PencilIcon() {
  return (
    <svg aria-hidden="true" width={PENCIL_ICON_SIZE} height={PENCIL_ICON_SIZE} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 5.5l5 5L12 25l-6.5 1.5L7 20z" />
      <path d="M18.5 8.5l5 5" />
      <path d="M5 29h12" />
    </svg>
  );
}

/** Step 5 style picker screen. */
export function StyleScreen() {
  const t = useT();
  const book = useBook((state) => state.book);
  const go = useBook((state) => state.go);
  const set_style = useBook((state) => state.set_style);
  const set_custom_style = useBook((state) => state.set_custom_style);
  const [show_need_custom, set_show_need_custom] = useState(false);
  const custom_input_ref = useRef<HTMLTextAreaElement>(null);

  const art_ready = useSyncExternalStore(subscribe_scene_art, is_scene_art_ready);
  useEffect(() => {
    load_scene_art().catch(() => undefined);
  }, []);

  // Build the sample images once the art is there.
  const sample_urls = useMemo(
    () =>
      Object.fromEntries(
        STYLE_IDS.map((id) => [id, art_ready ? svg_to_data_url(render_scene_svg(SAMPLE_SCENE_INDEX, id)) : '']),
      ) as Record<StyleId, string>,
    [art_ready],
  );

  if (!book) return null;
  const is_custom = book.style_id === 'custom';
  const need_custom = show_need_custom && is_custom && book.custom_style.trim() === '';

  const pick_style = (style_id: StyleId) => {
    set_show_need_custom(false);
    set_style(style_id);
  };

  /** Choosing the card keeps any words already written and puts the cursor in the box. */
  const pick_custom = () => {
    set_style('custom');
    custom_input_ref.current?.focus();
  };

  const handle_next = () => {
    if (book.style_id === 'custom' && book.custom_style.trim() === '') {
      set_show_need_custom(true);
      custom_input_ref.current?.focus();
      return;
    }
    go('pictures');
  };

  return (
    <StepShell screen="style" on_prev={() => go('pages')} on_next={handle_next} width="wider">
      <div className="style-top">
        <h1 className="title-lg">{t('style.heading')}</h1>
        <p className="hint">{t('style.hint')}</p>
      </div>
      <div className="style-layout">
        <div className="style-grid">
          {STYLE_IDS.map((style_id) => {
            const name = t(`style.name.${style_id}`);
            return (
              <button
                key={style_id}
                type="button"
                className="style-card"
                aria-pressed={book.style_id === style_id}
                onClick={() => pick_style(style_id)}
              >
                {sample_urls[style_id] ? (
                  <img className="style-sample" src={sample_urls[style_id]} alt={t('style.sample_alt', { name })} />
                ) : (
                  <span className="style-sample" aria-hidden="true" />
                )}
                <span className="style-name">{name}</span>
              </button>
            );
          })}
        </div>

        <section className={is_custom ? 'style-custom selected' : 'style-custom'} aria-labelledby="custom-style-title">
          <button type="button" className="style-custom-pick" aria-pressed={is_custom} onClick={pick_custom}>
            <PencilIcon />
            <span id="custom-style-title" className="style-custom-title">
              {t('style.custom.title')}
            </span>
            <span className="style-custom-desc">{t('style.custom.desc')}</span>
          </button>
          <label htmlFor={CUSTOM_INPUT_ID} className="style-custom-label">
            {t('style.custom.label')}
          </label>
          <textarea
            ref={custom_input_ref}
            id={CUSTOM_INPUT_ID}
            className="text-area style-custom-input"
            rows={CUSTOM_ROWS}
            maxLength={CUSTOM_STYLE_MAX_LENGTH}
            placeholder={t('style.custom.placeholder')}
            value={book.custom_style}
            onChange={(event) => {
              set_show_need_custom(false);
              set_custom_style(event.target.value);
            }}
          />
          {need_custom ? (
            <Notice kind="warn" role="alert">
              {t('style.need_custom')}
            </Notice>
          ) : (
            <span className="style-custom-hint">{t('style.custom.hint')}</span>
          )}
        </section>
      </div>
    </StepShell>
  );
}
