// Per-page art style control: a button that opens a list of "same as the book", the six styles and
// "my own style" (with a description box right under it). Used on the pictures and editor screens.
import { useRef } from 'react';
import { CUSTOM_STYLE_MAX_LENGTH, STYLE_IDS } from '../constants';
import { useT } from '../i18n';
import type { ArtStyle, StyleChoice } from '../types';
import { usePopover } from './use_popover';

const CUSTOM_ROWS = 3;

interface StyleMenuProps {
  /** The book's style, shown on the "same as the book" choice. */
  book_style: StyleChoice;
  /** The page's own style; undefined when the page follows the book. */
  page_style: ArtStyle | undefined;
  page_custom_style: string;
  /** undefined means "follow the book". */
  on_change: (style: ArtStyle | undefined, custom_style: string) => void;
  /** Id prefix, so two menus on one screen never share ids. */
  id: string;
  class_name?: string;
}

/** Button + pop-up list for one page's art style. */
export function StyleMenu({ book_style, page_style, page_custom_style, on_change, id, class_name = '' }: StyleMenuProps) {
  const t = useT();
  const button_ref = useRef<HTMLButtonElement>(null);
  const popover = usePopover<HTMLDivElement>(button_ref);
  const book_name = t(`style.name.${book_style.style_id}`);
  const shown_name = page_style ? t(`style.name.${page_style}`) : book_name;
  const custom_id = `${id}-custom`;

  const choose = (style: ArtStyle | undefined) => {
    on_change(style, page_custom_style);
    // "My own style" stays open so the description can be written right below it.
    if (style !== 'custom') popover.close(true);
  };

  return (
    <div className={`style-menu ${class_name}`} ref={popover.wrap_ref}>
      <button
        ref={button_ref}
        type="button"
        className="btn small style-menu-button"
        aria-expanded={popover.is_open}
        aria-controls={`${id}-list`}
        aria-label={t('style.page.menu_aria', { name: shown_name })}
        onClick={popover.toggle}
      >
        <span>{t('pictures.style', { name: shown_name })}</span>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5l4 4 4-4" />
        </svg>
      </button>
      {popover.is_open && (
        <div id={`${id}-list`} className={popover.opens_up ? 'style-menu-list up' : 'style-menu-list'} role="group" aria-label={t('style.page.label')}>
          <button type="button" className="style-menu-item" aria-pressed={page_style === undefined} onClick={() => choose(undefined)}>
            {t('style.page.follow', { name: book_name })}
          </button>
          {STYLE_IDS.map((style_id) => (
            <button key={style_id} type="button" className="style-menu-item" aria-pressed={page_style === style_id} onClick={() => choose(style_id)}>
              {t(`style.name.${style_id}`)}
            </button>
          ))}
          <button type="button" className="style-menu-item" aria-pressed={page_style === 'custom'} onClick={() => choose('custom')}>
            {t('style.name.custom')}
          </button>
          {page_style === 'custom' && (
            <div className="style-menu-custom">
              <label htmlFor={custom_id}>{t('style.page.custom_label')}</label>
              <textarea
                id={custom_id}
                className="text-area"
                rows={CUSTOM_ROWS}
                maxLength={CUSTOM_STYLE_MAX_LENGTH}
                placeholder={t('style.custom.placeholder')}
                value={page_custom_style}
                onChange={(event) => on_change('custom', event.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
