// Step 5 style screen: pick one of six art styles. No AI calls.
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { is_scene_art_ready, load_scene_art, render_scene_svg, subscribe_scene_art } from '../art/scenes';
import { StepShell } from '../components/Shell';
import { STYLE_IDS } from '../constants';
import { useT } from '../i18n';
import { useBook } from '../store/book_store';
import type { StyleId } from '../types';
import { svg_to_data_url } from '../utils/image';
import './StyleScreen.css';

/** Sample scene: the first story page. */
const SAMPLE_SCENE_INDEX = 1;

/** Step 5 style picker screen. */
export function StyleScreen() {
  const t = useT();
  const book = useBook((state) => state.book);
  const go = useBook((state) => state.go);
  const set_style = useBook((state) => state.set_style);

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

  return (
    <StepShell screen="style" on_prev={() => go('pages')} on_next={() => go('pictures')} width="wide">
      <div className="stack">
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
              onClick={() => set_style(style_id)}
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
      </div>
    </StepShell>
  );
}
