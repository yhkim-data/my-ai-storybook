// Step 8 finish screen: book viewer, author name, and PDF / image zip / project file downloads.
import { useState, type KeyboardEvent } from 'react';
import { DiLabBadge, HomeBrand, Shell, StepDots } from '../components/Shell';
import { Busy, Notice } from '../components/Notice';
import { CreditsPageView, PageView } from '../components/PageView';
import type { ProgressFn } from '../export/export_book';
import { page_name, useT } from '../i18n';
import { book_file_name, book_file_stem, download_blob, serialize_book } from '../storage/book_file';
import { page_aspect } from '../store/book_model';
import { useBook } from '../store/book_store';
import { go_home } from '../store/navigation';
import type { Book } from '../types';
import { useElementSize } from '../utils/use_element_size';
import './FinishScreen.css';

/** Max viewer page width in px. */
const VIEWER_MAX_SIZE = 560;
/** Size in px used before the container is measured. */
const VIEWER_INITIAL = { width: 420, height: 420 };
/** In characters. */
const AUTHOR_MAX_LENGTH = 30;
const BOOK_FILE_MIME = 'application/json';

type ExportKind = 'pdf' | 'print' | 'zip' | 'file';
interface Progress {
  done: number;
  total: number;
}

interface DownloadChoiceProps {
  test_id: string;
  title: string;
  desc: string;
  is_primary?: boolean;
  disabled: boolean;
  on_click: () => void;
}

function DownloadChoice({ test_id, title, desc, is_primary = false, disabled, on_click }: DownloadChoiceProps) {
  return (
    <button
      type="button"
      className={is_primary ? 'choice medium primary' : 'choice medium'}
      data-testid={test_id}
      disabled={disabled}
      onClick={on_click}
    >
      <span className="choice-title">{title}</span>
      <span className="choice-desc">{desc}</span>
    </button>
  );
}

/** Shows the cover, story pages and the credits page one at a time. */
function BookViewer({ book }: { book: Book }) {
  const t = useT();
  const [index, set_index] = useState(0);
  const [wrap_ref, wrap_box] = useElementSize<HTMLDivElement>(VIEWER_INITIAL);
  const size = Math.min(wrap_box.width, wrap_box.height / page_aspect(book.page_shape), VIEWER_MAX_SIZE);
  const total = book.pages.length + 1;
  const last = total - 1;
  const page = index < book.pages.length ? book.pages[index] : undefined;

  const handle_key = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') set_index((now) => Math.max(0, now - 1));
    if (event.key === 'ArrowRight') set_index((now) => Math.min(last, now + 1));
  };

  return (
    <section className="finish-viewer" aria-label={t('finish.viewer_aria')} tabIndex={0} onKeyDown={handle_key}>
      <div className="finish-viewer-page" ref={wrap_ref}>
        {page ? (
          <PageView page={page} size={size} shape={book.page_shape} image_alt={page_name(t, index)} class_name="page-shadow" />
        ) : (
          <CreditsPageView book={book} size={size} class_name="page-shadow" />
        )}
      </div>
      <div className="finish-viewer-bar">
        <button type="button" className="btn" disabled={index === 0} onClick={() => set_index(index - 1)}>
          {t('finish.prev_page')}
        </button>
        <span className="finish-page-of" aria-live="polite">
          {t('finish.page_of', { n: index + 1, total })}
        </span>
        <button type="button" className="btn" disabled={index === last} onClick={() => set_index(index + 1)}>
          {t('finish.next_page')}
        </button>
      </div>
    </section>
  );
}

/** Step 8 finish screen. */
export function FinishScreen() {
  const t = useT();
  const book = useBook((s) => s.book);
  const is_demo = useBook((s) => s.is_demo);
  const go = useBook((s) => s.go);
  const set_author = useBook((s) => s.set_author);
  const [progress, set_progress] = useState<Progress | null>(null);
  const [is_done, set_is_done] = useState(false);
  const [has_error, set_has_error] = useState(false);

  if (!book) return null;
  const total_pages = book.pages.length + 1;
  const is_busy = progress !== null;

  /** Builds and downloads the file; buttons stay disabled while it runs. */
  const run_export = async (kind: ExportKind) => {
    set_is_done(false);
    set_has_error(false);
    set_progress({ done: 0, total: total_pages });
    const on_progress: ProgressFn = (done, total) => set_progress({ done, total });
    try {
      const stem = book_file_stem(book);
      if (kind === 'file') {
        download_blob(new Blob([serialize_book(book)], { type: BOOK_FILE_MIME }), book_file_name(book));
      } else {
        // The export code is large, so it is loaded on first use to keep the initial load fast.
        const { export_image_zip, export_pdf } = await import('../export/export_book');
        if (kind === 'pdf') download_blob(await export_pdf(book, false, on_progress), `${stem}.pdf`);
        else if (kind === 'print') download_blob(await export_pdf(book, true, on_progress), `${stem}-print.pdf`);
        else download_blob(await export_image_zip(book, on_progress), `${stem}-pages.zip`);
      }
      set_is_done(true);
    } catch {
      set_has_error(true);
    } finally {
      set_progress(null);
    }
  };

  return (
    <Shell
      width="wide"
      header={
        <>
          <HomeBrand />
          <StepDots screen="finish" />
          <DiLabBadge />
        </>
      }
      footer={
        <>
          <button type="button" className="btn footer-prev" onClick={() => (is_demo ? void go_home() : go('editor'))}>
            {t('common.prev')}
          </button>
          <span className="footer-hint">{t('start.rights_line')}</span>
          <button type="button" className="btn" onClick={() => void go_home()}>
            {t('common.home')}
          </button>
        </>
      }
    >
      {is_demo && (
        <Notice
          kind="ok"
          action={
            <button type="button" className="btn small" onClick={() => void go_home()}>
              {t('finish.demo_start')}
            </button>
          }
        >
          {t('finish.demo_badge')}
        </Notice>
      )}
      <h1 className="title-lg">{t('finish.heading')}</h1>
      <div className="finish-body">
        <BookViewer book={book} />
        <div className="finish-actions">
          {!is_demo && (
            <div className="finish-author">
              <label htmlFor="author-input">{t('finish.author_label')}</label>
              <input
                id="author-input"
                className="text-input"
                type="text"
                maxLength={AUTHOR_MAX_LENGTH}
                placeholder={t('finish.author_placeholder')}
                value={book.author}
                onChange={(event) => set_author(event.target.value)}
              />
            </div>
          )}
          <DownloadChoice test_id="download-pdf" is_primary title={t('finish.pdf_screen.title')} desc={t('finish.pdf_screen.desc')} disabled={is_busy} on_click={() => void run_export('pdf')} />
          <DownloadChoice test_id="download-print" title={t('finish.pdf_print.title')} desc={t('finish.pdf_print.desc')} disabled={is_busy} on_click={() => void run_export('print')} />
          <DownloadChoice test_id="download-zip" title={t('finish.zip.title')} desc={t('finish.zip.desc')} disabled={is_busy} on_click={() => void run_export('zip')} />
          <DownloadChoice test_id="download-file" title={t('finish.file.title')} desc={t('finish.file.desc')} disabled={is_busy} on_click={() => void run_export('file')} />
          {progress && <Busy>{t('finish.working', { n: progress.done, total: progress.total })}</Busy>}
          {is_done && <Notice kind="ok">{t('finish.done')}</Notice>}
          {has_error && (
            <Notice kind="warn" role="alert">
              {t('finish.error')}
            </Notice>
          )}
        </div>
      </div>
    </Shell>
  );
}
