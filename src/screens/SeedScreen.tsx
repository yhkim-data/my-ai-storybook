// 2단계 이야기 씨앗 화면. 나이대, 주제, 주인공, 쪽수를 받는다. AI는 부르지 않는다.
import { useState } from 'react';
import { Notice } from '../components/Notice';
import { StepShell } from '../components/Shell';
import { AGE_BANDS, PAGE_COUNTS, TOPIC_IDS } from '../constants';
import { useT } from '../i18n';
import { useBook } from '../store/book_store';
import type { StorySeed } from '../types';
import './SeedScreen.css';

/** 주인공 이름과 모습의 최대 글자 수 */
const HERO_NAME_MAX_LENGTH = 20;
const HERO_LOOK_MAX_LENGTH = 200;
/** 주인공 모습 칸의 줄 수 */
const HERO_LOOK_ROWS = 3;

/** 넘어가지 못할 때 보여 주는 안내 종류 */
type SeedProblem = 'need_topic' | 'need_name' | null;

/**
 * 2단계 화면. 다 채우면 줄거리 화면으로 간다.
 */
export function SeedScreen() {
  const t = useT();
  const book = useBook((state) => state.book);
  const go = useBook((state) => state.go);
  const update_seed = useBook((state) => state.update_seed);
  const [custom_open, set_custom_open] = useState(false);
  const [problem, set_problem] = useState<SeedProblem>(null);

  if (!book) return null;
  const seed = book.seed;

  const topic_words = TOPIC_IDS.map((id) => t(`seed.topic.${id}`));
  // 다섯 낱말에 없는 주제가 이미 있으면 직접 쓰기 상태로 본다.
  const is_custom = custom_open || (seed.topic !== '' && !topic_words.includes(seed.topic));

  /** 씨앗을 고치고 이전 안내는 지운다. */
  const patch_seed = (patch: Partial<StorySeed>) => {
    set_problem(null);
    update_seed(patch);
  };

  /** 주제 칩을 누르면 번역된 낱말을 주제로 저장한다. */
  const pick_topic = (word: string) => {
    set_custom_open(false);
    patch_seed({ topic: word });
  };

  /** "직접 쓸래요"를 누르면 입력 칸을 열고, 칩에서 고른 낱말은 비운다. */
  const open_custom = () => {
    set_custom_open(true);
    if (topic_words.includes(seed.topic)) patch_seed({ topic: '' });
  };

  /** 빠진 것이 없으면 다음 단계로 간다. */
  const handle_next = () => {
    if (seed.topic.trim() === '') {
      set_problem('need_topic');
      return;
    }
    if (seed.hero_name.trim() === '') {
      set_problem('need_name');
      return;
    }
    go('plot');
  };

  return (
    <StepShell screen="seed" on_prev={() => go('start')} on_next={handle_next}>
      <h1 className="title-lg">{t('seed.heading')}</h1>

      <fieldset className="seed-field">
        <legend className="field-label">{t('seed.age.legend')}</legend>
        <div className="seed-chips">
          {AGE_BANDS.map((band) => (
            <button
              key={band}
              type="button"
              className="chip"
              aria-pressed={seed.age_band === band}
              onClick={() => patch_seed({ age_band: band })}
            >
              {t(`seed.age.${band}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="seed-field">
        <legend className="field-label">{t('seed.topic.legend')}</legend>
        <div className="seed-chips">
          {TOPIC_IDS.map((id, index) => {
            const word = topic_words[index] ?? '';
            return (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={!is_custom && seed.topic === word}
                onClick={() => pick_topic(word)}
              >
                {word}
              </button>
            );
          })}
          <button type="button" className="chip dashed" aria-pressed={is_custom} onClick={open_custom}>
            {t('seed.topic.custom')}
          </button>
        </div>
        {is_custom && (
          <div className="seed-field">
            <label htmlFor="topic-custom" className="field-label small">
              {t('seed.topic.custom_label')}
            </label>
            <input
              id="topic-custom"
              type="text"
              className="text-input"
              placeholder={t('seed.topic.custom_placeholder')}
              value={seed.topic}
              onChange={(event) => patch_seed({ topic: event.target.value })}
            />
          </div>
        )}
      </fieldset>

      <div className="grid-2">
        <div className="seed-field">
          <label htmlFor="hero-name" className="field-label">
            {t('seed.hero_name.label')}
          </label>
          <input
            id="hero-name"
            type="text"
            className="text-input"
            maxLength={HERO_NAME_MAX_LENGTH}
            placeholder={t('seed.hero_name.placeholder')}
            value={seed.hero_name}
            onChange={(event) => patch_seed({ hero_name: event.target.value })}
          />
        </div>
        <div className="seed-field">
          <span id="pages-label" className="field-label">
            {t('seed.pages.label')}
          </span>
          <div role="group" aria-labelledby="pages-label" className="seed-seg-grid">
            {PAGE_COUNTS.map((count) => (
              <button
                key={count}
                type="button"
                className="seg"
                aria-pressed={seed.page_count === count}
                onClick={() => patch_seed({ page_count: count })}
              >
                {t('seed.pages.option', { n: count })}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="seed-field">
        <label htmlFor="hero-look" className="field-label">
          {t('seed.hero_look.label')}
        </label>
        <textarea
          id="hero-look"
          className="text-area"
          rows={HERO_LOOK_ROWS}
          maxLength={HERO_LOOK_MAX_LENGTH}
          placeholder={t('seed.hero_look.placeholder')}
          value={seed.hero_look}
          onChange={(event) => patch_seed({ hero_look: event.target.value })}
        />
      </div>

      <Notice kind="warn">{t('seed.privacy')}</Notice>
      {problem && (
        <Notice kind="warn" role="alert">
          {t(`seed.${problem}`)}
        </Notice>
      )}
    </StepShell>
  );
}
