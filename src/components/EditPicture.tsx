// "Fix the picture": a one-line request that changes only part of the picture in use, the "use the fixed picture"
// switch, and a before-and-after window for picking any version. Used on the pictures screen and the editor's picture tab.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { EDIT_NOTE_MAX_LENGTH } from '../constants';
import { useT } from '../i18n';
import { edit_availability, edit_page_image } from '../providers/make_image';
import type { ProviderError } from '../providers/types';
import { useBook } from '../store/book_store';
import {
  active_index,
  add_fixed_version,
  before_newest_index,
  is_versions_full,
  newest_fixed_index,
  use_version,
  versions_of,
} from '../store/image_versions';
import { needs_key, useSettings } from '../store/settings_store';
import type { BookPage, PageImage } from '../types';
import { AiErrorNotice, Busy, Notice, to_provider_error } from './Notice';
import './EditPicture.css';

interface EditPictureProps {
  page_index: number;
  /** Narrow column (the editor's settings): the button goes under the input. */
  compact?: boolean;
  /** Another picture job is running on this screen. */
  busy_elsewhere?: boolean;
  /** Called while a fix is being made, so the screen can lock its other picture buttons. */
  on_busy?: (busy: boolean) => void;
}

/** Changes one page's picture versions as one undo step. */
function change_versions(page_index: number, mutate: (page: BookPage) => BookPage): void {
  useBook.getState().edit_pages((pages) => pages.map((page, index) => (index === page_index ? mutate(page) : page)));
}

/** Name of a version: "Original" or "1. make the scarf blue". */
function version_name(t: ReturnType<typeof useT>, version: PageImage, index: number): string {
  if (index === 0) return t('edit.original');
  return t('edit.version', { n: index, note: version.edit_note ?? '' });
}

