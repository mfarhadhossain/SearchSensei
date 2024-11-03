import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

interface QueryHistory {
  query: string;
  isSensitive: boolean;
}

const Popup = () => {
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);

  useEffect(() => {
    // Fetch recent query history from Chrome storage
    chrome.storage.local.get(['queryHistory'], (result) => {
      if (result.queryHistory) {
        setQueryHistory(result.queryHistory);
      }
    });
  }, []);

  return (
    <div className="popup-container">
      <h1 className="popup-title">Search Sensei</h1>
      <div className="popup-content">
        <p>
          Your recent searches are checked for sensitivity in real-time. This
          information is stored locally for your reference.
        </p>
        {queryHistory.length > 0 ? (
          <ul className="query-list">
            {queryHistory.map((item, index) => (
              <li
                key={index}
                className={item.isSensitive ? 'sensitive' : 'non-sensitive'}
              >
                {item.query} -{' '}
                {item.isSensitive ? 'Sensitive' : 'Non-sensitive'}
              </li>
            ))}
          </ul>
        ) : (
          <p>No recent queries found.</p>
        )}
      </div>
    </div>
  );
};

const root = document.createElement('div');
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<Popup />);
