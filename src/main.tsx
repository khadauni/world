import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import './ui/global.css';
import { LazyMotion, domAnimation } from 'motion/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { registerOfflineSupport } from './core/offline';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      {/* LazyMotion + `m` components ship only the animation features we use (smaller first load). */}
      <LazyMotion features={domAnimation}>
        <App />
      </LazyMotion>
    </StrictMode>,
  );
}

registerOfflineSupport();
