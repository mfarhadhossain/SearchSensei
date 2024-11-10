import 'primeicons/primeicons.css';
import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/lara-light-cyan/theme.css';

import PrimeReact from 'primereact/api';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Checkbox } from 'primereact/checkbox';
import { Message } from 'primereact/message';
import { Toast } from 'primereact/toast';
import { Tooltip } from 'primereact/tooltip';
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './option.css';

const CATEGORIES = [
  {
    name: 'Personal identification',
    description:
      'Name, address, email, phone number, ID, online identity (e.g., usernames, IP addresses, passwords).',
  },
  {
    name: 'Financial information',
    description:
      'Details such as bank accounts, credit cards, investment records, salary information, and other financial activities.',
  },
  {
    name: 'Biometric data',
    description:
      'Data derived from biometric identifiers, including fingerprints, facial recognition data, retinal scans, voice patterns, and other unique physical characteristics.',
  },
  {
    name: 'Location data',
    description:
      'Geographical information such as city, state, country, specific addresses, and places like landmarks or named infrastructures (e.g., bus stops, bridges).',
  },
  {
    name: 'Health information',
    description:
      'Information related to an individual’s health status, medical history, treatment records, and health insurance data.',
  },
  {
    name: 'Racial or ethnic origin',
    description:
      'Attributes describing a person’s race, ethnicity, nationality, heritage, or descent.',
  },
  {
    name: 'Political opinions',
    description:
      'Expressions of political beliefs or affiliations, including support for political groups or ideologies.',
  },
  {
    name: 'Religious beliefs',
    description:
      'Details related to an individual’s religious beliefs, affiliations, or participation in religious activities.',
  },
  {
    name: 'Sexual orientation',
    description:
      'Information on an individual’s sexual orientation, preferences, or gender identity.',
  },
  {
    name: 'Trade-Union membership',
    description:
      'Affiliation or membership information regarding trade unions, professional associations, or worker’s unions.',
  },
];

const Options = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    CATEGORIES.map((c) => c.name)
  );
  const [enableSanitization, setEnableSanitization] = useState<boolean>(false);
  const [enableDataMinimization, setEnableDataMinimization] =
    useState<boolean>(false);
  const [showRecentSearches, setShowRecentSearches] = useState<boolean>(true);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    PrimeReact.ripple = true;

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
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Preferences saved successfully!',
          life: 3000,
        });
      }
    );
  };

  return (
    <div className="options-container">
      <Toast ref={toast} />
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
            <div key={category.name} className="category-item">
              <Checkbox
                inputId={category.name}
                value={category.name}
                onChange={() => onCategoryChange(category.name)}
                checked={selectedCategories.includes(category.name)}
              />
              <label htmlFor={category.name} className="category-label">
                {category.name}
                <Tooltip target=".custom-target-icon" />
                <i
                  className="custom-target-icon pi pi-info-circle p-text-secondary p-overlay-badge"
                  data-pr-tooltip={category.description}
                  data-pr-position="right"
                ></i>
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
            <Tooltip target=".sanitization-tooltip" />
            <i
              className="sanitization-tooltip pi pi-info-circle p-text-secondary"
              data-pr-tooltip="Automatically identifies and opens a dialog to keep/replace sensitive terms in your search query before submission."
              data-pr-position="right"
              style={{ marginLeft: '4px' }}
            ></i>
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
            <Tooltip target=".data-minimization-tooltip" />
            <i
              className="data-minimization-tooltip pi pi-info-circle p-text-secondary"
              data-pr-tooltip="Alerts you when unnecessary data is collected by search engines."
              data-pr-position="right"
              style={{ marginLeft: '4px' }}
            ></i>
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
            <Tooltip target=".recent-searches-tooltip" />
            <i
              className="recent-searches-tooltip pi pi-info-circle p-text-secondary"
              data-pr-tooltip="Displays a history of your recent searches in a popup for quick access."
              data-pr-position="right"
              style={{ marginLeft: '4px' }}
            ></i>
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
