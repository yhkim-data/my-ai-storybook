// Connect screen. The key is kept only in this window's memory (never saved) and only its last 4 characters are shown.
import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { OwnKeyCheck, useKeyCheck, type KeyMessage } from '../components/KeySafety';
import { DiLabBadge, Shell } from '../components/Shell';
import { Notice } from '../components/Notice';
import { useT } from '../i18n';
import { DEFAULT_IMAGE_MODEL, DEFAULT_TEXT_MODEL } from '../providers/gemini_config';
import { PROVIDER_INFO, PROVIDER_ORDER, detect_provider, resolve_image_model, resolve_text_model } from '../providers/provider_kinds';
import { IDLE_MINUTES_MAX, IDLE_MINUTES_MIN } from '../constants';
import { SETTINGS_FILE_NAMES, SettingsFileError, build_settings_file, parse_settings_file } from '../storage/settings_file';
import { download_blob } from '../storage/book_file';
import { useBook } from '../store/book_store';
import { CONNECTION_LABEL_MAX_LENGTH, effective_image_key, key_tail, useSettings } from '../store/settings_store';
import './ConnectScreen.css';

/** SVG viewBox size of the step illustrations. */
const ART_WIDTH = 240;
const ART_HEIGHT = 96;

/** Step 1 art: a new window opening over another. */
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

/** Step 2 art: a button, a long key string and a copy icon. */
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

/** Step 3 art: the copied key going into the input. */
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

