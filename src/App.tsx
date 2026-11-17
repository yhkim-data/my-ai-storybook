// Screen switching is driven by the store's `screen` value, not by URL routing.
import { useEffect } from 'react';
import { IdleGuard, KeyPromptDialog } from './components/KeySafety';
import { useT } from './i18n';
import { ConnectScreen } from './screens/ConnectScreen';
import { EditorScreen } from './screens/EditorScreen';
import { FinishScreen } from './screens/FinishScreen';
import { PagesScreen } from './screens/PagesScreen';
import { PicturesScreen } from './screens/PicturesScreen';
import { PlotScreen } from './screens/PlotScreen';
import { RightsScreen } from './screens/RightsScreen';
import { SeedScreen } from './screens/SeedScreen';
import { StartScreen } from './screens/StartScreen';
import { StyleScreen } from './screens/StyleScreen';
import { useBook } from './store/book_store';
import type { Screen } from './types';

/** Screens that work without a book loaded. */
const SCREENS_WITHOUT_BOOK: Screen[] = ['start', 'connect', 'rights'];

function pick_screen(screen: Screen) {
  switch (screen) {
    case 'start':
      return <StartScreen />;
    case 'connect':
      return <ConnectScreen />;
    case 'rights':
      return <RightsScreen />;
    case 'seed':
      return <SeedScreen />;
    case 'plot':
      return <PlotScreen />;
    case 'pages':
      return <PagesScreen />;
    case 'style':
      return <StyleScreen />;
    case 'pictures':
      return <PicturesScreen />;
    case 'editor':
      return <EditorScreen />;
    case 'finish':
      return <FinishScreen />;
  }
}

/** Root component. */
export function App() {
  const t = useT();
  const screen = useBook((state) => state.screen);
  const has_book = useBook((state) => state.book !== null);
  // A step screen without a book falls back to the start screen.
  const shown_screen = !has_book && !SCREENS_WITHOUT_BOOK.includes(screen) ? 'start' : screen;

  useEffect(() => {
    document.title = t('app.name');
  }, [t]);

  return (
    <>
      {pick_screen(shown_screen)}
      <KeyPromptDialog />
      <IdleGuard />
    </>
  );
}
