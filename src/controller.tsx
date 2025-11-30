import React from 'react';
import ReactDOM from 'react-dom/client';
import { ControllerStudio } from './controller-studio/ControllerStudio';

// Mount React app
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ControllerStudio />
    </React.StrictMode>
  );
}
