// Step 7 editor: text, text box, layout and page order are edited locally without calling the AI.
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AiErrorNotice, Busy, Notice, to_provider_error } from '../components/Notice';
import { PageView } from '../components/PageView';
import { DiLabBadge, HomeBrand, MadeByLine, Shell } from '../components/Shell';
import { FONT_IDS, FONT_SIZE_MAX, FONT_SIZE_MIN, LAYOUT_IDS, TEXT_COLORS } from '../constants';
import { EditableTextBox } from '../editor/EditableTextBox';
import { page_name, useT } from '../i18n';
import { generate_page_image } from '../providers/make_image';
import type { ProviderError } from '../providers/types';
import { apply_layout } from '../store/book_model';
import { insert_blank_page, move_page, remove_page, useBook } from '../store/book_store';
import type { BookPage, BoxBackground, FontId, LayoutId, PageImage, Rect, TextAlign, TextBox } from '../types';
import { prepare_upload_image } from '../utils/image';
import { useElementWidth } from '../utils/use_element_width';
import './EditorScreen.css';

/** Max page preview width in px. */
const PREVIEW_MAX_WIDTH = 560;
const BACKGROUNDS: BoxBackground[] = ['none', 'white', 'bubble'];
const ALIGNS: TextAlign[] = ['left', 'center', 'right'];
/** A page can be removed only when the book (cover included) has more pages than this. */
const MIN_PAGES_WITH_COVER = 2;

/** Undo arrow; `flipped` draws the redo arrow. */
function UndoIcon({ flipped = false }: { flipped?: boolean }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {flipped ? (
        <>
          <path d="M12 4l3.5 3.5L12 11" />
          <path d="M15 7.5H7.5a4.5 4.5 0 000 9H10" />
        </>
      ) : (
        <>
          <path d="M6 4L2.5 7.5 6 11" />
          <path d="M3 7.5h7.5a4.5 4.5 0 010 9H8" />
        </>
      )}
    </svg>
  );
}

/** Layout button icon: the blue part is the image, the gray part is the text. */
function LayoutIcon({ layout }: { layout: LayoutId }) {
  if (layout === 'full') {
    return (
      <span className="layout-icon full">
        <span className="text-part" />
      </span>
    );
  }
  const is_column = layout === 'image_top' || layout === 'text_top';
  const image_first = layout === 'image_top' || layout === 'image_left';
  return (
    <span className={is_column ? 'layout-icon column' : 'layout-icon'}>
      <span className={image_first ? 'image-part' : 'text-part'} />
      <span className={image_first ? 'text-part' : 'image-part'} />
    </span>
  );
}

