// Step 2 story seed screen: age band, topic, hero and page count. No AI calls.
import { useState } from 'react';
import { Notice } from '../components/Notice';
import { StepShell } from '../components/Shell';
import { AGE_BANDS, PAGE_COUNTS, TOPIC_IDS } from '../constants';
import { useT } from '../i18n';
import { useBook } from '../store/book_store';
import type { StorySeed } from '../types';
import './SeedScreen.css';

/** In characters. */
const HERO_NAME_MAX_LENGTH = 20;
const HERO_LOOK_MAX_LENGTH = 200;
const HERO_LOOK_ROWS = 3;

type SeedProblem = 'need_topic' | 'need_name' | null;

/** Step 2 screen; continues to the plot screen once filled in. */
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
  // A saved topic that is not one of the five chip words means custom-topic mode.
  const is_custom = custom_open || (seed.topic !== '' && !topic_words.includes(seed.topic));

  const patch_seed = (patch: Partial<StorySeed>) => {
    set_problem(null);
    update_seed(patch);
  };

  /** Stores the translated chip word as the topic. */
  const pick_topic = (word: string) => {
    set_custom_open(false);
    patch_seed({ topic: word });
  };

  /** Opens the custom topic input and clears a topic picked from the chips. */
  const open_custom = () => {
    set_custom_open(true);
    if (topic_words.includes(seed.topic)) patch_seed({ topic: '' });
  };

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
