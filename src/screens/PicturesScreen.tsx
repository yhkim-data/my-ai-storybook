// 6단계 그림 화면: 쪽마다 AI로 만들기, 내 그림 올리기, 그림 설명 복사 중 하나로 그림을 넣는다.
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AiErrorNotice, Busy, Notice, to_provider_error } from '../components/Notice';
import { StepShell } from '../components/Shell';
import { BATCH_IMAGE_GAP_MS } from '../constants';
import { page_name, useT } from '../i18n';
import { get_image_provider } from '../providers';
import { full_image_prompt, generate_page_image } from '../providers/make_image';
import type { ProviderError } from '../providers/types';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import { prepare_upload_image } from '../utils/image';
import './PicturesScreen.css';

/** 그림 자리 표시 아이콘의 한 변(px) */
const PLACEHOLDER_ICON_SIZE = 48;
/** 그림 설명 입력 칸의 id */
const DESC_INPUT_ID = 'pic-desc';
/** 그림 설명 입력 칸의 줄 수 */
const DESC_ROWS = 3;

/** 쪽 아래에 보여 주는 안내 종류 */
type NoticeKind = 'need_connect' | 'copied' | 'copy_manual' | 'upload_error';

/** 보여 줄 AI 오류와 "다시 하기"가 할 일 */
interface ErrorState {
  error: ProviderError;
  retry: () => void;
}

/** 모두 만들기 진행 상황 */
interface BatchProgress {
  done: number;
  total: number;
}

/**
 * 주어진 시간(ms)만큼 쉰다.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 그림 자리 표시 아이콘.
 */
function PictureIcon() {
  return (
    <svg
      aria-hidden="true"
      width={PLACEHOLDER_ICON_SIZE}
      height={PLACEHOLDER_ICON_SIZE}
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="9" width="36" height="30" rx="4" />
      <circle cx="17" cy="20" r="3.5" />
      <path d="M6 33l11-9 8 6 7-5 10 8" />
    </svg>
  );
}

/**
 * 6단계 그림 화면.
 */
