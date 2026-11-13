// 5단계 그림체 화면: 그림체 6개 중 하나를 고른다. AI를 부르지 않는다.
import { useMemo } from 'react';
import { render_scene_svg } from '../art/scenes';
import { StepShell } from '../components/Shell';
import { STYLE_IDS } from '../constants';
import { useT } from '../i18n';
import { useBook } from '../store/book_store';
import type { StyleId } from '../types';
import { svg_to_data_url } from '../utils/image';
import './StyleScreen.css';

/** 예시 그림에 쓰는 장면 번호 (본문 첫 장면) */
const SAMPLE_SCENE_INDEX = 1;

/**
 * 5단계 그림체 고르기 화면.
 */
export function StyleScreen() {
  const t = useT();
  const book = useBook((state) => state.book);
  const go = useBook((state) => state.go);
  const set_style = useBook((state) => state.set_style);

  // 예시 그림은 한 번만 만든다.
  const sample_urls = useMemo(
    () => Object.fromEntries(STYLE_IDS.map((id) => [id, svg_to_data_url(render_scene_svg(SAMPLE_SCENE_INDEX, id))])) as Record<StyleId, string>,
    [],
  );

  if (!book) return null;

  return (
    <StepShell screen="style" on_prev={() => go('pages')} on_next={() => go('pictures')} width="wide">
      <div className="stack">
        <h1 className="title-lg">{t('style.heading')}</h1>
        <p className="hint">{t('style.hint')}</p>
      </div>
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
              <img className="style-sample" src={sample_urls[style_id]} alt={t('style.sample_alt', { name })} />
              <span className="style-name">{name}</span>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
