import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

const Popup = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    // Fetch the latest search query from Chrome storage
    chrome.storage.local.get(['lastSearchQuery'], (result) => {
      if (result.lastSearchQuery) {
        setSearchQuery(result.lastSearchQuery);
      }
    });

    // Listen for new search queries and update state
    const handleMessage = (message: { type: string; query: string }) => {
      if (message.type === 'SEARCH_QUERY') {
        setSearchQuery(message.query);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Clean up the listener when the component unmounts
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
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
