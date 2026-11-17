// "AI usage" chip on the right of every header, and its panel: the connections in use, what this app has used
// (this window and today on this computer), today's picture limit, a rough cost where the official price is known,
// links to each provider's own usage page, switching connections, and "clear keys and finish".
// The providers have no way for a normal key to report the money or limit left, so only this app's own use is counted.
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '../i18n';
import { picture_cost_usd, KRW_PER_USD } from '../providers/prices';
import provider_pages from '../providers/provider_pages.json';
import { PROVIDER_INFO, PROVIDER_ORDER } from '../providers/provider_kinds';
import { useBook } from '../store/book_store';
import {
  ai_status,
  connection_name,
  image_limit_near,
  image_limit_reached,
  key_tail,
  useSettings,
  type Connection,
} from '../store/settings_store';
import { EndSessionDialog } from './KeySafety';
import { usePopover } from './use_popover';

const PRACTICE_VALUE = 'practice';
/** Picture kind follows the words connection. */
const SAME_AS_TEXT_VALUE = 'same';
const LIMIT_MAX = 999;
const ICON_SIZE = 18;

function MeterIcon() {
  return (
    <svg aria-hidden="true" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 13a6 6 0 1112 0" />
      <path d="M9 13l3-4" />
    </svg>
  );
}

/** "Gemini · gemini-3.5-flash-lite · …a1b2", or the "needs a key" note. */
function ConnectionLine({ connection, model, label }: { connection: Connection | undefined; model: string; label: string }) {
  const t = useT();
  if (!connection) return null;
  const name = connection.label || PROVIDER_INFO[connection.kind].label;
  return (
    <div className="usage-row">
      <span className="usage-row-label">{label}</span>
      <span>
        {name} · {model} · {connection.key ? `…${key_tail(connection.key)}` : t('usage.needs_key')}
      </span>
    </div>
  );
}

