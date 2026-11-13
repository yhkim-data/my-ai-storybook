// 모든 화면이 함께 쓰는 틀: 머리글, 단계 점, DI Lab 표시, 바닥글 단추.
import type { ReactNode } from 'react';
import { STEP_SCREENS } from '../constants';
import { useT } from '../i18n';
import type { Screen } from '../types';

/** 책 모양 아이콘의 한 변 길이(px) */
const BOOK_ICON_SIZE = 32;

/**
 * 머리글 오른쪽에 들어가는 DI Lab 글자 표시.
 */
export function DiLabBadge() {
  return <span className="dilab-badge">DI Lab</span>;
}

/**
 * 바닥글에 들어가는 "만든 곳 DI Lab · Data Insight Lab".
 */
export function MadeByLine() {
  const t = useT();
  return (
    <span>
      {t('common.made_by')} <strong>DI Lab</strong> · Data Insight Lab
    </span>
  );
}

/**
 * 앱 이름. with_icon이면 책 아이콘을 함께 보여 준다.
 */
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

/**
 * 단계 화면의 번호(1~8)를 돌려준다.
 */
export function step_number(screen: Screen): number {
  return STEP_SCREENS.indexOf(screen) + 1;
}

/**
 * 진행 단계를 점으로 보여 준다. 지금 단계는 길쭉한 점이다.
 */
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
  /** 본문 너비: 기본 960, wide 1120, wider 1200 */
  width?: 'normal' | 'wide' | 'wider';
  compact_header?: boolean;
  children: ReactNode;
}

/**
 * 화면 틀: 머리글, 본문, 바닥글.
 */
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
  /** 다음 단추 글. 없으면 "다음" */
  next_label?: string;
  next_disabled?: boolean;
  /** 바닥글 가운데 안내. 없으면 자동 저장 안내 */
  footer_hint?: ReactNode;
  width?: 'normal' | 'wide' | 'wider';
  children: ReactNode;
}

/**
 * 2~6단계가 함께 쓰는 틀: 앱 이름, 단계 점, DI Lab 표시, 이전·다음 단추.
 */
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
