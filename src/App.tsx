// 지금 화면 이름에 맞는 화면을 보여 준다. 주소 이동 없이 저장소의 screen 값으로 바꾼다.
import { useEffect } from 'react';
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

/** 책이 없어도 볼 수 있는 화면 */
const SCREENS_WITHOUT_BOOK: Screen[] = ['start', 'connect', 'rights'];

/**
 * 화면 이름에 맞는 화면 부품을 고른다.
 */
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

/**
 * 앱의 뿌리 부품.
 */
export function App() {
  const t = useT();
  const screen = useBook((state) => state.screen);
  const has_book = useBook((state) => state.book !== null);
  // 책 없이 단계 화면에 있으면 시작 화면으로 돌려보낸다.
  const shown_screen = !has_book && !SCREENS_WITHOUT_BOOK.includes(screen) ? 'start' : screen;

  useEffect(() => {
    document.title = t('app.name');
  }, [t]);

  return pick_screen(shown_screen);
}
