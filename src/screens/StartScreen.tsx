// Step 1 start screen: new book, resume, demo, open file, AI connection and rights notice.
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { DeleteBookDialog, EndSessionButton } from '../components/KeySafety';
import { Brand, DiLabBadge, MadeByLine, Shell } from '../components/Shell';
import { Notice } from '../components/Notice';
import { load_scene_art } from '../art/scenes';
import { build_demo_book } from '../data/demo_book';
import { useT } from '../i18n';
import { WORK_FILE_MAX_BYTES, parse_book_file } from '../storage/book_file';
import { delete_current_book, load_current_book } from '../storage/db';
import { useBook } from '../store/book_store';
import { ai_status, useSettings } from '../store/settings_store';
import './StartScreen.css';

/** Choice card icon side in px. */
const CHOICE_ICON_SIZE = 44;
const DIALOG_TITLE_ID = 'start-replace-title';

function PlusIcon() {
  return (
    <svg className="start-choice-icon" aria-hidden="true" width={CHOICE_ICON_SIZE} height={CHOICE_ICON_SIZE} viewBox="0 0 44 44" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round">
      <path d="M22 8v28M8 22h28" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="start-choice-icon" aria-hidden="true" width={CHOICE_ICON_SIZE} height={CHOICE_ICON_SIZE} viewBox="0 0 44 44" fill="none" stroke="#2459C4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 34l4-12 16-16 8 8-16 16z" />
      <path d="M26 10l8 8" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="start-choice-icon" aria-hidden="true" width={CHOICE_ICON_SIZE} height={CHOICE_ICON_SIZE} viewBox="0 0 44 44" fill="none" stroke="#2459C4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="22" cy="22" r="15" />
      <path d="M18 15l11 7-11 7z" />
    </svg>
  );
}

interface ReplaceDialogProps {
  on_keep: () => void;
  on_confirm: () => void;
  on_close: () => void;
}

