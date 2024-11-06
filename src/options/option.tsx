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

  useEffect(() => {
    chrome.storage.local.get(['sensitiveCategories'], (result) => {
      if (result.sensitiveCategories && result.sensitiveCategories.length > 0) {
        setSelectedCategories(result.sensitiveCategories);
      }
    });
  }, []);

  const onCategoryChange = (category: string) => {
    const updatedCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    setSelectedCategories(updatedCategories);
  };

  const savePreferences = () => {
    chrome.storage.local.set(
      { sensitiveCategories: selectedCategories },
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
