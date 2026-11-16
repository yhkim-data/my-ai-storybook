// Entry point: loads global styles and fonts, then starts autosave.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
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
