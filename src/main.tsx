// Entry point: loads global styles and fonts, starts autosave, then fetches the sample art.
// Inside another site's frame it shows only a "open in a new window" message and does not start the app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { FrameBlocked, is_in_frame } from './components/FrameBlocked';
import { load_scene_art } from './art/scenes';
import { start_autosave } from './storage/autosave';
import { useSettings } from './store/settings_store';
import './styles/global.css';

document.documentElement.lang = useSettings.getState().lang;
const in_frame = is_in_frame();

const root_element = document.getElementById('root');
if (root_element) {
  createRoot(root_element).render(<StrictMode>{in_frame ? <FrameBlocked /> : <App />}</StrictMode>);
}

if (!in_frame) {
  start_autosave();
  // The sample art is not needed for the first screen, so fetch it after start-up.
  load_scene_art().catch(() => undefined);
}
