// Key safety pieces shared by several screens: the "this is my key" check, checking and connecting a key,
// the small "enter your key again" window, the away timer, and "clear keys and finish" / "delete the book" windows.
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IDLE_WARNING_SECONDS } from '../constants';
import { useT } from '../i18n';
import { create_text_provider_for_key } from '../providers/index';
import { PROVIDER_INFO, detect_provider } from '../providers/provider_kinds';
import type { ProviderErrorKind } from '../providers/types';
import { delete_current_book } from '../storage/db';
import { useBook } from '../store/book_store';
import { idle_ms, mark_activity } from '../store/idle';
import { go_home } from '../store/navigation';
import { key_tail, needs_key, useSettings } from '../store/settings_store';
import { Notice } from './Notice';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
/** How often the away timer looks at the clock (ms). */
const IDLE_TICK_MS = 1000;
/** Events that count as using the app. */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

export interface KeyMessage {
  kind: 'ok' | 'warn';
  text: string;
}

function failure_key(reason: ProviderErrorKind): string {
  if (reason === 'browser_blocked') return 'connect.browser_blocked';
  if (reason === 'bad_key' || reason === 'no_permission') return 'connect.bad_key';
  if (reason === 'network') return 'connect.network';
  return 'connect.failed';
}

/** Checks a key with one small request and, if it works, connects it for text or pictures. Only the last characters are ever shown. */
export function useKeyCheck() {
  const t = useT();
  const connect_key = useSettings((state) => state.connect_key);
  const [is_checking, set_checking] = useState(false);

  const check = async (raw_key: string, role: 'text' | 'image', is_owned: boolean): Promise<KeyMessage> => {
    const key = raw_key.trim();
    if (!is_owned) return { kind: 'warn', text: t('connect.own_key_need') };
    if (!key) return { kind: 'warn', text: t('connect.empty') };
    const info = PROVIDER_INFO[detect_provider(key)];
    if (role === 'image' && info.image_model === null) return { kind: 'warn', text: t('connect.image_key_claude') };
    set_checking(true);
    try {
      const result = await create_text_provider_for_key(key).testConnection();
      if (!result.ok) return { kind: 'warn', text: t(failure_key(result.reason)) };
      connect_key(key, role);
      return { kind: 'ok', text: t('connect.ok', { name: info.label, tail: key_tail(key) }) };
    } catch {
      return { kind: 'warn', text: t('connect.failed') };
    } finally {
      set_checking(false);
    }
  };

  return { check, is_checking };
}

/** The required "this is my key, or my teacher's key for this class" check box, with a link to the terms. */
export function OwnKeyCheck({ checked, on_change, on_terms }: { checked: boolean; on_change: (checked: boolean) => void; on_terms?: () => void }) {
  const t = useT();
  return (
    <div className="own-key">
      <label className="own-key-label">
        <input type="checkbox" checked={checked} onChange={(event) => on_change(event.target.checked)} required />
        <span>{t('connect.own_key')}</span>
      </label>
      {on_terms ? (
        <button type="button" className="back-link own-key-terms" onClick={on_terms}>
          {t('connect.terms_link')}
        </button>
      ) : (
        <a className="back-link own-key-terms" href={terms_doc_url(useSettings.getState().lang)} target="_blank" rel="noopener noreferrer">
          {t('connect.terms_link')}
        </a>
      )}
    </div>
  );
}

/** Terms document on GitHub, in the screen language. */
export function terms_doc_url(lang: 'ko' | 'en'): string {
  return `https://github.com/yhkim-data/my-ai-storybook/blob/main/docs/terms.${lang}.md`;
}

interface DialogProps {
  title: string;
  children: ReactNode;
  on_close: () => void;
  /** Buttons at the bottom. */
  actions: ReactNode;
}

