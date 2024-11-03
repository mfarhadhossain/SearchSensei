const monitorSearchQuery = () => {
  const searchInput = document.querySelector(
    "input[name='q']"
  ) as HTMLInputElement;

  if (searchInput) {
    console.log('Before ', searchInput);
    searchInput.addEventListener('keydown', async (event) => {
      console.log('After ', searchInput);
      if (event.key === 'Enter' && searchInput.value.trim()) {
        event.preventDefault();
        console.log('Enter pressed, query:', searchInput.value);

        const query = searchInput.value.trim();

        // Listen for response from background to proceed or not
        try {
          chrome.runtime.sendMessage(
            { type: 'CHECK_SENSITIVITY', query },
            (response) => {
              const isSensitive = response.isSensitive;

              chrome.storage.local.get(['queryHistory'], (result) => {
                const history = result.queryHistory || [];
                history.unshift({ query, isSensitive });
                if (history.length > 10) history.pop(); // Keep the last 10 queries
                chrome.storage.local.set({ queryHistory: history });
              });

              if (response && response.isSensitive) {
                const userConfirmed = confirm(
                  `Warning: Your search query contains sensitive information. Do you want to proceed?`
                );

                if (userConfirmed) {
                  searchInput.form?.submit();
                } else {
                  searchInput.value = '';
                }
              } else {
                // If not sensitive, proceed with the search
                searchInput.form?.submit();
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
monitorSearchQuery();
