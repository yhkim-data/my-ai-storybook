// Terms of use and rights screen: the site's terms, then the statement in Korean and English that the maker owns the book.
import { terms_doc_url } from '../components/KeySafety';
import { DiLabBadge, MadeByLine, Shell } from '../components/Shell';
import { useT } from '../i18n';
import { useBook } from '../store/book_store';
import { useSettings } from '../store/settings_store';
import './RightsScreen.css';

/** Detailed rights docs; the one matching the UI language is opened. */
const RIGHTS_DOC_URL_KO = 'https://github.com/yhkim-data/my-ai-storybook/blob/main/docs/rights.ko.md';
const RIGHTS_DOC_URL_EN = 'https://github.com/yhkim-data/my-ai-storybook/blob/main/docs/rights.en.md';

const PARAGRAPH_KEYS = ['rights.fonts', 'rights.ai', 'rights.provider', 'rights.others'];
const TERMS_ITEM_KEYS = ['terms.item1', 'terms.item2', 'terms.item3', 'terms.item4', 'terms.item5', 'terms.item6', 'terms.item7'];

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

/** Terms of use, rights and licensing notice screen. */
export function RightsScreen() {
  const t = useT();
  const lang = useSettings((state) => state.lang);
  return (
    <Shell fit={false} header={<SideHeader title={t('rights.title')} />} footer={<MadeByLine />}>
      <h1 className="title-lg">{t('rights.title')}</h1>
      <section className="card stack" aria-labelledby="terms-heading">
        <h2 id="terms-heading" className="rights-subheading">
          {t('terms.heading')}
        </h2>
        <p className="hint">{t('terms.effective')}</p>
        <ol className="terms-list">
          {TERMS_ITEM_KEYS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ol>
        <div>
          <a className="btn" href={terms_doc_url(lang)} target="_blank" rel="noopener noreferrer">
            {t('terms.more')}
          </a>
        </div>
      </section>
      <h2 className="rights-subheading">{t('terms.rights_heading')}</h2>
      <p className="lead small">{t('rights.heading')}</p>
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
