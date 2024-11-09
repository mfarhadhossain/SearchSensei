// src/components/SanitizerPanel.tsx
import 'primeicons/primeicons.css';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/saga-blue/theme.css'; // Choose your theme
import React, { useEffect, useState } from 'react';
import { SensitivityTerm } from '../types';
import './SanitizerPanel.css'; // Custom styles if needed

interface SanitizerPanelProps {
  originalQuery: string;
  sensitiveTerms: SensitivityTerm[];
  onConfirm: (updatedQuery: string) => void;
  onCancel: () => void;
}

const SanitizerPanel: React.FC<SanitizerPanelProps> = ({
  originalQuery,
  sensitiveTerms,
  onConfirm,
  onCancel,
}) => {
  const [userChoices, setUserChoices] = useState<{ [key: string]: string }>({});
  const [updatedQuery, setUpdatedQuery] = useState(originalQuery);

  useEffect(() => {
    // Initialize user choices
    const initialChoices = sensitiveTerms.reduce((acc, term) => {
      acc[term.text] = term.text; // Default to 'Keep'
      return acc;
    }, {} as { [key: string]: string });
    setUserChoices(initialChoices);
  }, [sensitiveTerms]);

  useEffect(() => {
    // Update the query preview whenever user choices change
    let newQuery = originalQuery;
    for (const [term, replacement] of Object.entries(userChoices)) {
      const regex = new RegExp(
        `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
        'gi'
      );
      newQuery = newQuery.replace(regex, replacement);
    }
    setUpdatedQuery(newQuery);
  }, [userChoices, originalQuery]);

  const handleChoiceChange = (term: string, value: string) => {
    setUserChoices((prevChoices) => ({
      ...prevChoices,
      [term]: value,
    }));
  };

  const footer = (
    <div>
      <Button
        label="Cancel"
        icon="pi pi-times"
        className="p-button-text"
        onClick={onCancel}
      />
      <Button
        label="Confirm"
        icon="pi pi-check"
        onClick={() => onConfirm(updatedQuery)}
        autoFocus
      />
    </div>
  );

  return (
    <Dialog
      header="Sanitize Your Query"
      visible
      modal
      onHide={onCancel}
      footer={footer}
    >
      <p>
        We've detected sensitive information in your query. Please choose how to
        handle each term:
      </p>
      {sensitiveTerms.map((termInfo, index) => (
        <div key={index} className="p-field">
          <label
            htmlFor={`term-${index}`}
          >{`${termInfo.text} (${termInfo.entity_type})`}</label>
          <Dropdown
            id={`term-${index}`}
            value={userChoices[termInfo.text]}
            options={[
              { label: `Keep ("${termInfo.text}")`, value: termInfo.text },
              {
                label: `Replace with "[${termInfo.replace}]"`,
                value: `[${termInfo.replace}]`,
              },
              {
                label: `Abstract as "${termInfo.abstract}"`,
                value: termInfo.abstract,
              },
            ]}
            onChange={(e) => handleChoiceChange(termInfo.text, e.value)}
            placeholder="Select an action"
            className="p-inputgroup"
          />
        </div>
      ))}
      <div className="query-preview">
        <h4>Updated Query Preview:</h4>
        <p>{updatedQuery}</p>
      </div>
    </Dialog>
  );
};

export default SanitizerPanel;
