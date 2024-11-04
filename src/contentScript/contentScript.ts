const SEARCH_SELECTORS = {
  google: "input[name='q']",
  bing: "input[name='q'], input#sb_form_q",
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
          chrome.runtime.sendMessage(
            { type: 'CHECK_SENSITIVITY', query },
            (response) => {
              if (response) {
                const isSensitive = response.isSensitive;
                console.log(`Response is `, isSensitive);
                chrome.storage.local.get(['queryHistory'], (result) => {
                  const history = result.queryHistory || [];
                  history.unshift({ query, isSensitive });
                  if (history.length > 10) history.pop(); // Keep the last 10 queries
                  chrome.storage.local.set({ queryHistory: history });
                });

                if (response && response.isSensitive) {
                  showCustomModal(
                    `Warning: Your search query contains sensitive information. Do you want to proceed?`,
                    () => {
                      searchInput.form?.submit();
                    },
                    () => {
                      searchInput.value = '';
                    }
                  );
                } else {
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

const showCustomModal = (
  message: string,
  onConfirm: () => void,
  onCancel: () => void
) => {
  const modal = document.createElement('div');
  modal.classList.add('custom-modal');
  modal.innerHTML = `
      <div class="custom-modal-content">
          <p>${message}</p>
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