/** Small modal window: Escape closes it and the first control gets the focus. */
function Dialog({ title, children, on_close, actions }: DialogProps) {
  const title_id = useId();
  const box_ref = useRef<HTMLDivElement>(null);
  const close_ref = useRef(on_close);
  useEffect(() => {
    close_ref.current = on_close;
  });
  // Focus once on open; Escape always calls the latest on_close.
  useEffect(() => {
    box_ref.current?.querySelector<HTMLElement>('input, button')?.focus();
    const handle_key = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close_ref.current();
    };
    document.addEventListener('keydown', handle_key);
    return () => document.removeEventListener('keydown', handle_key);
  }, []);
  return createPortal(
    <div className="dialog-back">
      <div ref={box_ref} className="dialog key-dialog" role="dialog" aria-modal="true" aria-labelledby={title_id}>
        <h2 id={title_id} className="key-dialog-title">
          {title}
        </h2>
        {children}
        <div className="key-dialog-actions">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}

/** After a reload or the away timer, asks for the key again when an AI button is pressed. The book stays as it is. */
export function KeyPromptDialog() {
  const t = useT();
  const is_open = useSettings((state) => state.key_prompt_open);
  const close = useSettings((state) => state.close_key_prompt);
  const text_connection = useSettings((state) => state.connections.find((item) => item.id === state.text_connection));
  const { check, is_checking } = useKeyCheck();
  const [key_input, set_key_input] = useState('');
  const [is_owned, set_owned] = useState(false);
  const [message, set_message] = useState<KeyMessage | null>(null);
  const input_id = useId();

  if (!is_open) return null;
  const role = text_connection && text_connection.key ? 'image' : 'text';

  const submit = async () => {
    const result = await check(key_input, role, is_owned);
    set_message(result);
    if (result.kind === 'ok') set_key_input('');
  };
  const handle_enter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !is_checking) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <Dialog
      title={t('key_prompt.title')}
      on_close={close}
      actions={
        <>
          <button type="button" className="btn" onClick={close}>
            {t('common.close')}
          </button>
          <button type="button" className="btn primary" onClick={() => void submit()} disabled={is_checking}>
            {is_checking ? t('connect.checking') : t('connect.check')}
          </button>
        </>
      }
    >
      <p className="hint">{t('key_prompt.body')}</p>
      <label htmlFor={input_id} className="field-label small">
        {t('connect.key_label')}
      </label>
      <input
        id={input_id}
        type="password"
        autoComplete="off"
        className="text-input"
        placeholder={t('connect.key_placeholder')}
        value={key_input}
        onChange={(event) => set_key_input(event.target.value)}
        onKeyDown={handle_enter}
      />
      <OwnKeyCheck checked={is_owned} on_change={set_owned} />
      {message && (
        <Notice kind={message.kind} role={message.kind === 'warn' ? 'alert' : 'status'}>
          {message.text}
        </Notice>
      )}
    </Dialog>
  );
}

/** "Enter your key again" notice for screens that would use the AI, shown only when a remembered connection lost its key. */
export function KeyNeededNotice() {
  const t = useT();
  const is_needed = useSettings((state) => needs_key(state));
  const open = useSettings((state) => state.open_key_prompt);
  if (!is_needed) return null;
  return (
    <Notice
      kind="warn"
      action={
        <button type="button" className="btn small" onClick={open}>
          {t('key_prompt.button')}
        </button>
      }
    >
      {t('key_prompt.notice')}
    </Notice>
  );
}

/** Opens the key window when a remembered connection lost its key; returns false when there is nothing to ask for. */
export function ask_key_again(): boolean {
  const state = useSettings.getState();
  if (!needs_key(state)) return false;
  state.open_key_prompt();
  return true;
}

