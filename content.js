// KlickPin Chrome Extension - Content Script
// Injects download button into Pinterest pin pages

(function() {
  'use strict';

  const API_BASE_URL = 'http://localhost:4000/api';
  const PIN_RED = '#BD081C';
  const PIN_RED_HOVER = '#A00715';

  // Create download button
  function createDownloadButton() {
    const button = document.createElement('button');
    button.className = 'klickpin-download-btn';
    button.setAttribute('aria-label', 'Download pin with KlickPin');
    button.setAttribute('data-klickpin', 'true');
    button.type = 'button';
    
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15.577l-3.539-3.538 1.414-1.414L11 12.586V4h2v8.586l1.125-1.125 1.414 1.414L12 15.577z" fill="currentColor"/>
        <path d="M19 9v10H5V9H3v11a1 1 0 001 1h16a1 1 0 001-1V9h-2z" fill="currentColor"/>
      </svg>
    `;
    
    Object.assign(button.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: PIN_RED,
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      padding: '8px',
      width: '36px',
      height: '36px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      fontFamily: 'inherit',
      lineHeight: '1',
      marginLeft: '8px',
      zIndex: '10000',
      position: 'relative',
      verticalAlign: 'middle'
    });

    button.addEventListener('mouseenter', (e) => {
      e.stopPropagation();
      if (!button.disabled) {
        button.style.backgroundColor = PIN_RED_HOVER;
      }
    });

    button.addEventListener('mouseleave', (e) => {
      e.stopPropagation();
      if (!button.disabled) {
        button.style.backgroundColor = PIN_RED;
      }
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
      button.style.backgroundColor = '#4CAF50';
      setTimeout(() => {
        button.disabled = false;
        button.dataset.downloading = 'false';
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.style.backgroundColor = PIN_RED;
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
      button.style.backgroundColor = PIN_RED;
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
