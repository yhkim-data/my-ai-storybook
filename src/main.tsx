// Entry point: loads global styles and fonts, starts autosave, then fetches the sample art.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { load_scene_art } from './art/scenes';
import { start_autosave } from './storage/autosave';
import { useSettings } from './store/settings_store';
import './styles/global.css';

document.documentElement.lang = useSettings.getState().lang;
start_autosave();

const root_element = document.getElementById('root');
if (root_element) {
  createRoot(root_element).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// The sample art is not needed for the first screen, so fetch it after start-up.
load_scene_art().catch(() => undefined);
