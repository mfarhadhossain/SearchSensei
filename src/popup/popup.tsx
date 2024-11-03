import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

const Popup = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    // Get the latest search query when popup opens
    chrome.storage.local.get(['lastSearchQuery'], (result) => {
      if (result.lastSearchQuery) {
        setSearchQuery(result.lastSearchQuery);
      }
    });

    // Listen for new search queries
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SEARCH_QUERY') {
        setSearchQuery(message.query);
      }
    });
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-2">Search Sensei</h1>
      <div className="bg-gray-100 p-3 rounded-lg">
        <h2 className="font-semibold mb-1">Latest Search Query:</h2>
        <p className="text-gray-700">{searchQuery || 'No recent searches'}</p>
      </div>
    </div>
  );
};

const root = document.createElement('div');
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<Popup />);
