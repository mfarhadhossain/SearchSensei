import 'primereact/resources/themes/lara-light-cyan/theme.css';

import { Card, ListBox, Tag } from 'primereact';
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

  const renderQueryItem = (item: QueryHistory) => (
    <div className="query-item">
      <span className="query-text">{item.query}</span>
      <Tag
        value={item.isSensitive ? 'Sensitive' : 'Non-Sensitive'}
        severity={item.isSensitive ? 'danger' : 'success'}
        className="query-tag"
      />
    </div>
  );

  return (
    <div className="popup-container">
      <Card title="Search Sensei" className="popup-card">
        <p className="popup-description">
          Recent searches are stored locally for your reference.
        </p>
        {queryHistory.length > 0 ? (
          <ListBox
            value={null}
            options={queryHistory}
            optionLabel="query"
            itemTemplate={renderQueryItem}
            className="query-listbox"
          />
        ) : (
          <p>No recent queries found.</p>
        )}
      </Card>
    </div>
  );
};

const root = document.createElement('div');
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<Popup />);
