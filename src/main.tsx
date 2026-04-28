import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// 申请持久化存储（Chrome/Edge 支持，Safari 忽略）
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {/* ignore */});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
