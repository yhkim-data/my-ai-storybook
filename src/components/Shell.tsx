// Shared screen frame: header, step dots, DI Lab badge, footer buttons.
import type { ReactNode } from 'react';
import { STEP_SCREENS } from '../constants';
import { useT } from '../i18n';
import type { Screen } from '../types';

/** Book icon size (px). */
const BOOK_ICON_SIZE = 32;

export function DiLabBadge() {
  return <span className="dilab-badge">DI Lab</span>;
}

export function MadeByLine() {
  const t = useT();
  return (
    <span>
      {t('common.made_by')} <strong>DI Lab</strong> · Data Insight Lab
    </span>
  );
}

/** App name, optionally with the book icon. */
export function Brand({ with_icon = false }: { with_icon?: boolean }) {
  const t = useT();
  return (
    <span className={with_icon ? 'brand big' : 'brand'}>
      {with_icon && (
        <svg
          aria-hidden="true"
          width={BOOK_ICON_SIZE}
          height={BOOK_ICON_SIZE}
          viewBox="0 0 32 32"
          fill="none"
          stroke="#2459C4"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 7c4-1.5 8-1.5 12 1v18c-4-2.5-8-2.5-12-1z" />
          <path d="M28 7c-4-1.5-8-1.5-12 1v18c4-2.5 8-2.5 12-1z" />
        </svg>
      )}
      {t('app.name')}
    </span>
  );
}

/** Step number (1-8) of a step screen. */
export function step_number(screen: Screen): number {
  return STEP_SCREENS.indexOf(screen) + 1;
}

/** Progress dots; the current step is drawn as an elongated dot. */
export function StepDots({ screen }: { screen: Screen }) {
  const t = useT();
  const now = step_number(screen);
  return (
    <div className="step-dots" role="img" aria-label={t('common.step_aria', { n: now })}>
      {STEP_SCREENS.map((step, index) => {
        const number = index + 1;
        const state = number === now ? 'dot now' : number < now ? 'dot done' : 'dot';
        return <span key={step} className={state} />;
      })}
      <span className="label">{t('common.step_label', { n: now, name: t(`step.${screen}`) })}</span>
    </div>
  );
}

interface ShellProps {
  header: ReactNode;
  footer?: ReactNode;
  /** Content max width (px): normal 960, wide 1120, wider 1200. */
  width?: 'normal' | 'wide' | 'wider';
  compact_header?: boolean;
  children: ReactNode;
}

/** Screen frame with header, main and optional footer. */
export function Shell({ header, footer, width = 'normal', compact_header = false, children }: ShellProps) {
  const main_class = width === 'normal' ? 'shell-main' : `shell-main ${width}`;
  return (
    <div className="shell">
      <header className={compact_header ? 'shell-header compact' : 'shell-header'}>{header}</header>
      <main className={main_class}>{children}</main>
      {footer && <footer className="shell-footer">{footer}</footer>}
    </div>
  );
}

interface StepShellProps {
  screen: Screen;
  on_prev: () => void;
  on_next: () => void;
  /** Next button label; defaults to the common "next" text. */
  next_label?: string;
  next_disabled?: boolean;
  /** Footer center hint; defaults to the autosave hint. */
  footer_hint?: ReactNode;
  width?: 'normal' | 'wide' | 'wider';
  children: ReactNode;
}

/** Frame for steps 2-6: brand, step dots, DI Lab badge, prev/next buttons. */
export function StepShell({ screen, on_prev, on_next, next_label, next_disabled, footer_hint, width, children }: StepShellProps) {
  const t = useT();
  return (
    <Shell
      width={width}
      header={
        <>
          <Brand />
          <StepDots screen={screen} />
          <DiLabBadge />
        </>
      }
      footer={
        <>
          <button type="button" className="btn footer-prev" onClick={on_prev}>
            {t('common.prev')}
          </button>
          <span className="footer-hint">{footer_hint ?? t('common.autosave')}</span>
          <button type="button" className="btn primary big" onClick={on_next} disabled={next_disabled}>
            {next_label ?? t('common.next')}
          </button>
        </>
      }
    >
      {children}
    </Shell>
  );
}