/** Step 7 page editor screen. */
export function EditorScreen() {
  const t = useT();
  const book = useBook((state) => state.book);
  const current_page = useBook((state) => state.current_page);
  const can_undo = useBook((state) => state.undo_stack.length > 0);
  const can_redo = useBook((state) => state.redo_stack.length > 0);
  const { go, set_current_page, edit_pages, undo, redo } = useBook.getState();
  const [canvas_ref, canvas_width] = useElementWidth<HTMLDivElement>(PREVIEW_MAX_WIDTH);
  const file_input_ref = useRef<HTMLInputElement | null>(null);
  const drag_from_ref = useRef<number | null>(null);
  const [is_drawing, set_is_drawing] = useState(false);
  const [ai_error, set_ai_error] = useState<ProviderError | null>(null);
  const [message, set_message] = useState<string | null>(null);

  // Ctrl+Z undoes; Ctrl+Shift+Z or Ctrl+Y redoes.
  useEffect(() => {
    const handle_key = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        useBook.getState().undo();
      } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault();
        useBook.getState().redo();
      }
    };
    window.addEventListener('keydown', handle_key);
    return () => window.removeEventListener('keydown', handle_key);
  }, []);

  const page = book?.pages[current_page];
  if (!book || !page) return null;
  const size = Math.min(canvas_width, PREVIEW_MAX_WIDTH);
  const name = page_name(t, current_page);
  const box = page.text_box;

  /** Edits the current page; edits sharing a change_key merge into one undo step. */
  const change_page = (mutator: (target: BookPage) => BookPage, change_key?: string) => {
    edit_pages((pages) => pages.map((item, index) => (index === current_page ? mutator(item) : item)), change_key);
  };
  const change_box = (patch: Partial<TextBox>, change_key?: string) => {
    change_page((target) => ({ ...target, text_box: { ...target.text_box, ...patch } }), change_key);
  };
  const change_image = (image: PageImage) => change_page((target) => ({ ...target, image }));
  const clear_notices = () => {
    set_ai_error(null);
    set_message(null);
  };

  const select_page = (index: number) => {
    clear_notices();
    set_current_page(index);
  };

  /** Redraws only this page's image; other pages are untouched. */
  const handle_regenerate = async () => {
    clear_notices();
    set_is_drawing(true);
    try {
      const latest_book = useBook.getState().book;
      const image = latest_book ? await generate_page_image(latest_book, current_page) : null;
      if (image) change_image(image);
      else set_message(t('editor.regen_need'));
    } catch (cause) {
      set_ai_error(to_provider_error(cause));
    } finally {
      set_is_drawing(false);
    }
  };

  const handle_upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    clear_notices();
    try {
      change_image({ data_url: await prepare_upload_image(file), source: 'upload' });
    } catch {
      set_message(t('pictures.upload_error'));
    }
  };

  const handle_drop = (event: DragEvent, to_index: number) => {
    event.preventDefault();
    const from_index = drag_from_ref.current;
    drag_from_ref.current = null;
    if (from_index === null || to_index === 0) return;
    edit_pages((pages) => move_page(pages, from_index, to_index));
    set_current_page(to_index);
  };
  const shift_page = (step: number) => {
    const to_index = current_page + step;
    edit_pages((pages) => move_page(pages, current_page, to_index));
    if (to_index >= 1 && to_index < book.pages.length) set_current_page(to_index);
  };
  const handle_add_page = () => {
    edit_pages((pages) => insert_blank_page(pages, current_page));
    set_current_page(Math.max(1, current_page + 1));
  };

  const is_cover = current_page === 0;
  const can_remove = !is_cover && book.pages.length > MIN_PAGES_WITH_COVER;

  return (
    <Shell
      compact_header
      header={
        <>
          <div className="row editor-tools">
            <HomeBrand />
            <h1 className="editor-title">{t('common.step_label', { n: 7, name: t('step.editor') })}</h1>
            <button type="button" className="btn small" onClick={undo} disabled={!can_undo}>
              <UndoIcon />
              {t('editor.undo')}
            </button>
            <button type="button" className="btn small" onClick={redo} disabled={!can_redo}>
              <UndoIcon flipped />
              {t('editor.redo')}
            </button>
            <button type="button" className="btn small" onClick={() => void handle_regenerate()} disabled={is_drawing}>
              {t('editor.regen')}
            </button>
            <button type="button" className="btn small" onClick={() => file_input_ref.current?.click()} disabled={is_drawing}>
              {t('editor.change_image')}
            </button>
            <input ref={file_input_ref} type="file" accept="image/*" hidden onChange={(event) => void handle_upload(event)} data-testid="editor-upload-input" />
          </div>
          <div className="header-right">
            <span className="pill ok editor-badge">{t('editor.no_ai_badge')}</span>
            <DiLabBadge />
          </div>
        </>
      }
      footer={
        <>
          <button type="button" className="btn footer-prev" onClick={() => go('pictures')}>
            {t('common.prev')}
          </button>
          <span className="footer-hint">
            <MadeByLine />
          </span>
          <button type="button" className="btn primary big" onClick={() => go('finish')}>
            {t('editor.next')}
          </button>
        </>
      }
    >
      <div className="editor-layout">
        <nav className="editor-pages" aria-label={t('editor.order')}>
          <span className="editor-side-title">{t('editor.order')}</span>
          <div className="editor-thumbs">
            {book.pages.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="editor-thumb"
                aria-current={index === current_page ? 'true' : undefined}
                draggable={index > 0}
                onDragStart={() => {
                  drag_from_ref.current = index;
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handle_drop(event, index)}
                onClick={() => select_page(index)}
                style={item.image ? { backgroundImage: `url("${item.image.data_url}")` } : undefined}
              >
                <span className="thumb-label">{page_name(t, index)}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn small dashed" onClick={handle_add_page}>
            {t('editor.add_page')}
          </button>
          <div className="editor-page-actions">
            <button type="button" className="btn small" onClick={() => shift_page(-1)} disabled={current_page <= 1}>
              {t('editor.move_up')}
            </button>
            <button type="button" className="btn small" onClick={() => shift_page(1)} disabled={is_cover || current_page >= book.pages.length - 1}>
              {t('editor.move_down')}
            </button>
            <button type="button" className="btn small danger" onClick={() => edit_pages((pages) => remove_page(pages, current_page))} disabled={!can_remove}>
              {t('editor.remove_page')}
            </button>
          </div>
          <span className="editor-small-hint">{t('editor.drag_hint')}</span>
        </nav>

        <section className="editor-canvas" aria-label={t('editor.preview')}>
          {is_drawing && <Busy>{t('editor.regen_busy')}</Busy>}
          {ai_error && <AiErrorNotice error={ai_error} on_retry={() => void handle_regenerate()} />}
          {message && (
            <Notice kind="warn" role="alert">
              {message}
            </Notice>
          )}
          <div ref={canvas_ref} className="editor-canvas-fit">
            <PageView page={page} size={size} hide_text placeholder={`${name} ${t('editor.image_placeholder')}`} image_alt={t('pictures.image_alt', { name })} class_name="page-shadow">
              <EditableTextBox
                key={page.id}
                page={page}
                size={size}
                name={name}
                on_text={(text) => change_page((target) => ({ ...target, text }), `text:${page.id}`)}
                on_rect={(rect: Rect, change_key) => change_box(rect, change_key)}
                on_edit_end={() => useBook.setState({ last_change_key: null })}
              />
            </PageView>
          </div>
          <p className="editor-small-hint">{is_cover ? t('editor.cover_hint') : t('editor.box_help')}</p>
        </section>

        <aside className="editor-settings" aria-label={t('editor.box_settings')}>
          <div className="stack tight">
            <label htmlFor="font-pick" className="editor-label">
              {t('editor.font')}
            </label>
            <select id="font-pick" className="select" value={box.font_id} onChange={(event) => change_box({ font_id: event.target.value as FontId })}>
              {FONT_IDS.map((font_id) => (
                <option key={font_id} value={font_id}>
                  {t(`editor.font.${font_id}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="stack tight">
            <label htmlFor="font-size" className="editor-label">
              {t('editor.font_size')}
            </label>
            <input
              id="font-size"
              type="range"
              className="editor-range"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              value={box.font_size}
              onChange={(event) => change_box({ font_size: Number(event.target.value) }, `font-size:${page.id}`)}
            />
          </div>
          <div className="stack tight">
            <span id="color-label" className="editor-label">
              {t('editor.color')}
            </span>
            <div role="group" aria-labelledby="color-label" className="editor-swatches">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className="editor-swatch"
                  aria-label={t(`editor.color.${color.id}`)}
                  aria-pressed={box.color === color.value}
                  style={{ background: color.value }}
                  onClick={() => change_box({ color: color.value })}
                />
              ))}
            </div>
          </div>
          <div className="stack tight">
            <span id="align-label" className="editor-label">
              {t('editor.align')}
            </span>
            <div role="group" aria-labelledby="align-label" className="editor-seg-row">
              {ALIGNS.map((align) => (
                <button key={align} type="button" className="seg small" aria-pressed={box.align === align} onClick={() => change_box({ align })}>
                  {t(`editor.align.${align}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="stack tight">
            <span id="bg-label" className="editor-label">
              {t('editor.bg')}
            </span>
            <div role="group" aria-labelledby="bg-label" className="editor-seg-row">
              {BACKGROUNDS.map((background) => (
                <button key={background} type="button" className="seg small" aria-pressed={box.background === background} onClick={() => change_box({ background })}>
                  {t(`editor.bg.${background}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="stack tight">
            <span id="layout-label" className="editor-label">
              {t('editor.layout')}
            </span>
            <div role="group" aria-labelledby="layout-label" className="editor-layouts">
              {LAYOUT_IDS.map((layout) => (
                <button
                  key={layout}
                  type="button"
                  className="editor-layout-btn"
                  aria-label={t(`editor.layout.${layout}`)}
                  aria-pressed={page.layout === layout}
                  onClick={() => change_page((target) => apply_layout(target, layout))}
                >
                  <LayoutIcon layout={layout} />
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
