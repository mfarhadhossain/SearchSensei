import 'primeicons/primeicons.css';
import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/lara-light-cyan/theme.css';

import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Message } from 'primereact/message';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './option.css';

const CATEGORIES = [
  'Personal identification',
  'Financial information',
  'Biometric data',
  'Location data',
  'Health information',
  'Racial or ethnic origin',
  'Political opinions',
  'Religious beliefs',
  'Sexual orientation',
  'Trade-Union membership',
];

const Options = () => {
  const [selectedCategories, setSelectedCategories] =
    useState<string[]>(CATEGORIES);
  const [enableSanitization, setEnableSanitization] = useState<boolean>(false);
  const [enableDataMinimization, setEnableDataMinimization] =
    useState<boolean>(false);
  const [showRecentSearches, setShowRecentSearches] = useState<boolean>(true);

  useEffect(() => {
    chrome.storage.local.get(
      [
        'sensitiveCategories',
        'enableSanitization',
        'enableDataMinimization',
        'showRecentSearches',
      ],
      (result) => {
        if (
          result.sensitiveCategories &&
          result.sensitiveCategories.length > 0
        ) {
          setSelectedCategories(result.sensitiveCategories);
        }
        setEnableSanitization(result.enableSanitization || false);
        setEnableDataMinimization(result.enableDataMinimization || false);
        setShowRecentSearches(result.showRecentSearches ?? true);
      }
    );
  }, []);

  const onCategoryChange = (category: string) => {
    const updatedCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(updatedCategories);
  };

  const savePreferences = () => {
    chrome.storage.local.set(
      {
        sensitiveCategories: selectedCategories,
        enableSanitization,
        enableDataMinimization,
        showRecentSearches,
      },
      () => {
        alert('Preferences saved successfully!');
      }
    );
  };

  return (
    <div className="options-container">
      <Card title="Privacy Preferences" className="options-card">
        <p>Select the categories you consider sensitive:</p>
        {selectedCategories.length === CATEGORIES.length && (
          <Message
            severity="info"
            text="All categories are considered sensitive by default. You may deselect any that you do not consider sensitive."
            className="info-message"
          />
        )}
        <div className="category-list">
          {CATEGORIES.map((category) => (
            <div key={category} className="category-item">
              <Checkbox
                inputId={category}
                value={category}
                onChange={() => onCategoryChange(category)}
                checked={selectedCategories.includes(category)}
              />
              <label htmlFor={category} className="category-label">
                {category}
              </label>
            </div>
          ))}
        </div>
        <h3>Feature Options</h3>
        <div className="feature-toggle">
          <Checkbox
            inputId="enableSanitization"
            checked={enableSanitization}
            onChange={() => setEnableSanitization(!enableSanitization)}
          />
          <label htmlFor="enableSanitization" className="feature-label">
            Enable Query Sanitization
          </label>
        </div>
        <div className="feature-toggle">
          <Checkbox
            inputId="enableDataMinimization"
            checked={enableDataMinimization}
            onChange={() => setEnableDataMinimization(!enableDataMinimization)}
          />
          <label htmlFor="enableDataMinimization" className="feature-label">
            Enable Data Minimization Alert
          </label>
        </div>
        <div className="feature-toggle">
          <Checkbox
            inputId="showRecentSearches"
            checked={showRecentSearches}
            onChange={() => setShowRecentSearches(!showRecentSearches)}
          />
          <label htmlFor="showRecentSearches" className="feature-label">
            Show Recent Searches in Popup
          </label>
        </div>
        <Button
          label="Save Preferences"
          icon="pi pi-check"
          onClick={savePreferences}
          className="save-button"
        />
      </Card>
    </div>
  );
};

const root = document.createElement('div');
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<Options />);