/** The chip and its pop-up panel. */
export function UsageChip() {
  const t = useT();
  const button_ref = useRef<HTMLButtonElement>(null);
  const popover = usePopover<HTMLSpanElement>(button_ref, 'end');
  const limit_id = useId();
  const state = useSettings();
  const open_side = useBook((book) => book.open_side);
  const status = ai_status(state);
  const is_near = image_limit_near(state);
  const is_reached = image_limit_reached(state);
  const pictures = state.usage_today.image;
  /** The "clear keys and finish" window lives outside the panel, which closes when it opens. */
  const [is_end_open, set_end_open] = useState(false);

  const chip_text =
    status === 'practice'
      ? t('usage.chip_practice')
      : status === 'off'
        ? t('usage.chip_off')
        : state.image_limit !== null
          ? t('usage.chip_limit', { n: pictures, max: state.image_limit })
          : t('usage.chip', { n: pictures });

  const text_connection = state.connections.find((item) => item.id === state.text_connection);
  const image_connection = state.connections.find((item) => item.id === state.image_connection) ?? text_connection;
  const image_kind = image_connection?.kind;
  const cost_usd = status === 'on' && image_kind === 'gemini' ? picture_cost_usd(state.image_model, pictures) : null;
  const can_draw = (item: Connection) => PROVIDER_INFO[item.kind].image_model !== null;

  // Focus moves into the panel when it opens, since it is placed at the end of the page.
  const { is_open, list_ref } = popover;
  useEffect(() => {
    if (is_open) list_ref.current?.querySelector<HTMLElement>('select, input, button')?.focus();
  }, [is_open, list_ref]);

  /** Picks a connection; one still waiting for its key opens the key window right away. */
  const choose = (role: 'text' | 'image', value: string) => {
    state.choose_connection(role, value === SAME_AS_TEXT_VALUE ? null : value);
    const chosen = state.connections.find((item) => item.id === value);
    if (chosen && !chosen.key) state.open_key_prompt();
  };

  const text_value = state.practice ? PRACTICE_VALUE : (state.text_connection ?? '');
  const image_value = state.practice ? PRACTICE_VALUE : (state.image_connection ?? SAME_AS_TEXT_VALUE);

  return (
    <span className="usage-chip-wrap" ref={popover.wrap_ref}>
      <button
        ref={button_ref}
        type="button"
        className={is_reached ? 'usage-chip full' : is_near ? 'usage-chip near' : 'usage-chip'}
        aria-expanded={popover.is_open}
        aria-haspopup="dialog"
        aria-label={t('usage.chip_aria', { text: chip_text })}
        onClick={popover.toggle}
      >
        <MeterIcon />
        <span className="usage-chip-text">{chip_text}</span>
      </button>
      {popover.is_open &&
        createPortal(
          <div ref={popover.list_ref} className="usage-panel popover-layer" role="dialog" aria-label={t('usage.title')}>
            <h2 className="usage-title">{t('usage.title')}</h2>

            <section className="usage-section">
              <h3>{t('usage.now')}</h3>
              {status === 'practice' && <p className="usage-note">{t('usage.practice')}</p>}
              {status !== 'practice' && !text_connection && <p className="usage-note">{t('usage.none')}</p>}
              {status !== 'practice' && (
                <>
                  <ConnectionLine connection={text_connection} model={state.text_model} label={t('usage.text_role')} />
                  {image_connection && can_draw(image_connection) && (
                    <ConnectionLine connection={image_connection} model={state.image_model} label={t('usage.image_role')} />
                  )}
                </>
              )}
            </section>

            <section className="usage-section">
              <h3>{t('usage.used')}</h3>
              <div className="usage-row">
                <span className="usage-row-label">{t('usage.session')}</span>
                <span>{t('usage.counts', { text: state.usage_session.text, image: state.usage_session.image })}</span>
              </div>
              <div className="usage-row">
                <span className="usage-row-label">{t('usage.today')}</span>
                <span>{t('usage.counts', { text: state.usage_today.text, image: state.usage_today.image })}</span>
              </div>
              {cost_usd !== null && (
                <p className="usage-note" data-testid="usage-cost">
                  {state.lang === 'ko'
                    ? t('usage.cost', { amount: Math.round(cost_usd * KRW_PER_USD).toLocaleString('ko-KR'), kind: state.image_model })
                    : t('usage.cost', { amount: cost_usd.toFixed(2), kind: state.image_model })}
                </p>
              )}
              <p className="usage-note">{t('usage.app_only')}</p>
            </section>

            <section className="usage-section">
              <label htmlFor={limit_id} className="usage-row-label">
                {t('usage.limit_label')}
              </label>
              <input
                id={limit_id}
                type="number"
                inputMode="numeric"
                min={1}
                max={LIMIT_MAX}
                className="text-input usage-limit"
                placeholder={t('usage.limit_none')}
                value={state.image_limit ?? ''}
                onChange={(event) => state.set_image_limit(event.target.value === '' ? null : Number(event.target.value))}
              />
              {is_reached ? (
                <p className="usage-note warn" role="alert">
                  {t('error.limit')}
                </p>
              ) : (
                is_near && (
                  <p className="usage-note warn" role="status">
                    {t('usage.limit_near', { n: pictures, max: state.image_limit ?? 0 })}
                  </p>
                )
              )}
            </section>

            <section className="usage-section">
              <h3>{t('usage.left')}</h3>
              <p className="usage-note">{t('usage.left_note')}</p>
              <div className="usage-links">
                {PROVIDER_ORDER.map((kind) => (
                  <a key={kind} className="btn small outline" href={provider_pages.usage[kind]} target="_blank" rel="noopener noreferrer">
                    {PROVIDER_INFO[kind].label}
                  </a>
                ))}
              </div>
            </section>

            <section className="usage-section">
              <h3>{t('usage.switch')}</h3>
              <label className="usage-row-label" htmlFor={`${limit_id}-text`}>
                {t('usage.text_role')}
              </label>
              <select id={`${limit_id}-text`} className="select" value={text_value} onChange={(event) => choose('text', event.target.value)}>
                {text_value === '' && <option value="">{t('usage.choose')}</option>}
                {state.connections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.key ? connection_name(item) : `${connection_name(item)} (${t('usage.needs_key')})`}
                  </option>
                ))}
                <option value={PRACTICE_VALUE}>{t('usage.chip_practice')}</option>
              </select>
              <label className="usage-row-label" htmlFor={`${limit_id}-image`}>
                {t('usage.image_role')}
              </label>
              <select
                id={`${limit_id}-image`}
                className="select"
                value={image_value}
                disabled={state.practice}
                onChange={(event) => choose('image', event.target.value)}
              >
                <option value={SAME_AS_TEXT_VALUE}>{t('usage.same_as_text')}</option>
                {state.connections.filter(can_draw).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.key ? connection_name(item) : `${connection_name(item)} (${t('usage.needs_key')})`}
                  </option>
                ))}
                {state.practice && <option value={PRACTICE_VALUE}>{t('usage.chip_practice')}</option>}
              </select>
              <div className="usage-links">
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    popover.close();
                    open_side('connect');
                  }}
                >
                  {t('usage.new_key')}
                </button>
                <button
                  type="button"
                  className="btn small danger"
                  onClick={() => {
                    popover.close();
                    set_end_open(true);
                  }}
                >
                  {t('end.button')}
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
      {is_end_open && <EndSessionDialog on_close={() => set_end_open(false)} />}
    </span>
  );
}
