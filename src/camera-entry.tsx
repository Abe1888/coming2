import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CameraPage from './CameraPage.tsx';

createRoot(document.getElementById('camera-root')!).render(
  <StrictMode>
    <CameraPage />
  </StrictMode>,
);
