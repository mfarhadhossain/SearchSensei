/*import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import 'primereact/resources/primereact.min.css';
import 'primereact/resources/themes/saga-blue/theme.css';
import React, { useEffect, useState } from 'react';
import './contentScript.css';

interface SensitivityTerm {
  term: string;
  category: string;
  startIndex: number;
  endIndex: number;
  replace: string;
  abstract: string;
}

const ContentScriptApp = () => {
  const [showModal, setShowModal] = useState(false);
  const [originalQuery, setOriginalQuery] = useState('');
  const [updatedQuery, setUpdatedQuery] = useState('');
  const [sensitiveTerms, setSensitiveTerms] = useState<SensitivityTerm[]>([]);
  const [userChoices, setUserChoices] = useState<{ [key: string]: string }>({});
  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(
    null
  );

  useEffect(() => {
    monitorSearchQuery();
  }, []);

  const monitorSearchQuery = () => {
    const SEARCH_SELECTORS = {
      google: "input[name='q'], textarea[name='q'], input[id='input']",
      bing: "input[name='q']",
      duckduckgo: "input[name='q']",
    };
    let inputElement: HTMLInputElement | null = null;

    for (const selector of Object.values(SEARCH_SELECTORS)) {
      inputElement = document.querySelector(selector) as HTMLInputElement;
      if (inputElement) break;
    }

    if (!inputElement) {
      console.log('Search input not found, retrying...');
      setTimeout(monitorSearchQuery, 500);
      return;
    }

    setInputElement(inputElement);

    if (inputElement) {
      console.log('Before ', inputElement);
      inputElement.addEventListener('keydown', async (event) => {
        console.log('After ', inputElement);
        if (event.key === 'Enter' && inputElement.value.trim()) {
          event.preventDefault();
          event.stopPropagation();

          const query = inputElement.value.trim();

          console.log(' query:', query);
          // Listen for response from background to proceed or not
          try {
            const enableSanitization = await getEnableSanitization();

            chrome.runtime.sendMessage(
              { type: 'CHECK_SENSITIVITY', query },
              (response) => {
                if (response) {
                  const isSensitive = response.isSensitive;
                  const analysis = response.analysis;

                  const sanitizedQuery =
                    response.analysis?.sanitizedQuery ||
                    'Something is wrong with the sanitized query';
                  const terms = analysis?.sensitiveTerms || [];

                  console.log(`Response is `, isSensitive);
                  chrome.storage.local.get(['queryHistory'], (result) => {
                    const history = result.queryHistory || [];
                    history.unshift({ query, isSensitive });
                    if (history.length > 10) history.pop(); // Keep the last 10 queries
                    chrome.storage.local.set({ queryHistory: history });
                  });

                  if (response.isSensitive === true && enableSanitization) {
                    setOriginalQuery(query);
                    setUpdatedQuery(query);
                    setSensitiveTerms(terms);
                    setShowModal(true);
                  } else if (response.isSensitive === true) {
                    showSimpleModal(
                      'Warning: Your search query contains sensitive information. Do you want to proceed?',
                      () => {
                        inputElement!.form?.submit();
                      },
                      () => {
                        inputElement!.value = '';
                      }
                    );
                  } else if (response.isSensitive === false) {
                    // If not sensitive, proceed with the search
                    inputElement!.form?.submit();
                  }
                }
              }
            );
          } catch (error) {
            console.error('Error in sensitivity check:', error);
            // Allow search to proceed if there's an error
            inputElement.form?.submit();
          }
        }
      });
    }
  };

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

  const handleTermChoice = (term: SensitivityTerm, choice: string) => {
    const newChoices = { ...userChoices, [term.term]: choice };
    setUserChoices(newChoices);

    // Update the query
    let newQuery = originalQuery;
    Object.keys(newChoices).forEach((key) => {
      const replacement = newChoices[key];
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'); // Escape special chars
      newQuery = newQuery.replace(regex, replacement);
    });
    setUpdatedQuery(newQuery);
  };

  const onModalConfirm = () => {
    if (inputElement) {
      inputElement.value = updatedQuery;
      inputElement.form?.submit();
    }
    setShowModal(false);
  };

  const onModalCancel = () => {
    if (inputElement) {
      inputElement.value = '';
    }
    setShowModal(false);
  };
  const showSimpleModal = (
    message: string,
    onConfirm: () => void,
    onCancel: () => void
  ) => {
    if (confirm(message)) {
      onConfirm();
    } else {
      onCancel();
    }
  };
  // const showCustomModal = (
  //   message: string,
  //   onConfirm: () => void,
  //   onCancel: () => void
  // ) => {
  //   const modal = document.createElement('div');
  //   modal.classList.add('custom-modal');
  //   modal.innerHTML = `
  //     <div class="custom-modal-content">
  //         <p id="text">${message}</p>
  //         <button id="confirm-btn">Proceed</button>
  //         <button id="cancel-btn">Cancel</button>
  //     </div>
  // `;
  //   document.body.appendChild(modal);

  //   document.getElementById('confirm-btn')?.addEventListener('click', () => {
  //     onConfirm(); // Proceed with search if confirmed
  //     document.body.removeChild(modal); // Remove the modal
  //   });

  //   document.getElementById('cancel-btn')?.addEventListener('click', () => {
  //     onCancel(); // Clear the input if canceled
  //     document.body.removeChild(modal); // Remove the modal
  //   });
  // };

  // function showSensitiveTermsModal(
  //   originalQuery: string,
  //   sensitiveTerms: SensitivityTerm[],
  //   onConfirm: (updatedQuery: string) => void,
  //   onCancel: () => void
  // ) {
  //   // Create the modal container
  //   const modal = document.createElement('div');
  //   modal.classList.add('custom-modal');
  //   modal.innerHTML = `
  //   <div class="custom-modal-content">
  //     <p>We've detected sensitive information in your query. Please choose how to handle each item:</p>
  //     <div id="terms-container"></div>
  //     <button id="confirm-btn">Proceed</button>
  //     <button id="cancel-btn">Cancel</button>
  //   </div>
  // `;
  //   document.body.appendChild(modal);

  //   // Reference to the terms container
  //   const termsContainer = modal.querySelector('#terms-container');

  //   // Keep track of user choices
  //   const userChoices: { [key: string]: string } = {}; // term: action

  //   // For each sensitive term, create options
  //   sensitiveTerms.forEach((termInfo, index) => {
  //     const termDiv = document.createElement('div');
  //     termDiv.classList.add('term-item');
  //     termDiv.innerHTML = `
  //     <p><strong>${termInfo.term}</strong> (${termInfo.category})</p>
  //     <button data-action="replace" data-index="${index}">Replace</button>
  //     <button data-action="abstract" data-index="${index}">Abstract</button>
  //     <button data-action="keep" data-index="${index}">Keep</button>
  //   `;
  //     termsContainer.appendChild(termDiv);
  //     termDiv.querySelectorAll('button').forEach((btn) => {
  //       btn.addEventListener('click', async (event) => {
  //         const action = (event.target as HTMLElement).dataset.action;

  //         if (action) {
  //           if (action === 'replace') {
  //             userChoices[
  //               termInfo.term
  //             ] = `[${termInfo.category.toUpperCase()}]`;
  //           } else if (action === 'abstract') {
  //             const abstractedTerm = await getAbstractedTerm(
  //               termInfo.term,
  //               termInfo.category
  //             );
  //             userChoices[termInfo.term] = abstractedTerm;
  //           } else if (action === 'keep') {
  //             userChoices[termInfo.term] = termInfo.term;
  //           }

  //           // Disable buttons for this term
  //           (event.currentTarget as HTMLButtonElement).parentElement
  //             ?.querySelectorAll('button')
  //             .forEach((btn) => {
  //               btn.disabled = true;
  //             });
  //         }
  //       });
  //     });
  //   });

  //   // Confirm and proceed
  //   document.getElementById('confirm-btn')?.addEventListener('click', () => {
  //     // Build the updated query based on user choices
  //     let updatedQuery = originalQuery;
  //     Object.keys(userChoices).forEach((term) => {
  //       const replacement = userChoices[term];
  //       const regex = new RegExp(term, 'g');
  //       updatedQuery = updatedQuery.replace(regex, replacement);
  //     });

  //     onConfirm(updatedQuery);
  //     document.body.removeChild(modal);
  //   });

  //   // Cancel and clear input
  //   document.getElementById('cancel-btn')?.addEventListener('click', () => {
  //     onCancel();
  //     document.body.removeChild(modal);
  //   });
  // }

  // async function getAbstractedTerm(
  //   term: string,
  //   category: string
  // ): Promise<string> {
  //   // Use OpenAI API or predefined mappings to get an abstracted term
  //   // For simplicity, we'll use a mapping here
  //   const abstractionMapping: { [key: string]: string } = {
  //     'Personal identification': 'someone',
  //     'Location data': 'a place',
  //     'Health information': 'a health condition',
  //     // Add more as needed
  //   };

  //   return abstractionMapping[category] || 'something';
  // };

  return (
    <>
      {showModal && (
        <Dialog
          header="Sensitive Information Detected"
          visible={true}
          style={{ width: '50vw' }}
          onHide={() => setShowModal(false)}
          footer={
            <div>
              <Button
                label="Confirm"
                icon="pi pi-check"
                onClick={onModalConfirm}
              />
              <Button
                label="Cancel"
                icon="pi pi-times"
                className="p-button-secondary"
                onClick={onModalCancel}
              />
            </div>
          }
        >
          <p>
            We've detected sensitive information in your query. Please choose
            how to handle each term:
          </p>
          {sensitiveTerms.map((termInfo, index) => (
            <div key={index} className="sensitive-term-item">
              <p>
                <strong>{termInfo.term}</strong> ({termInfo.category})
              </p>
              <Dropdown
                options={[
                  { label: `Keep (${termInfo.term})`, value: termInfo.term },
                  {
                    label: `Replace with ${termInfo.replace}`,
                    value: termInfo.replace,
                  },
                  {
                    label: `Abstract as "${termInfo.abstract}"`,
                    value: termInfo.abstract,
                  },
                ]}
                placeholder="Choose an option"
                onChange={(e) => handleTermChoice(termInfo, e.value)}
                style={{ width: '100%' }}
              />
            </div>
          ))}
          <div className="query-preview">
            <h4>Updated Query Preview:</h4>
            <p>{updatedQuery}</p>
          </div>
        </Dialog>
      )}
    </>
  );
};

export default ContentScriptApp;
// */
// import React from 'react';

// const ContentScriptApp = () => {
//   console.log('ContentScriptApp rendered'); // Debug log

//   return (
//     <div
//       style={{
//         position: 'fixed',
//         top: '20px',
//         right: '20px',
//         padding: '20px',
//         background: 'white',
//         border: '2px solid red',
//         zIndex: 9999,
//         boxShadow: '0 0 10px rgba(0,0,0,0.5)',
//       }}
//     >
//       <h1>Search Sensei</h1>
//       <p>If you can see this, the content script is working!</p>
//     </div>
//   );
// };

// export default ContentScriptApp;
