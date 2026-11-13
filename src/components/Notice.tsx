// 안내 띠: 주의, 성공, 기다림, AI 오류와 다시 하기.
import { useEffect, useState, type ReactNode } from 'react';
import { useT, type TFunc } from '../i18n';
import { useSettings } from '../store/settings_store';
import { ProviderError, type ProviderErrorKind } from '../providers/types';

const MS_PER_SECOND = 1000;
/** 남은 시간을 다시 세는 간격(ms) */
const COUNTDOWN_TICK_MS = 500;
const ICON_SIZE = 22;

/**
 * 주의 아이콘 (동그라미 안 느낌표).
 */
function WarnIcon() {
  return (
    <svg aria-hidden="true" width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8.5" />
      <path d="M11 6.5v5.5M11 15.2v.3" />
    </svg>
  );
}

/**
 * 성공 아이콘 (체크).
 */
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
  /** 띠 오른쪽에 붙는 단추 */
  action?: ReactNode;
  /** 오류처럼 바로 읽어 줘야 하면 alert, 아니면 status */
  role?: 'alert' | 'status';
}

/**
 * 주의(주황) 또는 성공(초록) 안내 띠.
 */
export function Notice({ kind, children, action, role = 'status' }: NoticeProps) {
  return (
    <div className={`notice ${kind}`} role={role}>
      {kind === 'warn' ? <WarnIcon /> : <OkIcon />}
      <span className="notice-text">{children}</span>
      {action}
    </div>
  );
}

/**
 * 기다리는 동안 보여 주는 띠.
 */
export function Busy({ children }: { children: ReactNode }) {
  return (
    <div className="busy" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

/**
 * 던져진 값을 연결부 오류로 바꾼다. 연결부 오류가 아니면 unknown으로 본다.
 */
export function to_provider_error(cause: unknown): ProviderError {
  return cause instanceof ProviderError ? cause : new ProviderError('unknown', null, String(cause));
}

/**
 * 다시 쓸 수 있는 시각을 화면 언어에 맞는 시간 글로 바꾼다.
 */
function format_retry_time(retry_at: number, lang: string): string {
  return new Date(retry_at).toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * 오류 종류에 맞는 쉬운 문구를 만든다. "무슨 일이 생겼는지"와 "무엇을 누르면 되는지"를 한 문장씩 담는다.
 */
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
  /** 다시 하기 옆에 더 붙이는 단추 (예: 내가 직접 쓸게요) */
  extra_action?: ReactNode;
}

/**
 * AI 오류 안내. 잠깐 기다려야 하는 오류는 남은 시간을 세고, 시간이 되면 다시 하기 단추가 켜진다.
 */
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

  // 하루 한도와 틀린 키는 다시 눌러도 소용없으므로 다시 하기 단추를 두지 않는다.
  const can_retry = error.kind !== 'quota_daily' && error.kind !== 'bad_key' && error.kind !== 'no_permission';
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