/** Asks before replacing a book in progress with a new one. Esc closes it. */
function ReplaceDialog({ on_keep, on_confirm, on_close }: ReplaceDialogProps) {
  const t = useT();
  const keep_ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keep_ref.current?.focus();
    const handle_key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') on_close();
    };
    document.addEventListener('keydown', handle_key);
    return () => document.removeEventListener('keydown', handle_key);
  }, [on_close]);

  return (
    <div className="dialog-back">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby={DIALOG_TITLE_ID}>
        <h2 id={DIALOG_TITLE_ID} className="start-dialog-title">
          {t('start.replace.title')}
        </h2>
        <p className="hint">{t('start.replace.body')}</p>
        <div className="start-dialog-actions">
          <button ref={keep_ref} type="button" className="btn primary" onClick={on_keep}>
            {t('start.replace.keep')}
          </button>
          <button type="button" className="btn danger" onClick={on_confirm}>
            {t('start.replace.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Step 1 start screen. */
export function StartScreen() {
  const t = useT();
  const lang = useSettings((state) => state.lang);
  const set_lang = useSettings((state) => state.set_lang);
  const status = useSettings((state) => ai_status(state));
  const has_saved_book = useBook((state) => state.has_saved_book);
  const start_new_book = useBook((state) => state.start_new_book);
  const open_book = useBook((state) => state.open_book);
  const open_side = useBook((state) => state.open_side);
  const [is_dialog_open, set_is_dialog_open] = useState(false);
  const [has_load_error, set_has_load_error] = useState(false);
  const removed_saved_key = useSettings((state) => state.removed_saved_key);
  const dismiss_removed_key = useSettings((state) => state.dismiss_removed_key);
  const [is_delete_open, set_delete_open] = useState(false);
  const [is_deleted, set_deleted] = useState(false);
  const file_ref = useRef<HTMLInputElement>(null);

  const handle_toggle_lang = () => set_lang(lang === 'ko' ? 'en' : 'ko');

  // The sample art loads in the background; wait for it so the demo opens with its pictures.
  const open_demo = async () => {
    await load_scene_art().catch(() => undefined);
    open_book(build_demo_book(lang), true);
  };

  const handle_resume = async () => {
    try {
      const book = await load_current_book();
      if (book) open_book(book);
      else set_has_load_error(true);
    } catch {
      set_has_load_error(true);
    }
  };

  const handle_new = () => {
    if (has_saved_book) set_is_dialog_open(true);
    else start_new_book(lang);
  };

  const handle_confirm_replace = async () => {
    try {
      await delete_current_book();
    } catch {
      // A new book can still start even if the old one could not be deleted.
    }
    set_is_dialog_open(false);
    start_new_book(lang);
  };

  const handle_keep = () => {
    set_is_dialog_open(false);
    void handle_resume();
  };

  const handle_file = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (file.size > WORK_FILE_MAX_BYTES) throw new Error('file too big');
      const book = parse_book_file(await file.text());
      set_has_load_error(false);
      open_book(book);
    } catch {
      set_has_load_error(true);
    } finally {
      // Reset so picking the same file again still fires change.
      input.value = '';
    }
  };

  return (
    <Shell
      width="wide"
      header={
        <>
          <Brand with_icon />
          <div className="header-right">
            <button type="button" className="btn small" onClick={handle_toggle_lang} aria-label={t('common.lang_toggle_aria')}>
              {t('common.lang_toggle')}
            </button>
            <DiLabBadge />
          </div>
        </>
      }
      footer={
        <>
          <span className="start-footer-line">
            <span>{t('start.rights_line')}</span>
            <button type="button" className="back-link" onClick={() => open_side('rights')}>
              {t('start.rights_link')}
            </button>
          </span>
          <MadeByLine />
        </>
      }
    >
      {removed_saved_key && (
        <Notice
          kind="ok"
          action={
            <button type="button" className="btn small" onClick={dismiss_removed_key}>
              {t('common.close')}
            </button>
          }
        >
          {t('start.removed_key')}
        </Notice>
      )}
      <div className="stack">
        <h1 className="title-xl">{t('start.title')}</h1>
        <p className="lead">{t('start.subtitle')}</p>
      </div>
      <div className="grid-3">
        <button type="button" className="choice primary" onClick={handle_new}>
          <PlusIcon />
          <span className="start-choice-text">
            <span className="choice-title">{t('start.new.title')}</span>
            <span className="choice-desc">{t('start.new.desc')}</span>
          </span>
        </button>
        <button type="button" className="choice" disabled={!has_saved_book} onClick={() => void handle_resume()}>
          <PencilIcon />
          <span className="start-choice-text">
            <span className="choice-title">{t('start.resume.title')}</span>
            <span className="choice-desc">{has_saved_book ? t('start.resume.desc') : t('start.resume.none')}</span>
          </span>
        </button>
        <button type="button" className="choice" onClick={() => void open_demo()}>
          <PlayIcon />
          <span className="start-choice-text">
            <span className="choice-title">{t('start.demo.title')}</span>
            <span className="choice-desc">{t('start.demo.desc')}</span>
          </span>
        </button>
      </div>
      <div className="row start-row">
        <button type="button" className="btn" onClick={() => file_ref.current?.click()}>
          {t('start.load_file')}
        </button>
        <input ref={file_ref} className="start-file-input" type="file" accept=".json,application/json" onChange={(event) => void handle_file(event)} data-testid="file-input" tabIndex={-1} aria-hidden="true" />
        <button type="button" className="btn start-connect-btn" onClick={() => open_side('connect')}>
          {t('start.connect')}
          <span className={status === 'off' ? 'pill warn' : 'pill ok'}>{t(`start.connect.${status}`)}</span>
        </button>
        <span className="hint">{t('start.no_ai_hint')}</span>
      </div>
      <div className="row start-row start-safety">
        <EndSessionButton class_name="btn small" />
        {has_saved_book && (
          <button type="button" className="btn small" onClick={() => set_delete_open(true)}>
            {t('start.delete_book')}
          </button>
        )}
      </div>
      {is_deleted && <Notice kind="ok">{t('delete_book.done')}</Notice>}
      {is_delete_open && <DeleteBookDialog on_close={() => set_delete_open(false)} on_done={() => set_deleted(true)} />}
      {has_load_error && (
        <Notice kind="warn" role="alert">
          {t('start.load_error')}
        </Notice>
      )}
      {is_dialog_open && <ReplaceDialog on_keep={handle_keep} on_confirm={() => void handle_confirm_replace()} on_close={() => set_is_dialog_open(false)} />}
    </Shell>
  );
}