/** Forgets the keys after the set minutes without use; warns a minute before with a "keep using" button. */
export function IdleGuard() {
  const t = useT();
  const has_key = useSettings((state) => state.connections.some((item) => item.key !== ''));
  const minutes = useSettings((state) => state.idle_minutes);
  const [is_warning, set_warning] = useState(false);
  const [was_cleared, set_cleared] = useState(false);

  useEffect(() => {
    if (!has_key) {
      set_warning(false);
      return undefined;
    }
    mark_activity();
    set_cleared(false);
    const limit_ms = minutes * SECONDS_PER_MINUTE * MS_PER_SECOND;
    const tick = () => {
      const idle = idle_ms();
      if (idle >= limit_ms) {
        useSettings.getState().clear_keys();
        set_warning(false);
        set_cleared(true);
      } else {
        set_warning(idle >= limit_ms - IDLE_WARNING_SECONDS * MS_PER_SECOND);
      }
    };
    const on_activity = () => {
      mark_activity();
      set_warning(false);
    };
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, on_activity, { capture: true, passive: true });
    const timer = setInterval(tick, IDLE_TICK_MS);
    return () => {
      clearInterval(timer);
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, on_activity, { capture: true });
    };
  }, [has_key, minutes]);

  if (is_warning) {
    return createPortal(
      <div className="idle-toast" role="alert">
        <span>{t('idle.warning')}</span>
        <button type="button" className="btn small primary" onClick={() => mark_activity()}>
          {t('idle.keep')}
        </button>
      </div>,
      document.body,
    );
  }
  if (was_cleared) {
    return createPortal(
      <div className="idle-toast" role="status">
        <span>{t('idle.cleared')}</span>
        <button type="button" className="btn small" onClick={() => set_cleared(false)}>
          {t('common.close')}
        </button>
      </div>,
      document.body,
    );
  }
  return null;
}

/** Forgets every key and goes to the start screen; optionally also deletes the book kept on this computer. */
export async function end_session(delete_book: boolean): Promise<void> {
  useSettings.getState().clear_keys();
  useSettings.getState().close_key_prompt();
  await go_home();
  if (delete_book) await delete_saved_book();
}

/** Deletes the book in progress kept in this browser. */
export async function delete_saved_book(): Promise<void> {
  try {
    await delete_current_book();
  } catch {
    // Nothing more can be done here; the start screen still shows the book as gone.
  }
  useBook.getState().set_has_saved_book(false);
}

/** Confirms "clear keys and finish", with the choice to delete the book on this computer too (off by default). */
export function EndSessionDialog({ on_close }: { on_close: () => void }) {
  const t = useT();
  const [delete_book, set_delete_book] = useState(false);
  return (
    <Dialog
      title={t('end.title')}
      on_close={on_close}
      actions={
        <>
          <button type="button" className="btn" onClick={on_close}>
            {t('end.cancel')}
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              on_close();
              void end_session(delete_book);
            }}
          >
            {t('end.confirm')}
          </button>
        </>
      }
    >
      <p className="hint">{t('end.body')}</p>
      <label className="own-key-label">
        <input type="checkbox" checked={delete_book} onChange={(event) => set_delete_book(event.target.checked)} />
        <span>{t('end.delete_book')}</span>
      </label>
      <p className="hint">{t('end.save_hint')}</p>
    </Dialog>
  );
}

/** Confirms deleting the book in progress on this computer. */
export function DeleteBookDialog({ on_close, on_done }: { on_close: () => void; on_done: () => void }) {
  const t = useT();
  return (
    <Dialog
      title={t('delete_book.title')}
      on_close={on_close}
      actions={
        <>
          <button type="button" className="btn" onClick={on_close}>
            {t('end.cancel')}
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              on_close();
              void delete_saved_book().then(on_done);
            }}
          >
            {t('delete_book.confirm')}
          </button>
        </>
      }
    >
      <p className="hint">{t('delete_book.body')}</p>
    </Dialog>
  );
}

/** The "clear keys and finish" button that opens its confirm window. */
export function EndSessionButton({ class_name = 'btn danger' }: { class_name?: string }) {
  const t = useT();
  const [is_open, set_open] = useState(false);
  return (
    <>
      <button type="button" className={class_name} onClick={() => set_open(true)}>
        {t('end.button')}
      </button>
      {is_open && <EndSessionDialog on_close={() => set_open(false)} />}
    </>
  );
}
