// "Ask AI for help" for one kind of box: the small button, the "writing…" status, the undo link, and errors.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { get_text_provider, type AssistRequest, type AssistResult } from '../providers';
import type { ProviderError } from '../providers/types';
import { useSettings } from '../store/settings_store';
import { AiErrorNotice, to_provider_error } from './Notice';

const ICON_SIZE = 16;

/** The text of a one-box answer (a plot answer gives its summary). */
export function assist_text(result: AssistResult): string {
  return 'text' in result ? result.text : result.summary;
}

/** State for one kind of box. `key` tells boxes apart when one screen shows several pages in turn. */
export interface AssistState<T> {
  /** Key of the box the AI is writing into, or null. */
  busy_key: string | null;
  /** Key of the box whose AI text can be undone, or null. */
  undo_key: string | null;
  error: ProviderError | null;
  /** Asks the AI; `before` is kept for undo and `apply` puts the answer into the box. */
  run: (key: string, request: AssistRequest, before: T, apply: (result: AssistResult) => void) => Promise<void>;
  /** Puts back what the box held before the AI wrote. */
  undo: (restore: (before: T) => void) => void;
  /** Called when the user edits the box: the undo link goes away. */
  forget: (key: string) => void;
  retry: () => void;
}

/** Keeps the busy, undo and error state for "Ask AI for help". */
export function useAssist<T>(): AssistState<T> {
  const [busy_key, set_busy_key] = useState<string | null>(null);
  const [undo_key, set_undo_key] = useState<string | null>(null);
  const [error, set_error] = useState<ProviderError | null>(null);
  const before_ref = useRef<T | null>(null);
  const last_ref = useRef<(() => void) | null>(null);
  const is_mounted_ref = useRef(false);

  useEffect(() => {
    is_mounted_ref.current = true;
    return () => {
      is_mounted_ref.current = false;
    };
  }, []);

  const run = useCallback(async (key: string, request: AssistRequest, before: T, apply: (result: AssistResult) => void) => {
    const provider = get_text_provider();
    if (!provider) return;
    last_ref.current = () => void run(key, request, before, apply);
    set_busy_key(key);
    set_undo_key(null);
    set_error(null);
    try {
      const result = await provider.assist(request);
      apply(result);
      before_ref.current = before;
      if (is_mounted_ref.current) set_undo_key(key);
    } catch (cause) {
      if (is_mounted_ref.current) set_error(to_provider_error(cause));
    } finally {
      if (is_mounted_ref.current) set_busy_key(null);
    }
  }, []);

  const undo = useCallback((restore: (before: T) => void) => {
    if (before_ref.current !== null) restore(before_ref.current);
    before_ref.current = null;
    set_undo_key(null);
  }, []);

  const forget = useCallback((key: string) => set_undo_key((now) => (now === key ? null : now)), []);
  const retry = useCallback(() => last_ref.current?.(), []);

  return { busy_key, undo_key, error, run, undo, forget, retry };
}

function SparkleIcon() {
  return (
    <svg aria-hidden="true" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1l1.6 4.4L14 7l-4.4 1.6L8 13l-1.6-4.4L2 7l4.4-1.6z" />
      <path d="M13 11l.6 1.4L15 13l-1.4.6L13 15l-.6-1.4L11 13l1.4-.6z" />
    </svg>
  );
}

interface AssistControlProps<T> {
  state: AssistState<T>;
  /** Key of the box this control belongs to. */
  field_key: string;
  on_ask: () => void;
  on_undo: () => void;
}

/** The small "Ask AI for help" button with its status: writing…, undo, or "connect AI to use this". */
export function AssistControl<T>({ state, field_key, on_ask, on_undo }: AssistControlProps<T>) {
  const t = useT();
  const has_ai = useSettings((settings) => settings.practice || settings.text_key !== '');
  const is_busy = state.busy_key === field_key;
  return (
    <span className="assist">
      <button type="button" className="assist-btn" onClick={on_ask} disabled={!has_ai || state.busy_key !== null}>
        <SparkleIcon />
        {t('assist.button')}
      </button>
      {!has_ai && <span className="assist-note">{t('assist.need_ai')}</span>}
      {is_busy && (
        <span className="assist-note" role="status">
          {t('assist.busy')}
        </span>
      )}
      {!is_busy && state.undo_key === field_key && (
        <button type="button" className="assist-undo" onClick={on_undo}>
          {t('assist.undo')}
        </button>
      )}
    </span>
  );
}

/** Error banner for "Ask AI for help", with the usual retry and wait countdown. */
export function AssistError<T>({ state }: { state: AssistState<T> }) {
  if (!state.error) return null;
  return <AiErrorNotice error={state.error} on_retry={state.retry} />;
}
