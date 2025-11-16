// KlickPin Chrome Extension - Background Service Worker

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    chrome.downloads.download({
      url: request.url,
      filename: request.filename,
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true; // Keep message channel open for async response
  }
});

// Handle extension icon click (optional - opens popup or settings)
chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes('pinterest.com/pin/')) {
    // Already on pin page - the download button should be visible on the page
    console.log('KlickPin: Click the download button on the pin to download!');
  }
});

