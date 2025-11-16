// KlickPin Chrome Extension - Content Script
// Injects download button into Pinterest pin pages

(function() {
  'use strict';

  const API_BASE_URL = 'http://localhost:4000/api';

  // Create download button matching Pinterest's IconButton style
  function createDownloadButton() {
    const button = document.createElement('button');
    button.className = 'klickpin-download-btn euRXRl';
    button.setAttribute('aria-label', 'Download');
    button.setAttribute('title', 'Download');
    button.setAttribute('data-klickpin', 'true');
    button.type = 'button';
    button.tabIndex = 0;
    
    // Create wrapper div matching Pinterest's structure
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'dVx3J_ Q3hcOU mm_g7v';
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'VHreRh kHGn_J XjRT60 bCyBlM';
    iconDiv.style.height = '48px';
    iconDiv.style.width = '48px';
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('aria-label', '');
    svg.setAttribute('class', 'aTSQd5 hL9n03 _ByyDT');
    svg.setAttribute('height', '24');
    svg.setAttribute('role', 'img');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '24');
    
    // Download icon matching Pinterest's upload icon style (square with downward arrow)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M6.3 12.2 12 17.92l5.7-5.7-1.4-1.4L13 14.1V3h-2v11.09l-3.3-3.3zM2 18v-5H0v5a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4v-5h-2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2');
    
    svg.appendChild(path);
    iconDiv.appendChild(svg);
    wrapperDiv.appendChild(iconDiv);
    button.appendChild(wrapperDiv);
    
    // Match Pinterest's button styling
    Object.assign(button.style, {
      backgroundColor: 'transparent',
      border: 'none',
      padding: '0',
      margin: '0',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      outline: 'none'
    });

    ['mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(eventType => {
      button.addEventListener(eventType, (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true);
    });
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();
      handleDownload(e);
    }, true);

    return button;
  }

  // Inject download button next to share button
  function injectDownloadButton() {
    if (document.querySelector('[data-klickpin="true"]')) {
      return;
    }
    
    const shareButtonContainer = document.querySelector('[data-test-id="closeup-share-button"]');
    if (!shareButtonContainer) {
      return;
    }

    try {
      let listItemContainer = shareButtonContainer.closest('.oRZ5_s') || 
                              shareButtonContainer.closest('[role="listitem"]');
      const mainContainer = document.querySelector('[data-test-id="closeup-action-items"]');
      
      if (!listItemContainer || !mainContainer) {
        return;
      }

      const downloadBtn = createDownloadButton();
      const newListItem = document.createElement('div');
      newListItem.className = 'oRZ5_s';
      newListItem.setAttribute('role', 'listitem');
      
      const innerWrapper = document.createElement('div');
      innerWrapper.className = 'ADXRXN';
      innerWrapper.style.pointerEvents = 'auto';
      innerWrapper.appendChild(downloadBtn);
      newListItem.appendChild(innerWrapper);
      
      const mainChildren = Array.from(mainContainer.children);
      const shareIndex = mainChildren.indexOf(listItemContainer);
      
      if (shareIndex >= 0) {
        if (shareIndex < mainChildren.length - 1) {
          mainContainer.insertBefore(newListItem, mainChildren[shareIndex + 1]);
        } else {
          mainContainer.appendChild(newListItem);
        }
      } else {
        let parent = listItemContainer.parentElement;
        while (parent && parent !== mainContainer && parent !== document.body) {
          const parentIndex = mainChildren.indexOf(parent);
          if (parentIndex >= 0) {
            if (parentIndex < mainChildren.length - 1) {
              mainContainer.insertBefore(newListItem, mainChildren[parentIndex + 1]);
            } else {
              mainContainer.appendChild(newListItem);
            }
            break;
          }
          parent = parent.parentElement;
        }
        
        if (!newListItem.parentElement) {
          mainContainer.appendChild(newListItem);
        }
      }
    } catch (error) {
      if (!document.querySelector('[data-klickpin="true"]')) {
        console.error('[KlickPin] Error injecting button:', error);
      }
    }
  }

  // Handle download
  async function handleDownload(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const button = event.currentTarget;
    
    if (button.disabled || button.dataset.downloading === 'true') {
      return;
    }
    
    button.dataset.downloading = 'true';
    button.disabled = true;
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';

    try {
      const response = await fetch(`${API_BASE_URL}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: window.location.href,
          platform: 'pinterest'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }

      const data = JSON.parse(buffer);
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No media found');
      }

      const images = data.data.filter(item => item.type === 'image');
      const videos = data.data.filter(item => item.type === 'video');
      
      let mediaItem = null;
      
      if (videos.length > 0) {
        mediaItem = videos.find(vid => 
          vid.url?.toLowerCase().includes('/720p/') ||
          vid.url?.toLowerCase().includes('/1080p/') ||
          vid.url?.toLowerCase().includes('/orig') ||
          vid.url?.toLowerCase().includes('orig/')
        ) || videos[0];
      } else if (images.length > 0) {
        mediaItem = images.find(img => 
          img.url?.toLowerCase().includes('/orig') || 
          img.url?.toLowerCase().includes('orig/')
        ) || images[0];
      }

      if (!mediaItem) {
        throw new Error('No downloadable media found');
      }

      const filename = `pinterest-${mediaItem.type}-${Date.now()}.${mediaItem.extension || (mediaItem.type === 'image' ? 'jpg' : 'mp4')}`;
      
      // Wrap sendMessage in Promise to properly handle async errors
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'download',
          url: mediaItem.url,
          filename: filename
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Download failed: ${chrome.runtime.lastError.message}`));
          } else if (response && !response.success) {
            reject(new Error(`Download failed: ${response.error}`));
          } else {
            resolve(response);
          }
        });
      });

      // Only show success after download is initiated successfully
      // Temporarily change icon color to green for feedback
      const svg = button.querySelector('svg');
      if (svg) {
        svg.style.fill = '#4CAF50';
        svg.style.color = '#4CAF50';
      }
      setTimeout(() => {
        button.disabled = false;
        button.dataset.downloading = 'false';
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        if (svg) {
          svg.style.fill = '#111111';
          svg.style.color = '#111111';
        }
      }, 1500);

    } catch (error) {
      let errorMessage = error.message;
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = 'Cannot connect to server. Please make sure your server is running on localhost:4000';
      }
      
      alert(`Download failed: ${errorMessage}`);
      
      button.disabled = false;
      button.dataset.downloading = 'false';
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      const svg = button.querySelector('svg');
      if (svg) {
        svg.style.fill = '#111111';
        svg.style.color = '#111111';
      }
    }
  }

  // Initialize
  function init() {
    if (!window.location.href.includes('/pin/')) {
      return;
    }

    injectDownloadButton();
    setTimeout(() => {
      if (!document.querySelector('[data-klickpin="true"]')) {
        injectDownloadButton();
      }
    }, 1500);
    setTimeout(() => {
      if (!document.querySelector('[data-klickpin="true"]')) {
        injectDownloadButton();
      }
    }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-inject on navigation (Pinterest is SPA)
  let lastUrl = location.href;
  const urlObserver = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl && url.includes('/pin/')) {
      lastUrl = url;
      const existingBtn = document.querySelector('[data-klickpin="true"]');
      if (existingBtn) {
        const listItem = existingBtn.closest('.oRZ5_s[role="listitem"]');
        if (listItem && listItem.parentElement) {
          listItem.parentElement.removeChild(listItem);
        }
      }
      setTimeout(() => {
        if (!document.querySelector('[data-klickpin="true"]')) {
          injectDownloadButton();
        }
      }, 1000);
    }
  });
  urlObserver.observe(document, { subtree: true, childList: true });

  // Observe DOM changes
  let domCheckTimeout = null;
  const domObserver = new MutationObserver(() => {
    if (location.href.includes('/pin/')) {
      const existingBtn = document.querySelector('[data-klickpin="true"]');
      if (!existingBtn) {
        clearTimeout(domCheckTimeout);
        domCheckTimeout = setTimeout(() => {
          if (!document.querySelector('[data-klickpin="true"]')) {
            injectDownloadButton();
          }
        }, 500);
      }
    }
  });
  domObserver.observe(document.body || document.documentElement, { 
    subtree: true, 
    childList: true 
  });

})();
