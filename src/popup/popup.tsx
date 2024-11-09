import 'primereact/resources/themes/lara-light-cyan/theme.css';

import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { ListBox } from 'primereact/listbox';
import { Tag } from 'primereact/tag';

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

interface QueryHistory {
  query: string;
  isSensitive: boolean;
}

interface DataPoint {
  name: string;
  type: string;
  value: string;
}
const Popup = () => {
  const [queryHistory, setQueryHistory] = useState<QueryHistory[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState<boolean>(true);
  const [showDataMinimizationAlerts, setShowDataMinimizationAlerts] =
    useState<boolean>(false);
  const [personalDataPoints, setPersonalDataPoints] = useState<DataPoint[]>([]);

  useEffect(() => {
    // Fetch recent query history from Chrome storage
    chrome.storage.local.get(
      [
        'queryHistory',
        'showRecentSearches',
        'enableDataMinimization',
        'dataMinimizationAlert',
      ],
      (result) => {
        if (result.queryHistory) {
          setQueryHistory(result.queryHistory);
        }
        if (result.dataMinimizationAlert) {
          setPersonalDataPoints(result.dataMinimizationAlert);
        }
        setShowRecentSearches(result.showRecentSearches ?? true);
        setShowDataMinimizationAlerts(result.enableDataMinimization ?? false);
        // set warning count 0
        // chrome.action.setBadgeText({ text: '' });
        // chrome.storage.local.set({ discrepancyCount: 0 });
      }
    );
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
        {showDataMinimizationAlerts && personalDataPoints.length > 0 && (
          <div className="data-minimization-section">
            <h3>Data Minimization Alert</h3>
            <p>The following data may be unnecessary for your search:</p>
            <DataTable
              value={personalDataPoints}
              responsiveLayout="scroll"
              className="data-table"
            >
              <Column
                field="type"
                header="Type"
                style={{ width: '20%' }}
              ></Column>
              <Column
                field="name"
                header="Name"
                style={{ width: '20%' }}
              ></Column>
              <Column
                field="value"
                header="Value"
                style={{ width: '30%' }}
                body={(rowData: DataPoint) => (
                  <span className="masked-value">{rowData.value}</span>
                )}
              ></Column>
              <Column
                field="purpose"
                header="Purpose"
                style={{ width: '30%' }}
              ></Column>
            </DataTable>
            <p className="disclaimer">
              * The values are masked to protect your privacy.
            </p>
          </div>
        )}

        {showRecentSearches ? (
          <>
            <p>Your recent queries:</p>
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
          </>
        ) : (
          <p>Recent searches are disabled in options.</p>
        )}
      </Card>
    </div>
  );
};

const root = document.createElement('div');
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<Popup />);
