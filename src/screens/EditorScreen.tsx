// Step 7 editor: text, text box, layout and page order are edited locally without calling the AI.
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { EditPicture } from '../components/EditPicture';
import { ask_key_again } from '../components/KeySafety';
import { AiErrorNotice, Busy, Notice, to_provider_error } from '../components/Notice';
import { PageView } from '../components/PageView';
import { DiLabBadge, HomeBrand, MadeByLine, Shell } from '../components/Shell';
import { StyleMenu } from '../components/StyleMenu';
import { FONT_IDS, FONT_SIZE_MAX, FONT_SIZE_MIN, LAYOUT_IDS, PAGE_SHAPES, PAGE_SHAPE_MM, TEXT_COLORS } from '../constants';
import { EditableImageBox } from '../editor/EditableImageBox';
import { EditableTextBox } from '../editor/EditableTextBox';
import { page_name, useT } from '../i18n';
import { generate_page_image, needs_style_redraw, practice_restyle } from '../providers/make_image';
import type { ProviderError } from '../providers/types';
import { apply_layout } from '../store/book_model';
import { insert_blank_page, move_page, remove_page, useBook } from '../store/book_store';
import { clean_custom_style, page_aspect } from '../store/book_model';
import { with_new_image } from '../store/image_versions';
import type { ArtStyle, BookPage, BoxBackground, BoxKind, FontId, LayoutId, PageImage, PageShape, Rect, TextAlign, TextBox } from '../types';
import { prepare_upload_image } from '../utils/image';
import { useElementSize } from '../utils/use_element_size';
import './EditorScreen.css';

/** Max page preview width in px. */
const PREVIEW_MAX_WIDTH = 640;
/** Preview size used before the canvas is measured. */
const PREVIEW_INITIAL = { width: 560, height: 560 };
/** Room (px) kept above the page for the text box move handle, and around it for the corner handles. */
const CANVAS_TOP_SPACE = 36;
const CANVAS_EDGE_SPACE = 12;
const ICON_SIZE = 18;

/** Columns of page thumbnails, so long books still fit on one screen. */
function thumb_columns(count: number): number {
  const TWO_COLUMNS_UP_TO = 6;
  const THREE_COLUMNS_UP_TO = 12;
  if (count <= TWO_COLUMNS_UP_TO) return 2;
  return count <= THREE_COLUMNS_UP_TO ? 3 : 4;
}

/** Small arrow and minus icons for the page order buttons. */
function OrderIcon({ kind }: { kind: 'up' | 'down' | 'remove' }) {
  return (
    <svg aria-hidden="true" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {kind === 'up' && <path d="M11 4L6 9l5 5" />}
      {kind === 'down' && <path d="M7 4l5 5-5 5" />}
      {kind === 'remove' && <path d="M4 9h10" />}
    </svg>
  );
}
const BACKGROUNDS: BoxBackground[] = ['none', 'white', 'bubble'];
const ALIGNS: TextAlign[] = ['left', 'center', 'right'];
/** Settings tabs, one per box. The selected tab is also the selected box on the page. */
const BOX_KINDS: BoxKind[] = ['text', 'image'];
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

