// Shown instead of the app when the page is opened inside another site's frame (iframe). GitHub Pages cannot send
// a frame-ancestors header, so the app refuses to run there and only offers to open itself in a new window.
import { useT } from '../i18n';

/** True when this page is running inside a frame. */
export function is_in_frame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // A cross-origin parent can make window.top unreadable; that is a frame too.
    return true;
  }
}

export function FrameBlocked() {
  const t = useT();
  return (
    <main className="frame-blocked">
      <p>{t('frame.blocked')}</p>
      <a className="btn primary" href={window.location.href} target="_blank" rel="noopener noreferrer">
        {t('frame.open')}
      </a>
    </main>
  );
}