/** Screen for pasting and checking an AI provider key. */
export function ConnectScreen() {
  const t = useT();
  const close_side = useBook((state) => state.close_side);
  const open_side = useBook((state) => state.open_side);
  const text_key = useSettings((state) => state.text_key);
  const image_key = useSettings((state) => state.image_key);
  const text_model = useSettings((state) => state.text_model);
  const image_model = useSettings((state) => state.image_model);
  const usage_count = useSettings((state) => state.usage_count);
  const set_text_model = useSettings((state) => state.set_text_model);
  const set_image_model = useSettings((state) => state.set_image_model);
  const clear_keys = useSettings((state) => state.clear_keys);
  const { check, is_checking } = useKeyCheck();
  const text_connection = useSettings((state) => state.connections.find((item) => item.id === state.text_connection));
  const idle_minutes = useSettings((state) => state.idle_minutes);
  const settings_input_ref = useRef<HTMLInputElement>(null);
  const [file_message, set_file_message] = useState<KeyMessage[]>([]);
  /** The minutes box keeps what is typed and keeps it in range when the box is left. */
  const [idle_draft, set_idle_draft] = useState<string | null>(null);

  const [key_input, set_key_input] = useState('');
  const [image_key_input, set_image_key_input] = useState('');
  const [is_owned, set_owned] = useState(false);
  const [message, set_message] = useState<KeyMessage | null>(null);
  const [image_message, set_image_message] = useState<KeyMessage | null>(null);

  /** Checks the key; it is connected only when the check succeeds, and the input is emptied then. */
  const handle_check = async () => {
    const result = await check(key_input, 'text', is_owned);
    set_message(result);
    if (result.kind === 'ok') set_key_input('');
  };
  const handle_check_image = async () => {
    const result = await check(image_key_input, 'image', is_owned);
    set_image_message(result);
    if (result.kind === 'ok') set_image_key_input('');
  };

  const handle_enter = (event: KeyboardEvent<HTMLInputElement>, action: () => Promise<void>) => {
    if (event.key === 'Enter' && !is_checking) {
      event.preventDefault();
      void action();
    }
  };

  const handle_clear = () => {
    clear_keys();
    set_message({ kind: 'ok', text: t('connect.cleared') });
    set_image_message(null);
  };

  /** Saves language, connections (no keys), the picture limit and the away time to a file. */
  const handle_save_settings = () => {
    const state = useSettings.getState();
    download_blob(new Blob([build_settings_file(state)], { type: 'application/json' }), SETTINGS_FILE_NAMES[state.lang]);
    set_file_message([]);
  };

  /** Loads a settings file; any key in it is thrown away and the user is told. */
  const handle_load_settings = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const { settings, had_key } = parse_settings_file(await file.text());
      useSettings.getState().load_settings(settings);
      const messages: KeyMessage[] = [{ kind: 'ok', text: t('settings_file.loaded') }];
      if (had_key) messages.push({ kind: 'warn', text: t('settings_file.had_key') });
      set_file_message(messages);
    } catch (cause) {
      const too_big = cause instanceof SettingsFileError && cause.message === 'too_big';
      set_file_message([{ kind: 'warn', text: t(too_big ? 'settings_file.too_big' : 'settings_file.bad') }]);
    }
  };

  const handle_reset_kinds = () => {
    set_text_model(DEFAULT_TEXT_MODEL);
    set_image_model(DEFAULT_IMAGE_MODEL);
  };

  /** Describes a connected key by provider name and last characters only. */
  const saved_message = (key: string): KeyMessage | null =>
    key ? { kind: 'ok', text: t('connect.saved_tail', { name: PROVIDER_INFO[detect_provider(key)].label, tail: key_tail(key) }) } : null;

  const shown_message: KeyMessage | null = message ?? saved_message(text_key);
  const shown_image_message: KeyMessage | null = image_message ?? saved_message(image_key);

  // Model lists follow the connected key's provider; with no key, the Gemini lists are shown.
  const text_info = PROVIDER_INFO[detect_provider(text_key)];
  const image_info = PROVIDER_INFO[detect_provider(effective_image_key({ text_key, image_key }))];
  const shown_text_model = resolve_text_model(text_info.kind, text_model);
  const shown_image_model = resolve_image_model(image_info.kind, image_model);
  const has_no_image_ai = text_key !== '' && shown_image_model === null;

  return (
    <Shell width="wide" fit={false} header={<SideHeader title={t('connect.title')} />}>
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
        <OwnKeyCheck checked={is_owned} on_change={set_owned} on_terms={() => open_side('rights')} />
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
            {text_connection && (
              <div className="connect-field">
                <label htmlFor="connection-label" className="field-label small">
                  {t('connect.label_label')}
                </label>
                <input
                  id="connection-label"
                  type="text"
                  className="text-input"
                  maxLength={CONNECTION_LABEL_MAX_LENGTH}
                  value={text_connection.label}
                  onChange={(event) => useSettings.getState().set_connection_label(text_connection.id, event.target.value)}
                />
              </div>
            )}
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
              <select id="text-model-select" className="select" value={shown_text_model} disabled={!text_key} onChange={(event) => set_text_model(event.target.value)}>
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
                <select
                  id="image-model-select"
                  className="select"
                  value={shown_image_model}
                  disabled={!effective_image_key({ text_key, image_key })}
                  onChange={(event) => set_image_model(event.target.value)}
                >
                  {image_info.image_choices.map((choice) => (
                    <option key={choice} value={choice}>
                      {choice}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="hint">{t(text_key ? 'connect.kind_hint' : 'connect.kind_need_key')}</p>
            <div>
              <button type="button" className="btn" onClick={handle_reset_kinds}>
                {t('connect.kind_reset')}
              </button>
            </div>
            <div className="connect-field">
              <label htmlFor="idle-minutes" className="field-label small">
                {t('connect.idle_label', { min: IDLE_MINUTES_MIN, max: IDLE_MINUTES_MAX })}
              </label>
              <input
                id="idle-minutes"
                type="number"
                className="text-input connect-idle"
                min={IDLE_MINUTES_MIN}
                max={IDLE_MINUTES_MAX}
                value={idle_draft ?? String(idle_minutes)}
                onChange={(event) => set_idle_draft(event.target.value)}
                onBlur={() => {
                  if (idle_draft !== null) useSettings.getState().set_idle_minutes(Number(idle_draft));
                  set_idle_draft(null);
                }}
              />
            </div>
          </div>
        </details>
      </section>

      <section className="card connect-file-card">
        <strong>{t('settings_file.title')}</strong>
        <p className="hint">{t('settings_file.desc')}</p>
        <div className="row">
          <button type="button" className="btn" onClick={handle_save_settings}>
            {t('settings_file.save')}
          </button>
          <button type="button" className="btn" onClick={() => settings_input_ref.current?.click()}>
            {t('settings_file.load')}
          </button>
          <input
            ref={settings_input_ref}
            type="file"
            accept=".json,application/json"
            hidden
            data-testid="settings-file-input"
            onChange={(event) => void handle_load_settings(event)}
          />
        </div>
        {file_message.map((item) => (
          <Notice key={item.text} kind={item.kind} role={item.kind === 'warn' ? 'alert' : 'status'}>
            {item.text}
          </Notice>
        ))}
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
