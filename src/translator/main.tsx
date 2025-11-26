import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './main.css'; // ✅ 使用包含自定义样式的 CSS
import 'katex/dist/katex.min.css'; // ✅ 数学公式样式

console.log('Translator main.tsx is executing');

const rootElement = document.getElementById('root');
console.log('Root element found:', !!rootElement);

if (!rootElement) {
  console.error('Root element not found in DOM');
  throw new Error('Root element not found');
}

console.log('Attempting to render React app');
try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
  console.log('React app rendered successfully');
} catch (error) {
  console.error('Error rendering React app:', error);
  throw error;
}