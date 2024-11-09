import React from 'react';
import ReactDOM from 'react-dom/client';
const ContentScriptApp = () => {
  console.log('ContentScriptApp rendered'); // Debug log

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '20px',
        background: 'white',
        border: '2px solid red',
        zIndex: 9999,
        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
      }}
    >
      <h1>Search Sensei</h1>
      <p>If you can see this, the content script is working!</p>
    </div>
  );
};
const root = document.createElement('div');
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<ContentScriptApp />);
