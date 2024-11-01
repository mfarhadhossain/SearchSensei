import React from 'react';
import ReactDOM from 'react-dom/client';

const test = <p>Hello World!</p>;

const root = document.createElement('div');
document.body.appendChild(root);

const reactRoot = ReactDOM.createRoot(root);
reactRoot.render(test);
