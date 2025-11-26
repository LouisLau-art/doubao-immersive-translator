import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './main.css'; // ✅ 使用包含自定义样式的 CSS
import 'katex/dist/katex.min.css'; // ✅ 数学公式样式

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);