/** Book shape button icon: an outline of the page, drawn to scale like the layout icons. */
function ShapeIcon({ shape }: { shape: PageShape }) {
  const size = PAGE_SHAPE_MM[shape];
  return (
    <span className="shape-icon">
      <span className={size.h > size.w ? 'shape-icon-page tall' : 'shape-icon-page wide'} style={{ aspectRatio: `${size.w} / ${size.h}` }} />
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
  const [canvas_ref, canvas_box] = useElementSize<HTMLDivElement>(PREVIEW_INITIAL);
  const file_input_ref = useRef<HTMLInputElement | null>(null);
  const drag_from_ref = useRef<number | null>(null);
  const [is_drawing, set_is_drawing] = useState(false);
  const [ai_error, set_ai_error] = useState<ProviderError | null>(null);
  const [message, set_message] = useState<string | null>(null);
  const [selected_box, set_selected_box] = useState<BoxKind>('text');
  const [is_fixing, set_is_fixing] = useState(false);

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
  const aspect = page_aspect(book.page_shape);
  const shape_mm = PAGE_SHAPE_MM[book.page_shape];
  // Page width: as large as fits both the width and the height left for the preview.
  const size = Math.max(
    0,
    Math.min(canvas_box.width - CANVAS_EDGE_SPACE * 2, (canvas_box.height - CANVAS_TOP_SPACE - CANVAS_EDGE_SPACE) / aspect, PREVIEW_MAX_WIDTH),
  );
  const name = page_name(t, current_page);
  const box = page.text_box;

  /** Edits the current page; edits sharing a change_key merge into one undo step. */
  const change_page = (mutator: (target: BookPage) => BookPage, change_key?: string) => {
    edit_pages((pages) => pages.map((item, index) => (index === current_page ? mutator(item) : item)), change_key);
  };
  const change_box = (patch: Partial<TextBox>, change_key?: string) => {
    change_page((target) => ({ ...target, text_box: { ...target.text_box, ...patch } }), change_key);
  };
  /** A new picture (drawn again or uploaded) starts the picture's versions over; undo brings the old list back. */
  const change_image = (image: PageImage) => change_page((target) => with_new_image(target, image));
  const change_image_box = (rect: Rect, change_key?: string) => change_page((target) => ({ ...target, image_box: rect }), change_key);
  /** Puts the selected box in front of the other one, or behind it. */
  const set_front = (front: BoxKind) => change_page((target) => (target.front === front ? target : { ...target, front }));
  const other_box: BoxKind = selected_box === 'text' ? 'image' : 'text';
  const clear_notices = () => {
    set_ai_error(null);
    set_message(null);
  };

  /** Left and right arrows move between the settings tabs. */
  const handle_tab_key = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next: BoxKind = selected_box === 'text' ? 'image' : 'text';
    set_selected_box(next);
    document.getElementById(`editor-tab-${next}`)?.focus();
  };

  /** Changes this page's style as one undo step. Practice mode swaps the picture at once. */
  const change_style = async (style: ArtStyle | undefined, custom_style: string) => {
    const change_key = `style:${page.id}`;
    change_page(
      (target) => ({ ...target, style, custom_style: style === 'custom' ? clean_custom_style(custom_style) : undefined }),
      change_key,
    );
    const latest = useBook.getState().book;
    const image = latest ? await practice_restyle(latest, current_page) : null;
    if (image) change_page((target) => with_new_image(target, image), change_key);
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
      else if (!ask_key_again()) set_message(t('editor.regen_need'));
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
      change_image({ data_url: await prepare_upload_image(file), source: 'upload', created_at: Date.now() });
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
  const image_box_view = (
    <EditableImageBox
      key={`image-${page.id}`}
      page={page}
      size={size}
      aspect={aspect}
      placeholder={`${name} ${t('editor.image_placeholder')}`}
      image_alt={t('pictures.image_alt', { name })}
      selected={selected_box === 'image'}
      on_select={() => set_selected_box('image')}
      on_rect={change_image_box}
    />
  );
  const text_box_view = (
    <EditableTextBox
      key={`text-${page.id}`}
      page={page}
      size={size}
      aspect={aspect}
      name={name}
      selected={selected_box === 'text'}
      on_select={() => set_selected_box('text')}
      on_text={(text) => change_page((target) => ({ ...target, text }), `text:${page.id}`)}
      on_rect={(rect: Rect, change_key) => change_box(rect, change_key)}
      on_edit_end={() => useBook.setState({ last_change_key: null })}
    />
  );
  const needs_redraw = needs_style_redraw(book, current_page);
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
              <span className="btn-text">{t('editor.undo')}</span>
            </button>
            <button type="button" className="btn small" onClick={redo} disabled={!can_redo}>
              <UndoIcon flipped />
              <span className="btn-text">{t('editor.redo')}</span>
            </button>
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
          <div className="editor-thumbs" style={{ gridTemplateColumns: `repeat(${thumb_columns(book.pages.length)}, minmax(0, 1fr))` }}>
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
                style={{ aspectRatio: `${shape_mm.w} / ${shape_mm.h}`, ...(item.image ? { backgroundImage: `url("${item.image.data_url}")` } : {}) }}
              >
                <span className="thumb-label">{page_name(t, index)}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn small dashed" onClick={handle_add_page}>
            {t('editor.add_page')}
          </button>
          <div className="editor-page-actions">
            <button type="button" className="btn small icon-btn" aria-label={t('editor.move_up')} title={t('editor.move_up')} onClick={() => shift_page(-1)} disabled={current_page <= 1}>
              <OrderIcon kind="up" />
            </button>
            <button type="button" className="btn small icon-btn" aria-label={t('editor.move_down')} title={t('editor.move_down')} onClick={() => shift_page(1)} disabled={is_cover || current_page >= book.pages.length - 1}>
              <OrderIcon kind="down" />
            </button>
            <button type="button" className="btn small danger icon-btn" aria-label={t('editor.remove_page')} title={t('editor.remove_page')} onClick={() => edit_pages((pages) => remove_page(pages, current_page))} disabled={!can_remove}>
              <OrderIcon kind="remove" />
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
            <PageView page={page} size={size} shape={book.page_shape} hide_text hide_image class_name="page-shadow">
              {page.front === 'image' ? [text_box_view, image_box_view] : [image_box_view, text_box_view]}
            </PageView>
          </div>
          <p className="editor-small-hint">{is_cover ? t('editor.cover_hint') : t('editor.box_help')}</p>
        </section>

        <aside className="editor-settings" aria-label={t('editor.settings')}>
          <input ref={file_input_ref} type="file" accept="image/*" hidden onChange={(event) => void handle_upload(event)} data-testid="editor-upload-input" />
          <div className="editor-tabs" role="tablist" aria-label={t('editor.settings')}>
            {BOX_KINDS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`editor-tab-${tab}`}
                className="editor-tab"
                aria-selected={selected_box === tab}
                aria-controls={`editor-panel-${tab}`}
                tabIndex={selected_box === tab ? 0 : -1}
                onClick={() => set_selected_box(tab)}
                onKeyDown={handle_tab_key}
              >
                {t(`editor.tab.${tab}`)}
              </button>
            ))}
          </div>
          <div className="editor-order" role="group" aria-label={t(`editor.order_${selected_box}`)}>
            <button type="button" className="btn small" onClick={() => set_front(selected_box)} disabled={page.front === selected_box}>
              {t('editor.bring_front')}
            </button>
            <button type="button" className="btn small" onClick={() => set_front(other_box)} disabled={page.front !== selected_box}>
              {t('editor.send_back')}
            </button>
          </div>
          {selected_box === 'text' ? (
            <div className="editor-panel" role="tabpanel" id="editor-panel-text" aria-labelledby="editor-tab-text">
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
            </div>
          ) : (
            <div className="editor-panel" role="tabpanel" id="editor-panel-image" aria-labelledby="editor-tab-image">
              <div className="editor-picture-actions">
                <button
                  type="button"
                  className={needs_redraw ? 'btn small primary attention' : 'btn small'}
                  onClick={() => void handle_regenerate()}
                  disabled={is_drawing || is_fixing}
                >
                  {t(needs_redraw ? 'pictures.redo_style' : 'editor.regen')}
                </button>
                <button type="button" className="btn small" onClick={() => file_input_ref.current?.click()} disabled={is_drawing || is_fixing}>
                  {t('editor.change_image')}
                </button>
              </div>
              <EditPicture key={page.id} page_index={current_page} compact busy_elsewhere={is_drawing} on_busy={set_is_fixing} />
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
              <div className="stack tight">
                <span id="shape-label" className="editor-label">
                  {t('editor.shape')}
                </span>
                <div role="group" aria-labelledby="shape-label" className="editor-layouts">
                  {PAGE_SHAPES.map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      className="editor-layout-btn"
                      aria-label={t(`editor.shape.${shape}`)}
                      title={t(`editor.shape.${shape}`)}
                      aria-pressed={book.page_shape === shape}
                      onClick={() => useBook.getState().set_page_shape(shape)}
                    >
                      <ShapeIcon shape={shape} />
                    </button>
                  ))}
                </div>
              </div>
              <label className="editor-check">
                <input
                  type="checkbox"
                  checked={page.image_lock}
                  onChange={(event) => change_page((target) => ({ ...target, image_lock: event.target.checked }))}
                />
                <span>{t('editor.image_lock')}</span>
              </label>
              <div className="stack tight">
                <span className="editor-label">{t('style.page.label')}</span>
                <StyleMenu
                  id="editor-style"
                  book_style={{ style_id: book.style_id, custom_style: book.custom_style }}
                  page_style={page.style}
                  page_custom_style={page.custom_style ?? ''}
                  on_change={(style, custom_style) => void change_style(style, custom_style)}
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    </Shell>
  );
}
