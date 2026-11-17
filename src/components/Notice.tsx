// Notice banners: warning, success, busy, and AI errors with retry.
import { useEffect, useState, type ReactNode } from 'react';
import { useT, type TFunc } from '../i18n';
import { useSettings } from '../store/settings_store';
import { ProviderError, type ProviderErrorKind } from '../providers/types';

const MS_PER_SECOND = 1000;
/** Countdown refresh interval (ms). */
const COUNTDOWN_TICK_MS = 500;
const ICON_SIZE = 22;
/** Errors where retrying cannot help (daily quota, bad key, setup problems), so no retry button. */
const NO_RETRY_KINDS: ProviderErrorKind[] = ['quota_daily', 'bad_key', 'no_permission', 'browser_blocked', 'limit', 'practice_edit'];

function WarnIcon() {
  return (
    <svg aria-hidden="true" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M11 6.5v5.5M11 15.2v.3" />
    </svg>
  );
}

function OkIcon() {
  return (
    <svg aria-hidden="true" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11l5 5 9-10" />
    </svg>
  );
}

interface NoticeProps {
  kind: 'warn' | 'ok';
  children: ReactNode;
  action?: ReactNode;
  /** Use alert for errors that screen readers must announce at once. */
  role?: 'alert' | 'status';
}

/** Warning (orange) or success (green) banner. */
export function Notice({ kind, children, action, role = 'status' }: NoticeProps) {
  return (
    <div className={`notice ${kind}`} role={role}>
      {kind === 'warn' ? <WarnIcon /> : <OkIcon />}
      <span className="notice-text">{children}</span>
      {action}
    </div>
  );
}

/** Banner with a spinner, shown while waiting. */
export function Busy({ children }: { children: ReactNode }) {
  return (
    <div className="busy" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/** Wraps any thrown value as a ProviderError; non-provider errors become 'unknown'. */
export function to_provider_error(cause: unknown): ProviderError {
  return cause instanceof ProviderError ? cause : new ProviderError('unknown', null, String(cause));
}

function format_retry_time(retry_at: number, lang: string): string {
  return new Date(retry_at).toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Plain-language error text: one sentence on what happened, one on what to do next. */
export function error_message(t: TFunc, kind: ProviderErrorKind, retry_at: number | null, seconds_left: number, lang: string): string {
  if (kind === 'quota_daily') {
    return t('error.quota_daily', { time: retry_at ? format_retry_time(retry_at, lang) : '' });
  }
  if (kind === 'rate') return t('error.rate', { seconds: seconds_left });
  return t(`error.${kind}`);
}

interface AiErrorNoticeProps {
  error: ProviderError;
  on_retry: () => void;
  /** Extra button next to retry, e.g. "I'll write it myself". */
  extra_action?: ReactNode;
}

/** AI error banner. For rate limits it counts down and enables retry when time is up. */
export function AiErrorNotice({ error, on_retry, extra_action }: AiErrorNoticeProps) {
  const t = useT();
  const lang = useSettings((state) => state.lang);
  const [now, set_now] = useState(() => Date.now());
  const is_rate = error.kind === 'rate' && error.retry_at !== null;
  const seconds_left = is_rate ? Math.max(0, Math.ceil(((error.retry_at ?? 0) - now) / MS_PER_SECOND)) : 0;

  useEffect(() => {
    if (!is_rate) return undefined;
    const timer = setInterval(() => set_now(Date.now()), COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, [is_rate, error]);

  const can_retry = !NO_RETRY_KINDS.includes(error.kind);
  return (
    <Notice
      kind="warn"
      role="alert"
      action={
        <>
          {can_retry && (
            <button type="button" className="btn small" onClick={on_retry} disabled={seconds_left > 0}>
              {seconds_left > 0 ? t('error.retry_wait', { seconds: seconds_left }) : t('error.retry')}
            </button>
          )}
          {extra_action}
        </>
      }
    >
      {error_message(t, error.kind, error.retry_at, seconds_left, lang)}
    </Notice>
  );
}
