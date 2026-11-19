import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import '@fontsource-variable/archivo';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/global.css';
import { initAnalytics } from './lib/analytics';
import { router } from './router';

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
