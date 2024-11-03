chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEARCH_QUERY') {
    // Store the latest search query
    chrome.storage.local.set({ lastSearchQuery: message.query });
  }
});
