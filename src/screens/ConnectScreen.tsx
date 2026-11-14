// AI 연결하기 화면: 키를 받아 붙여넣고 연결을 확인한다. 키는 이 기기에만 저장하고 끝 4자리만 보여 준다.
import { useState, type KeyboardEvent } from 'react';
import { DiLabBadge, Shell } from '../components/Shell';
import { Notice } from '../components/Notice';
import { useT } from '../i18n';
import { create_text_provider_for_key } from '../providers/index';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from '../providers/gemini_config';
import {
  PROVIDER_INFO,
  PROVIDER_ORDER,
  detect_provider,
  resolve_image_model,
  resolve_text_model,
} from '../providers/provider_kinds';
import type { ProviderErrorKind } from '../providers/types';
import { useBook } from '../store/book_store';
import { effective_image_key, key_tail, useSettings } from '../store/settings_store';
import './ConnectScreen.css';

/** 그림 상자 안 그림의 좌표 크기 */
const ART_WIDTH = 240;
const ART_HEIGHT = 96;

/** 안내 띠에 보여 줄 결과 */
interface Message {
  kind: 'ok' | 'warn';
  text: string;
}

/**
 * 실패 이유를 안내 문구 키로 바꾼다.
 */
function failure_key(reason: ProviderErrorKind): string {
  if (reason === 'bad_key' || reason === 'no_permission') return 'connect.bad_key';
  if (reason === 'network') return 'connect.network';
  return 'connect.failed';
}

/**
 * 1번 그림: 창 모양 위에 새 창이 겹쳐 열리는 모습.
 */
function StepArtOpen({ label }: { label: string }) {
  return (
    <svg className="connect-step-art" role="img" aria-label={label} viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`}>
      <rect x="20" y="14" width="130" height="68" rx="8" fill="#FFFFFF" stroke="#8FA0BC" strokeWidth="2" />
      <path d="M20 30h130" stroke="#8FA0BC" strokeWidth="2" />
      <circle cx="32" cy="22" r="3" fill="#8FA0BC" />
      <rect x="100" y="26" width="116" height="58" rx="8" fill="#E3ECFB" stroke="#2459C4" strokeWidth="2.4" />
      <path d="M100 42h116" stroke="#2459C4" strokeWidth="2.4" />
      <path d="M190 54l10 0 0 10M200 54l-14 14" fill="none" stroke="#2459C4" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 2번 그림: 단추, 긴 글자 줄, 복사 표시.
 */
function StepArtCopy({ label }: { label: string }) {
  return (
    <svg className="connect-step-art" role="img" aria-label={label} viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`}>
      <rect x="16" y="10" width="64" height="24" rx="8" fill="#2459C4" />
      <path d="M30 22h36" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      <rect x="16" y="50" width="160" height="32" rx="8" fill="#FFFFFF" stroke="#8FA0BC" strokeWidth="2" />
      <path d="M28 66h90M126 66h38" stroke="#17233A" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="1 7" />
      <rect x="190" y="52" width="26" height="30" rx="5" fill="#E3ECFB" stroke="#2459C4" strokeWidth="2.2" />
      <rect x="198" y="46" width="26" height="30" rx="5" fill="#FFFFFF" stroke="#2459C4" strokeWidth="2.2" />
    </svg>
  );
}

/**
 * 3번 그림: 복사한 글자가 칸으로 들어가는 모습.
 */
