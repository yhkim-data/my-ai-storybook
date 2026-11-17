// Step 2 story seed screen: age band, topic, hero and page count (a button or any count). No AI calls.
import { useState } from 'react';
import { Notice } from '../components/Notice';
import { StepShell } from '../components/Shell';
import { AGE_BANDS, CUSTOM_PAGE_COUNT_START, MANY_PAGES_FROM, PAGE_COUNTS, PAGE_COUNT_MAX, PAGE_COUNT_MIN, TOPIC_IDS } from '../constants';
import { useT } from '../i18n';
import { clamp_page_count } from '../store/book_model';
import { useBook } from '../store/book_store';
import type { StorySeed } from '../types';
import './SeedScreen.css';

/** In characters. */
const HERO_NAME_MAX_LENGTH = 20;
const HERO_LOOK_MAX_LENGTH = 200;
const HERO_LOOK_ROWS = 3;

type SeedProblem = 'need_topic' | 'need_name' | null;

interface PageCountStepperProps {
  value: number;
  on_change: (value: number) => void;
}

/** "−  [n]  +" control for any page count from PAGE_COUNT_MIN to PAGE_COUNT_MAX. */
function PageCountStepper({ value, on_change }: PageCountStepperProps) {
  const t = useT();
  // Typing may pass through out-of-range values (e.g. "1" on the way to "12"), so keep the draft text here.
  const [draft, set_draft] = useState<string | null>(null);
  const commit = (text: string) => {
    set_draft(null);
    const number = Number.parseInt(text, 10);
    if (!Number.isNaN(number)) on_change(clamp_page_count(number));
  };
  return (
    <div className="seed-stepper" role="group" aria-label={t('seed.pages.count_aria')}>
      <button type="button" className="seg seed-step-btn" aria-label={t('seed.pages.decrease')} disabled={value <= PAGE_COUNT_MIN} onClick={() => on_change(clamp_page_count(value - 1))}>
        −
      </button>
      <input
        type="number"
        className="text-input seed-step-input"
        inputMode="numeric"
        min={PAGE_COUNT_MIN}
        max={PAGE_COUNT_MAX}
        aria-label={t('seed.pages.count_aria')}
        value={draft ?? String(value)}
        onChange={(event) => {
          const text = event.target.value;
          const number = Number.parseInt(text, 10);
          if (number >= PAGE_COUNT_MIN && number <= PAGE_COUNT_MAX) commit(text);
          else set_draft(text);
        }}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit(event.currentTarget.value);
        }}
      />
      <button type="button" className="seg seed-step-btn" aria-label={t('seed.pages.increase')} disabled={value >= PAGE_COUNT_MAX} onClick={() => on_change(clamp_page_count(value + 1))}>
        +
      </button>
    </div>
  );
}

/** Step 2 screen; continues to the plot screen once filled in. */
export function SeedScreen() {
  const t = useT();
  const book = useBook((state) => state.book);
  const go = useBook((state) => state.go);
  const update_seed = useBook((state) => state.update_seed);
  const [custom_open, set_custom_open] = useState(false);
  const [custom_count_open, set_custom_count_open] = useState(false);
  const [problem, set_problem] = useState<SeedProblem>(null);

  if (!book) return null;
  const seed = book.seed;

  const topic_words = TOPIC_IDS.map((id) => t(`seed.topic.${id}`));
  // A saved topic that is not one of the five chip words means custom-topic mode.
  const is_custom = custom_open || (seed.topic !== '' && !topic_words.includes(seed.topic));

  const is_custom_count = custom_count_open || !PAGE_COUNTS.includes(seed.page_count);

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
    <StepShell screen="seed" width="wide" on_prev={() => go('start')} on_next={handle_next}>
      <h1 className="title-lg">{t('seed.heading')}</h1>
      <div className="seed-layout">
        <div className="seed-col">
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
                  aria-pressed={!is_custom_count && seed.page_count === count}
                  onClick={() => {
                    set_custom_count_open(false);
                    patch_seed({ page_count: count });
                  }}
                >
                  {t('seed.pages.option', { n: count })}
                </button>
              ))}
              <button
                type="button"
                className="seg"
                aria-pressed={is_custom_count}
                onClick={() => {
                  if (is_custom_count) return;
                  set_custom_count_open(true);
                  patch_seed({ page_count: CUSTOM_PAGE_COUNT_START });
                }}
              >
                {t('seed.pages.custom')}
              </button>
            </div>
            {is_custom_count && <PageCountStepper value={seed.page_count} on_change={(page_count) => patch_seed({ page_count })} />}
            {seed.page_count >= MANY_PAGES_FROM && <p className="hint">{t('seed.pages.many')}</p>}
          </div>
        </div>
        <div className="seed-col">
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
        </div>
      </div>
    </StepShell>
  );
}