export function PicturesScreen() {
  const t = useT();
  const book = useBook((state) => state.book);
  const current_page = useBook((state) => state.current_page);
  const go = useBook((state) => state.go);
  const open_side = useBook((state) => state.open_side);
  const set_current_page = useBook((state) => state.set_current_page);
  const update_page = useBook((state) => state.update_page);
  const set_page_image = useBook((state) => state.set_page_image);

  const [notice, set_notice] = useState<NoticeKind | null>(null);
  const [copy_text, set_copy_text] = useState('');
  const [error_state, set_error_state] = useState<ErrorState | null>(null);
  /** 지금 AI가 그림을 그리고 있는 쪽 */
  const [busy_index, set_busy_index] = useState<number | null>(null);
  const [batch, set_batch] = useState<BatchProgress | null>(null);

  const input_ref = useRef<HTMLInputElement>(null);
  const is_mounted_ref = useRef(false);
  const stop_batch_ref = useRef(false);

  // 화면을 떠나면 모두 만들기를 멈춘다. (StrictMode에서 두 번 돌아도 맞도록 켤 때 true로 둔다)
  useEffect(() => {
    is_mounted_ref.current = true;
    return () => {
      is_mounted_ref.current = false;
      stop_batch_ref.current = true;
    };
  }, []);

  if (!book) return null;

  const page_count = book.pages.length;
  const index = Math.max(0, Math.min(current_page, page_count - 1));
  const page = book.pages[index];
  if (!page) return null;

  const is_working = busy_index !== null || batch !== null;
  const current_name = page_name(t, index);
  const style_name = t(`style.name.${book.style_id}`);

  /** 안내와 오류를 지운다. */
  const clear_messages = () => {
    set_notice(null);
    set_error_state(null);
    set_copy_text('');
  };

  /** 보고 있는 쪽을 바꾼다. 안내와 오류는 지운다. */
  const choose_page = (next_index: number) => {
    clear_messages();
    set_current_page(next_index);
  };

  /** 이 쪽의 그림을 AI로 한 번 만든다. */
  const make_one = async (target_index: number) => {
    clear_messages();
    if (!get_image_provider()) {
      set_notice('need_connect');
      return;
    }
    const latest = useBook.getState().book;
    if (!latest) return;
    set_busy_index(target_index);
    try {
      const image = await generate_page_image(latest, target_index);
      if (image) set_page_image(target_index, image);
    } catch (cause) {
      if (is_mounted_ref.current) set_error_state({ error: to_provider_error(cause), retry: () => void make_one(target_index) });
    } finally {
      if (is_mounted_ref.current) set_busy_index(null);
    }
  };

  /** 그림이 없는 쪽을 앞에서부터 차례로 만든다. 이미 그림이 있는 쪽은 건너뛴다. */
  const make_all = async () => {
    clear_messages();
    if (!get_image_provider()) {
      set_notice('need_connect');
      return;
    }
    const start_book = useBook.getState().book;
    if (!start_book) return;
    const missing = start_book.pages.flatMap((item, item_index) => (item.image ? [] : [item_index]));
    if (missing.length === 0) return;
    stop_batch_ref.current = false;
    let done = 0;
    let has_generated = false;
    set_batch({ done, total: missing.length });
    try {
      for (const target_index of missing) {
        if (stop_batch_ref.current) break;
        // 제공사 한도를 넘지 않게 쪽 사이에 쉰다. 연습 모드에서는 쉬지 않는다.
        if (has_generated && !useSettings.getState().practice) {
          await sleep(BATCH_IMAGE_GAP_MS);
          if (stop_batch_ref.current) break;
        }
        // 참고 그림이 첫 AI 그림을 찾으므로 최신 책을 다시 읽어 넘긴다.
        const latest = useBook.getState().book;
        if (!latest) break;
        if (!latest.pages[target_index]?.image) {
          if (is_mounted_ref.current) set_busy_index(target_index);
          const image = await generate_page_image(latest, target_index);
          if (image) set_page_image(target_index, image);
          has_generated = true;
        }
        done += 1;
        if (is_mounted_ref.current) set_batch({ done, total: missing.length });
      }
    } catch (cause) {
      if (is_mounted_ref.current) set_error_state({ error: to_provider_error(cause), retry: () => void make_all() });
    } finally {
      if (is_mounted_ref.current) {
        set_busy_index(null);
        set_batch(null);
      }
    }
  };

  /** 올린 그림 파일을 줄여서 이 쪽에 넣는다. */
  const handle_upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 고를 수 있게 값을 비운다.
    event.target.value = '';
    if (!file) return;
    clear_messages();
    try {
      const data_url = await prepare_upload_image(file);
      set_page_image(index, { data_url, source: 'upload' });
    } catch {
      if (is_mounted_ref.current) set_notice('upload_error');
    }
  };

  /** 이 쪽의 완성된 그림 설명을 복사한다. 복사하지 못하면 직접 복사할 수 있게 글을 보여 준다. */
  const handle_copy = async () => {
    clear_messages();
    const text = full_image_prompt(book, index);
    try {
      await navigator.clipboard.writeText(text);
      set_notice('copied');
    } catch {
      set_copy_text(text);
      set_notice('copy_manual');
    }
  };

  const connect_action = (
    <button type="button" className="btn small" onClick={() => open_side('connect')}>
      {t('pictures.connect_link')}
    </button>
  );

  return (
    <StepShell
      screen="pictures"
      width="wider"
      on_prev={() => go('style')}
      on_next={() => go('editor')}
      next_label={t('pictures.next')}
      footer_hint={t('pictures.footer_hint')}
    >
      <div className="pic-layout">
        <nav className="pic-nav" aria-label={t('pictures.list')}>
          <span className="pic-nav-title">{t('pictures.list')}</span>
          <div className="pic-list">
            {book.pages.map((item, item_index) => {
              const is_here = item_index === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  className="pic-item"
                  aria-current={is_here ? 'true' : undefined}
                  onClick={() => choose_page(item_index)}
                >
                  <span>{page_name(t, item_index)}</span>
                  {is_here ? (
                    <span>{t('pictures.here')}</span>
                  ) : item.image ? (
                    <span className="pic-has">{t('pictures.has')}</span>
                  ) : (
                    <span className="pic-none">{t('pictures.none')}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="pic-all">
            <div className="row">
              <button type="button" className="btn outline" onClick={() => void make_all()} disabled={is_working}>
                {batch ? t('pictures.making_all', { done: batch.done, total: batch.total }) : t('pictures.make_all')}
              </button>
              {batch && (
                <button type="button" className="btn small" onClick={() => (stop_batch_ref.current = true)}>
                  {t('pictures.stop')}
                </button>
              )}
            </div>
          </div>
        </nav>

        <section className="pic-main">
          <div className="row spread">
            <h1 className="title-md">{t('pictures.heading', { name: current_name })}</h1>
            <span className="pill plain">{t('pictures.style', { name: style_name })}</span>
          </div>

          <div className="pic-middle">
            {busy_index === index ? (
              <div className="pic-frame working">
                <Busy>{t('pictures.making')}</Busy>
              </div>
            ) : page.image ? (
              <div className="pic-frame">
                <img src={page.image.data_url} alt={t('pictures.image_alt', { name: current_name })} />
              </div>
            ) : (
              <div className="pic-frame empty">
                <PictureIcon />
                <span>{t('pictures.placeholder', { name: current_name })}</span>
              </div>
            )}
            <div className="pic-side">
              <div className="pic-field">
                <span className="pic-label">{t('pictures.text_label')}</span>
                <p className="pic-text">{page.text.trim() ? page.text : t('pictures.no_text')}</p>
              </div>
              <div className="pic-field">
                <label className="pic-label" htmlFor={DESC_INPUT_ID}>
                  {t('pictures.desc_label')}
                </label>
                <textarea
                  id={DESC_INPUT_ID}
                  className="text-area pic-textarea"
                  rows={DESC_ROWS}
                  value={page.image_prompt}
                  onChange={(event) => update_page(index, { image_prompt: event.target.value })}
                />
              </div>
            </div>
          </div>

          {notice === 'need_connect' && (
            <Notice kind="warn" action={connect_action}>
              {t('pictures.need_connect')}
            </Notice>
          )}
          {notice === 'upload_error' && (
            <Notice kind="warn" role="alert">
              {t('pictures.upload_error')}
            </Notice>
          )}
          {notice === 'copied' && <Notice kind="ok">{t('pictures.copied')}</Notice>}
          {notice === 'copy_manual' && (
            <>
              <Notice kind="warn">{t('pictures.copy_manual')}</Notice>
              <textarea
                className="text-area pic-fallback"
                rows={DESC_ROWS}
                readOnly
                value={copy_text}
                aria-label={t('pictures.copy.title')}
                data-testid="copy-fallback"
              />
            </>
          )}
          {error_state && <AiErrorNotice error={error_state.error} on_retry={error_state.retry} />}

          <div className="grid-3">
            <button type="button" className="choice medium primary" onClick={() => void make_one(index)} disabled={is_working}>
              <span className="choice-title">{t('pictures.ai.title')}</span>
              <span className="choice-desc">{t('pictures.ai.desc')}</span>
            </button>
            <button type="button" className="choice medium" onClick={() => input_ref.current?.click()} disabled={is_working}>
              <span className="choice-title">{t('pictures.upload.title')}</span>
              <span className="choice-desc">{t('pictures.upload.desc')}</span>
            </button>
            <button type="button" className="choice medium" onClick={() => void handle_copy()} disabled={is_working}>
              <span className="choice-title">{t('pictures.copy.title')}</span>
              <span className="choice-desc">{t('pictures.copy.desc')}</span>
            </button>
          </div>
          <input
            ref={input_ref}
            type="file"
            accept="image/*"
            hidden
            tabIndex={-1}
            data-testid="upload-input"
            onChange={(event) => void handle_upload(event)}
          />
        </section>
      </div>
    </StepShell>
  );
}