/** The "Fix the picture" box for one page. */
export function EditPicture({ page_index, compact = false, busy_elsewhere = false, on_busy }: EditPictureProps) {
  const t = useT();
  const input_id = useId();
  const page = useBook((state) => state.book?.pages[page_index]);
  // Re-check what the AI connection allows whenever the connection changes.
  useSettings((state) => `${state.practice}|${state.text_key}|${state.image_key}|${state.image_model}`);
  const [note, set_note] = useState('');
  const [is_busy, set_is_busy] = useState(false);
  const [error, set_error] = useState<ProviderError | null>(null);
  const [message, set_message] = useState<string | null>(null);
  const [is_compare_open, set_compare_open] = useState(false);
  const compare_button_ref = useRef<HTMLButtonElement>(null);
  const versions_ref = useRef<HTMLDivElement>(null);
  const is_mounted_ref = useRef(true);
  const version_count = page?.image_versions?.length ?? 0;

  useEffect(() => {
    is_mounted_ref.current = true;
    return () => {
      is_mounted_ref.current = false;
    };
  }, []);

  // A new fix brings the switch into view, also when the side column has to scroll on a short window.
  useEffect(() => {
    if (version_count > 1) versions_ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [version_count]);

  if (!page) return null;
  const availability = edit_availability(page);
  const is_key_needed = availability === 'no_ai' && needs_key(useSettings.getState());
  const newest = newest_fixed_index(page);
  const is_on = newest !== null && active_index(page) === newest;
  const can_send = availability === 'ok' && !is_busy && !busy_elsewhere;

  const set_busy = (busy: boolean) => {
    set_is_busy(busy);
    on_busy?.(busy);
  };

  const send = async () => {
    set_error(null);
    set_message(null);
    if (!note.trim()) {
      set_message(t('edit.empty_note'));
      return;
    }
    const book = useBook.getState().book;
    if (!book || !can_send) return;
    set_busy(true);
    try {
      const fixed = await edit_page_image(book, page_index, note);
      if (fixed) {
        change_versions(page_index, (target) => add_fixed_version(target, fixed));
        if (is_mounted_ref.current) set_note('');
      }
    } catch (cause) {
      if (is_mounted_ref.current) set_error(to_provider_error(cause));
    } finally {
      if (is_mounted_ref.current) set_busy(false);
    }
  };

  const handle_key = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  const toggle = () => {
    if (newest === null) return;
    change_versions(page_index, (target) => use_version(target, is_on ? before_newest_index(target) : newest));
  };

  const hint_key: Record<string, string> = {
    no_image: 'edit.need_image',
    no_ai: 'edit.need_ai',
    no_edit_model: 'edit.no_model',
    practice_upload: 'edit.practice_upload',
  };

  return (
    <div className={compact ? 'edit-pic compact' : 'edit-pic'}>
      <label className="edit-pic-label" htmlFor={input_id}>
        {t('edit.label')}
      </label>
      <div className="edit-pic-row">
        <input
          id={input_id}
          type="text"
          className="text-input edit-pic-input"
          maxLength={EDIT_NOTE_MAX_LENGTH}
          placeholder={t('edit.placeholder')}
          value={note}
          disabled={availability !== 'ok' || is_busy}
          onChange={(event) => set_note(event.target.value)}
          onKeyDown={handle_key}
        />
        <button type="button" className="btn small primary edit-pic-send" onClick={() => void send()} disabled={!can_send}>
          {t('edit.button')}
        </button>
      </div>
      {availability !== 'ok' && !is_key_needed && <p className="edit-pic-hint">{t(hint_key[availability] ?? 'edit.need_image')}</p>}
      {is_key_needed && (
        <p className="edit-pic-hint">
          {t('key_prompt.short')}{' '}
          <button type="button" className="back-link" onClick={() => useSettings.getState().open_key_prompt()}>
            {t('key_prompt.button')}
          </button>
        </p>
      )}
      {availability === 'ok' && is_versions_full(page) && (
        <Notice kind="warn" role="status">
          {t('edit.full')}
        </Notice>
      )}
      {is_busy && <Busy>{t('edit.busy')}</Busy>}
      {message && (
        <Notice kind="warn" role="alert">
          {message}
        </Notice>
      )}
      {error && <AiErrorNotice error={error} on_retry={() => void send()} />}
      {newest !== null && (
        <div ref={versions_ref} className="edit-pic-versions">
          <button type="button" role="switch" aria-checked={is_on} className="edit-switch" onClick={toggle} disabled={is_busy}>
            <span className="edit-switch-track" aria-hidden="true">
              <span className="edit-switch-thumb" />
            </span>
            <span>{t('edit.switch')}</span>
          </button>
          <button ref={compare_button_ref} type="button" className="btn small" onClick={() => set_compare_open(true)} disabled={is_busy}>
            {t('edit.compare')}
          </button>
        </div>
      )}
      {is_compare_open && newest !== null && (
        <CompareDialog
          page={page}
          on_pick={(index) => change_versions(page_index, (target) => use_version(target, index))}
          on_close={() => {
            set_compare_open(false);
            compare_button_ref.current?.focus();
          }}
        />
      )}
    </div>
  );
}

interface CompareDialogProps {
  page: BookPage;
  on_pick: (index: number) => void;
  on_close: () => void;
}

/** Before and after side by side (stacked on narrow screens), with a row of every version to pick from. */
function CompareDialog({ page, on_pick, on_close }: CompareDialogProps) {
  const t = useT();
  const title_id = useId();
  const versions = versions_of(page);
  const in_use = active_index(page);
  const after_index = newest_fixed_index(page) ?? 0;
  const before_index = before_newest_index(page);
  const close_ref = useRef<HTMLButtonElement>(null);
  const thumbs_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    close_ref.current?.focus();
    const handle_key = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        on_close();
      }
    };
    document.addEventListener('keydown', handle_key);
    return () => document.removeEventListener('keydown', handle_key);
  }, [on_close]);

  /** Arrow keys move the choice along the version row, like radio buttons. */
  const handle_thumb_key = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = versions.length - 1;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(index + 1, last);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = last;
    if (next === null) return;
    event.preventDefault();
    on_pick(next);
    thumbs_ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  const side = (index: number, heading: string) => {
    const version = versions[index];
    if (!version) return null;
    return (
      <figure className="compare-side">
        <figcaption>
          <strong>{heading}</strong> <span>{version_name(t, version, index)}</span>
        </figcaption>
        <img src={version.data_url} alt={version_name(t, version, index)} />
        <button type="button" className={in_use === index ? 'btn small primary' : 'btn small'} aria-pressed={in_use === index} onClick={() => on_pick(index)}>
          {in_use === index ? t('edit.in_use') : t('edit.use_this')}
        </button>
      </figure>
    );
  };

  return createPortal(
    <div className="dialog-back">
      <div className="dialog compare-dialog" role="dialog" aria-modal="true" aria-labelledby={title_id}>
        <div className="compare-head">
          <h2 id={title_id} className="compare-title">
            {t('edit.compare_title')}
          </h2>
          <button ref={close_ref} type="button" className="btn small" onClick={on_close}>
            {t('common.close')}
          </button>
        </div>
        <div className="compare-pair">
          {side(before_index, t('edit.before'))}
          {side(after_index, t('edit.after'))}
        </div>
        <div ref={thumbs_ref} className="compare-thumbs" role="radiogroup" aria-label={t('edit.versions_label')}>
          {versions.map((version, index) => (
            <button
              key={`${version.created_at ?? 0}-${index}`}
              type="button"
              role="radio"
              aria-checked={in_use === index}
              tabIndex={in_use === index ? 0 : -1}
              className="compare-thumb"
              onClick={() => on_pick(index)}
              onKeyDown={(event) => handle_thumb_key(event, index)}
            >
              <img src={version.data_url} alt="" />
              <span>{version_name(t, version, index)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
