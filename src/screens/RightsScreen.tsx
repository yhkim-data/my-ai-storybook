// 권리 안내 화면: 만든 책의 권리는 만든 사람에게 있다는 안내를 한국어와 영어로 함께 보여 준다.
import { DiLabBadge, MadeByLine, Shell } from '../components/Shell';
import { useT } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import './RightsScreen.css';

/** 자세한 안내 문서 주소 (화면 언어에 맞는 쪽을 연다) */
const RIGHTS_DOC_URL_KO = 'https://github.com/yhkim-data/my-ai-storybook/blob/main/docs/rights.ko.md';
const RIGHTS_DOC_URL_EN = 'https://github.com/yhkim-data/my-ai-storybook/blob/main/docs/rights.en.md';

/** 아래 문단들의 문구 키 */
const PARAGRAPH_KEYS = ['rights.fonts', 'rights.ai', 'rights.provider', 'rights.others'];

/**
 * 머리글: 처음으로, 가운데 이름, DI Lab 표시.
 */
function SideHeader({ title }: { title: string }) {
  const t = useT();
  const close_side = useBook((state) => state.close_side);
  return (
    <>
      <button type="button" className="back-link" onClick={close_side}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4l-6 6 6 6" />
        </svg>
        {t('common.home')}
      </button>
      <span className="brand rights-header-title">{title}</span>
      <DiLabBadge />
    </>
  );
}

/**
 * 권리 안내 화면.
 */
export function RightsScreen() {
  const t = useT();
  const lang = useSettings((state) => state.lang);
  return (
    <Shell header={<SideHeader title={t('rights.title')} />} footer={<MadeByLine />}>
      <h1 className="title-lg">{t('rights.heading')}</h1>
      <section className="card stack loose">
        <p lang="ko" className="rights-statement">
          {t('rights.statement.ko')}
        </p>
        <p lang="en" className="rights-statement">
          {t('rights.statement.en')}
        </p>
      </section>
      <div className="stack loose">
        {PARAGRAPH_KEYS.map((key) => (
          <p key={key} className="hint rights-paragraph">
            {t(key)}
          </p>
        ))}
      </div>
      <div>
        <a className="btn" href={lang === 'en' ? RIGHTS_DOC_URL_EN : RIGHTS_DOC_URL_KO} target="_blank" rel="noopener noreferrer">
          {t('rights.more')}
        </a>
      </div>
    </Shell>
  );
}
