const searchQueryListener = () => {
  // Function to extract search query from URL
  const getSearchQuery = (url: string): string | null => {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get('q');
  };

  // Listen for URL changes on Google search
  if (window.location.hostname === 'www.google.com') {
    // Initial check
    let currentQuery = getSearchQuery(window.location.href);
    if (currentQuery) {
      chrome.runtime.sendMessage({ type: 'SEARCH_QUERY', query: currentQuery });
    }

    // Create an observer for URL changes
    const observer = new MutationObserver(() => {
      const newQuery = getSearchQuery(window.location.href);
      if (newQuery && newQuery !== currentQuery) {
        currentQuery = newQuery;
        chrome.runtime.sendMessage({ type: 'SEARCH_QUERY', query: newQuery });
      }
    });

    // Start observing
    observer.observe(document.querySelector('head > title')!, {
      subtree: true,
      characterData: true,
      childList: true,
    });
  }
};

// Execute the listener
searchQueryListener();
