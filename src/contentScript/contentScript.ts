const SEARCH_SELECTORS = {
  google: "input[name='q'], textarea[name='q'], input[id='input']",
  bing: "input[name='q']",
  duckduckgo: "input[name='q']",
};

const monitorSearchQuery = () => {
  let searchInput: HTMLInputElement | null = null;

  for (const selector of Object.values(SEARCH_SELECTORS)) {
    searchInput = document.querySelector(selector) as HTMLInputElement;
    if (searchInput) break;
  }

  if (!searchInput) {
    console.log('Search input not found, retrying...');
    setTimeout(monitorSearchQuery, 500);
    return;
  }

  if (searchInput) {
    console.log('Before ', searchInput);
    searchInput.addEventListener('keydown', async (event) => {
      console.log('After ', searchInput);
      if (event.key === 'Enter' && searchInput.value.trim()) {
        event.preventDefault();
        event.stopPropagation();

        console.log('Enter pressed, query:', searchInput.value);

        const query = searchInput.value.trim();

        console.log(' query:', query);
        // Listen for response from background to proceed or not
        try {
          const enableSanitization = await getEnableSanitization();

          chrome.runtime.sendMessage(
            { type: 'CHECK_SENSITIVITY', query },
            (response) => {
              if (response) {
                const isSensitive = response.isSensitive;
                const sanitizedQuery =
                  response.analysis?.sanitizedQuery ||
                  'Something is wrong with the sanitized query';
                const sensitiveTerms = response.analysis?.sensitiveTerms || [];

                console.log(`Response is `, isSensitive);
                chrome.storage.local.get(['queryHistory'], (result) => {
                  const history = result.queryHistory || [];
                  history.unshift({ query, isSensitive });
                  if (history.length > 10) history.pop(); // Keep the last 10 queries
                  chrome.storage.local.set({ queryHistory: history });
                });

                if (response.isSensitive === true && enableSanitization) {
                  showSensitiveTermsModal(
                    query,
                    sensitiveTerms,
                    (updatedQuery) => {
                      searchInput.value = updatedQuery;
                      searchInput.form?.submit();
                    },
                    () => {
                      searchInput.value = '';
                    }
                  );
                } else if (response.isSensitive === true) {
                  showCustomModal(
                    `Warning: Your search query contains sensitive information. Do you want to proceed?`,
                    () => {
                      searchInput.form?.submit();
                    },
                    () => {
                      searchInput.value = '';
                    }
                  );
                } else if (response.isSensitive === false) {
                  // If not sensitive, proceed with the search
                  searchInput.form?.submit();
                }
              }
            }
          );
        } catch (error) {
          console.error('Error in sensitivity check:', error);
          // Allow search to proceed if there's an error
          searchInput.form?.submit();
        }
      }
    });
  }
};

setTimeout(monitorSearchQuery, 1);
// monitorSearchQuery();
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
const showCustomModal = (
  message: string,
  onConfirm: () => void,
  onCancel: () => void
) => {
  const modal = document.createElement('div');
  modal.classList.add('custom-modal');
  modal.innerHTML = `
      <div class="custom-modal-content">
          <p id="text">${message}</p>
          <button id="confirm-btn">Proceed</button>
          <button id="cancel-btn">Cancel</button>
      </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('confirm-btn')?.addEventListener('click', () => {
    onConfirm(); // Proceed with search if confirmed
    document.body.removeChild(modal); // Remove the modal
  });

  document.getElementById('cancel-btn')?.addEventListener('click', () => {
    onCancel(); // Clear the input if canceled
    document.body.removeChild(modal); // Remove the modal
  });
};

// Listener for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DATA_MINIMIZATION_ALERT') {
  }
});

function showSensitiveTermsModal(
  originalQuery: string,
  sensitiveTerms: SensitivityTerm[],
  onConfirm: (updatedQuery: string) => void,
  onCancel: () => void
) {
  // Create the modal container
  const modal = document.createElement('div');
  modal.classList.add('custom-modal');
  modal.innerHTML = `
    <div class="custom-modal-content">
      <p>We've detected sensitive information in your query. Please choose how to handle each item:</p>
      <div id="terms-container"></div>
      <button id="confirm-btn">Proceed</button>
      <button id="cancel-btn">Cancel</button>
    </div>
  `;
  document.body.appendChild(modal);

  // Reference to the terms container
  const termsContainer = modal.querySelector('#terms-container');

  // Keep track of user choices
  const userChoices: { [key: string]: string } = {}; // term: action

  // For each sensitive term, create options
  sensitiveTerms.forEach((termInfo, index) => {
    const termDiv = document.createElement('div');
    termDiv.classList.add('term-item');
    termDiv.innerHTML = `
      <p><strong>${termInfo.term}</strong> (${termInfo.category})</p>
      <button data-action="replace" data-index="${index}">Replace</button>
      <button data-action="abstract" data-index="${index}">Abstract</button>
      <button data-action="keep" data-index="${index}">Keep</button>
    `;
    termsContainer.appendChild(termDiv);
    termDiv.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        const action = (event.target as HTMLElement).dataset.action;

        if (action) {
          if (action === 'replace') {
            userChoices[termInfo.term] = `[${termInfo.category.toUpperCase()}]`;
          } else if (action === 'abstract') {
            const abstractedTerm = await getAbstractedTerm(
              termInfo.term,
              termInfo.category
            );
            userChoices[termInfo.term] = abstractedTerm;
          } else if (action === 'keep') {
            userChoices[termInfo.term] = termInfo.term;
          }

          // Disable buttons for this term
          (event.currentTarget as HTMLButtonElement).parentElement
            ?.querySelectorAll('button')
            .forEach((btn) => {
              btn.disabled = true;
            });
        }
      });
    });
  });

  // Confirm and proceed
  document.getElementById('confirm-btn')?.addEventListener('click', () => {
    // Build the updated query based on user choices
    let updatedQuery = originalQuery;
    Object.keys(userChoices).forEach((term) => {
      const replacement = userChoices[term];
      const regex = new RegExp(term, 'g');
      updatedQuery = updatedQuery.replace(regex, replacement);
    });

    onConfirm(updatedQuery);
    document.body.removeChild(modal);
  });

  // Cancel and clear input
  document.getElementById('cancel-btn')?.addEventListener('click', () => {
    onCancel();
    document.body.removeChild(modal);
  });
}

async function getAbstractedTerm(
  term: string,
  category: string
): Promise<string> {
  // Use OpenAI API or predefined mappings to get an abstracted term
  // For simplicity, we'll use a mapping here
  const abstractionMapping: { [key: string]: string } = {
    'Personal identification': 'someone',
    'Location data': 'a place',
    'Health information': 'a health condition',
    // Add more as needed
  };

  return abstractionMapping[category] || 'something';
}
