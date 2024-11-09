import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { ProgressSpinner } from 'primereact/progressspinner';
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import SanitizerPanel from '../components/SanitizerPanel';
import { SensitivityTerm } from '../types';

import 'primeicons/primeicons.css';
import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/saga-blue/theme.css'; // Choose your theme
import './contentScript.css';

const App = () => {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [showSanitizerPanel, setShowSanitizerPanel] = useState(false);
  const [originalQuery, setOriginalQuery] = useState('');
  const [sensitiveTerms, setSensitiveTerms] = useState<SensitivityTerm[]>([]);
  const [enableSanitization, setEnableSanitization] = useState<boolean>(true);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const SEARCH_SELECTORS = {
    google: "input[name='q'], textarea[name='q'], input[id='input']",
    bing: "input[name='q']",
    duckduckgo: "input[name='q']",
  };

  useEffect(() => {
    console.log(`Inside useEffect`);

    let retryTimeout: number;

    const handleKeyDown = async (event: KeyboardEvent) => {
      console.log('handleKeyDown triggered', event);

      const inputElement = searchInputRef.current;
      if (inputElement) {
        console.log(`inputElement` + inputElement);
        if (event.key === 'Enter' && inputElement.value.trim()) {
          event.preventDefault();
          event.stopPropagation();

          const query = inputElement.value.trim();

          try {
            setLoading(true);
            const enableSanitization = await getEnableSanitization();
            console.log(enableSanitization);

            setEnableSanitization(enableSanitization);

            chrome.runtime.sendMessage(
              { type: 'CHECK_SENSITIVITY', query },
              (response) => {
                if (response) {
                  setLoading(false);

                  const isSensitive = response.isSensitive;
                  const sensitiveTerms: SensitivityTerm[] =
                    response.analysis?.results || [];

                  // Update query history
                  chrome.storage.local.get(['queryHistory'], (result) => {
                    const history = result.queryHistory || [];
                    history.unshift({ query, isSensitive });
                    if (history.length > 10) history.pop(); // Keep the last 10 queries
                    chrome.storage.local.set({ queryHistory: history });
                  });

                  if (isSensitive && enableSanitization) {
                    setOriginalQuery(query);
                    setSensitiveTerms(sensitiveTerms);
                    setShowSanitizerPanel(true);
                  } else if (isSensitive) {
                    setShowWarningModal(true);
                  } else if (isSensitive == false) {
                    // If not sensitive, proceed with the search
                    console.log(`Not sensitive`);
                    inputElement!.form?.submit();
                  }
                }
              }
            );
          } catch (error) {
            setLoading(false);
            console.error('Error in sensitivity check:', error);
            // Allow search to proceed if there's an error
            inputElement!.form?.submit();
          }
        }
      }
    };

    const findSearchInput = () => {
      let inputElement: HTMLInputElement | null = null;
      for (const selector of Object.values(SEARCH_SELECTORS)) {
        inputElement = document.querySelector(selector) as HTMLInputElement;
        if (inputElement) break;
      }

      if (!inputElement) {
        console.log('Search input not found, retrying...');
        retryTimeout = window.setTimeout(findSearchInput, 500);
        return;
      }
      console.log('Search input found:', inputElement);

      searchInputRef.current = inputElement;
      inputElement.addEventListener('keydown', handleKeyDown);
    };

    findSearchInput();

    return () => {
      const inputElement = searchInputRef.current;
      if (inputElement) {
        inputElement.removeEventListener('keydown', handleKeyDown);
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, []);

  const getEnableSanitization = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(
        ['enableSanitization'],
        ({ enableSanitization }) => {
          resolve(!!enableSanitization);
        }
      );
    });
  };

  const handleSanitizerConfirm = (updatedQuery: string) => {
    const inputElement = searchInputRef.current;

    if (inputElement) {
      inputElement.value = updatedQuery;
      inputElement.form?.submit();
    }
    setShowSanitizerPanel(false);
  };

  const handleSanitizerCancel = () => {
    const inputElement = searchInputRef.current;

    if (inputElement) {
      inputElement.value = '';
    }
    setShowSanitizerPanel(false);
  };

  const handleWarningConfirm = () => {
    const inputElement = searchInputRef.current;
    if (inputElement) {
      inputElement.form?.submit();
    }
    setShowWarningModal(false);
  };

  const handleWarningCancel = () => {
    const inputElement = searchInputRef.current;
    if (inputElement) {
      inputElement.value = '';
    }
    setShowWarningModal(false);
  };

  return (
    <>
      {loading && (
        <div className="loading-overlay">
          <ProgressSpinner />
        </div>
      )}
      {showSanitizerPanel && (
        <SanitizerPanel
          originalQuery={originalQuery}
          sensitiveTerms={sensitiveTerms}
          onConfirm={handleSanitizerConfirm}
          onCancel={handleSanitizerCancel}
        />
      )}
      {showWarningModal && (
        <Dialog
          header="Warning"
          visible
          modal
          onHide={() => setShowWarningModal(false)}
          footer={
            <div>
              <Button
                label="Cancel"
                icon="pi pi-times"
                className="p-button-text"
                onClick={handleWarningCancel}
              />
              <Button
                label="Proceed"
                icon="pi pi-check"
                onClick={handleWarningConfirm}
                autoFocus
              />
            </div>
          }
        >
          <p>
            Warning: Your search query contains sensitive information. Do you
            want to proceed?
          </p>
        </Dialog>
      )}
    </>
  );
};
const root = document.createElement('div');
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<App />);
// ReactDOM.render(<App />, root);