function StepArtPaste({ label }: { label: string }) {
  return (
    <svg className="connect-step-art" role="img" aria-label={label} viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`}>
      <rect x="16" y="14" width="64" height="26" rx="6" fill="#E3ECFB" stroke="#2459C4" strokeWidth="2.2" />
      <path d="M26 27h44" stroke="#17233A" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="1 7" />
      <path d="M48 46v14M42 54l6 8 6-8" fill="none" stroke="#2459C4" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="16" y="66" width="208" height="20" rx="8" fill="#FFFFFF" stroke="#8FA0BC" strokeWidth="2.4" />
      <path d="M28 76h60" stroke="#17233A" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="1 7" />
    </svg>
  );
}

/**
 * 연결 화면 머리글: 처음으로, 가운데 이름, DI Lab 표시.
 */
function SideHeader({ title }: { title: string }) {
  const t = useT();
  const close_side = useBook((state) => state.close_side);
  return (
    <>
      <button type="button" className="back-link side-back" onClick={close_side}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4l-6 6 6 6" />
        </svg>
        {t('common.home')}
      </button>
      <span className="brand side-header-title">{title}</span>
      <DiLabBadge />
    </>
  );
}

/**
 * AI 연결하기 화면.
 */
export function ConnectScreen() {
  const t = useT();
  const close_side = useBook((state) => state.close_side);
  const text_key = useSettings((state) => state.text_key);
  const image_key = useSettings((state) => state.image_key);
  const text_model = useSettings((state) => state.text_model);
  const image_model = useSettings((state) => state.image_model);
  const usage_count = useSettings((state) => state.usage_count);
  const set_text_key = useSettings((state) => state.set_text_key);
  const set_image_key = useSettings((state) => state.set_image_key);
  const set_text_model = useSettings((state) => state.set_text_model);
  const set_image_model = useSettings((state) => state.set_image_model);
  const clear_keys = useSettings((state) => state.clear_keys);

  const [key_input, set_key_input] = useState('');
  const [image_key_input, set_image_key_input] = useState('');
  const [is_checking, set_is_checking] = useState(false);
  const [message, set_message] = useState<Message | null>(null);
  const [image_message, set_image_message] = useState<Message | null>(null);

  /**
   * 키를 확인한다. 맞으면 on_ok로 저장하고 입력 칸을 비운 뒤 결과를 알린다. 틀리면 저장하지 않는다.
   */
  const check_key = async (
    raw_key: string,
    for_image: boolean,
    on_ok: (key: string) => void,
    clear_input: () => void,
    show: (message: Message) => void,
  ) => {
    const key = raw_key.trim();
    if (!key) {
      show({ kind: 'warn', text: t('connect.empty') });
      return;
    }
    const info = PROVIDER_INFO[detect_provider(key)];
    if (for_image && info.image_model === null) {
      show({ kind: 'warn', text: t('connect.image_key_claude') });
      return;
    }
    set_is_checking(true);
    try {
      const result = await create_text_provider_for_key(key).testConnection();
      if (result.ok) {
        on_ok(key);
        clear_input();
        show({ kind: 'ok', text: t('connect.ok', { name: info.label, tail: key_tail(key) }) });
      } else {
        show({ kind: 'warn', text: t(failure_key(result.reason)) });
      }
    } catch {
      show({ kind: 'warn', text: t('connect.failed') });
    } finally {
      set_is_checking(false);
    }
  };

  /** 글용 키 확인 */
  const handle_check = () => check_key(key_input, false, set_text_key, () => set_key_input(''), set_message);
  /** 그림용 키 확인 */
  const handle_check_image = () => check_key(image_key_input, true, set_image_key, () => set_image_key_input(''), set_image_message);

  /** Enter를 누르면 확인한다. */
  const handle_enter = (event: KeyboardEvent<HTMLInputElement>, action: () => Promise<void>) => {
    if (event.key === 'Enter' && !is_checking) {
      event.preventDefault();
      void action();
    }
  };

  /** 키를 모두 지운다. */
  const handle_clear = () => {
    clear_keys();
    set_message({ kind: 'ok', text: t('connect.cleared') });
    set_image_message(null);
  };

  /** AI 종류를 처음 값으로 되돌린다. */
  const handle_reset_kinds = () => {
    set_text_model(DEFAULT_TEXT_MODEL);
    set_image_model(DEFAULT_IMAGE_MODEL);
  };

  /** 저장된 키를 "회사 이름과 끝자리"로 알리는 안내를 만든다. */
  const saved_message = (key: string): Message | null =>
    key ? { kind: 'ok', text: t('connect.saved_tail', { name: PROVIDER_INFO[detect_provider(key)].label, tail: key_tail(key) }) } : null;

  const shown_message: Message | null = message ?? saved_message(text_key);
  const shown_image_message: Message | null = image_message ?? saved_message(image_key);

  // AI 종류 목록은 저장된 키의 회사에 맞춘다. 키가 없으면 Gemini 목록을 보여 준다.
  const text_info = PROVIDER_INFO[detect_provider(text_key)];
  const image_info = PROVIDER_INFO[detect_provider(effective_image_key({ text_key, image_key }))];
  const shown_text_model = resolve_text_model(text_info.kind, text_model);
  const shown_image_model = resolve_image_model(image_info.kind, image_model);
  const has_no_image_ai = text_key !== '' && shown_image_model === null;

  return (
    <Shell width="wide" header={<SideHeader title={t('connect.title')} />}>
      <div className="stack tight">
        <h1 className="title-lg">{t('connect.heading')}</h1>
        <p className="lead small">{t('connect.lead')}</p>
      </div>

      <ol className="grid-3 connect-steps">
        <li className="card">
          <span className="connect-step-num" aria-hidden="true">1</span>
          <strong className="connect-step-title">{t('connect.step1.title')}</strong>
          <span className="connect-step-body">{t('connect.step1.body')}</span>
          <StepArtOpen label={t('connect.step1.alt')} />
          <div className="connect-step-links">
            {PROVIDER_ORDER.map((kind) => (
              <a key={kind} className="btn outline connect-step-link" href={PROVIDER_INFO[kind].key_page_url} target="_blank" rel="noopener noreferrer">
                {PROVIDER_INFO[kind].label}
              </a>
            ))}
          </div>
        </li>
        <li className="card">
          <span className="connect-step-num" aria-hidden="true">2</span>
          <strong className="connect-step-title">{t('connect.step2.title')}</strong>
          <span className="connect-step-body">{t('connect.step2.body')}</span>
          <StepArtCopy label={t('connect.step2.alt')} />
        </li>
        <li className="card">
          <span className="connect-step-num" aria-hidden="true">3</span>
          <strong className="connect-step-title">{t('connect.step3.title')}</strong>
          <span className="connect-step-body">{t('connect.step3.body')}</span>
          <StepArtPaste label={t('connect.step3.alt')} />
        </li>
      </ol>

      <section className="card connect-key-card">
        <label htmlFor="key-input" className="field-label small connect-key-label">
          {t('connect.key_label')}
        </label>
        <div className="connect-key-row">
          <input
            id="key-input"
            type="password"
            autoComplete="off"
            className="text-input"
            placeholder={t('connect.key_placeholder')}
            value={key_input}
            onChange={(event) => set_key_input(event.target.value)}
            onKeyDown={(event) => handle_enter(event, handle_check)}
          />
          <button type="button" className="btn primary big" onClick={() => void handle_check()} disabled={is_checking}>
            {is_checking ? t('connect.checking') : t('connect.check')}
          </button>
        </div>
        {shown_message && (
          <Notice kind={shown_message.kind} role={shown_message.kind === 'warn' ? 'alert' : 'status'}>
            {shown_message.text}
          </Notice>
        )}
        {has_no_image_ai && (
          <Notice kind="warn" role="status">
            {t('connect.no_image')}
          </Notice>
        )}

        <details className="connect-details">
          <summary>{t('connect.details')}</summary>
          <div className="connect-details-body">
            <div className="connect-field">
              <label htmlFor="image-key-input" className="field-label small">
                {t('connect.image_key_label')}
              </label>
              <div className="connect-key-row">
                <input
                  id="image-key-input"
                  type="password"
                  autoComplete="off"
                  className="text-input"
                  placeholder={t('connect.image_key_placeholder')}
                  value={image_key_input}
                  onChange={(event) => set_image_key_input(event.target.value)}
                  onKeyDown={(event) => handle_enter(event, handle_check_image)}
                />
                <button type="button" className="btn" onClick={() => void handle_check_image()} disabled={is_checking}>
                  {t('connect.image_key_save')}
                </button>
              </div>
              {shown_image_message && (
                <Notice kind={shown_image_message.kind} role={shown_image_message.kind === 'warn' ? 'alert' : 'status'}>
                  {shown_image_message.text}
                </Notice>
              )}
            </div>
            <div className="connect-field">
              <label htmlFor="text-model-select" className="field-label small">
                {t('connect.text_kind_label')}
              </label>
              <select id="text-model-select" className="select" value={shown_text_model} onChange={(event) => set_text_model(event.target.value)}>
                {text_info.text_choices.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            </div>
            {shown_image_model !== null && (
              <div className="connect-field">
                <label htmlFor="image-model-select" className="field-label small">
                  {t('connect.image_kind_label')}
                </label>
                <select id="image-model-select" className="select" value={shown_image_model} onChange={(event) => set_image_model(event.target.value)}>
                  {image_info.image_choices.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="hint">{t('connect.kind_hint')}</p>
            <div>
              <button type="button" className="btn" onClick={handle_reset_kinds}>
                {t('connect.kind_reset')}
              </button>
            </div>
          </div>
        </details>
      </section>

      <div className="row spread">
        <div className="stack tight connect-notes">
          <span>{t('connect.age_line')}</span>
          <span>{t('connect.cost_line')}</span>
          <span data-testid="usage-line">
            {t('connect.shared_line')} {t('connect.usage', { n: usage_count })}
          </span>
        </div>
        <div className="connect-actions">
          <button type="button" className="btn danger" onClick={handle_clear}>
            {t('connect.clear')}
          </button>
          <button type="button" className="btn" onClick={close_side}>
            {t('connect.skip')}
          </button>
        </div>
      </div>
    </Shell>
  );
}
