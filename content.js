// KlickPin Chrome Extension - Content Script
// Injects download button into Pinterest pin pages

(function() {
  'use strict';

  const API_BASE_URL = 'http://localhost:3000/api'; // Testing: localhost server
  
  // Pinterest red color
  const PIN_RED = '#BD081C';
  const PIN_RED_HOVER = '#A00715';

  // Multiple selectors to find share button
  const SHARE_BUTTON_SELECTORS = [
    'button[aria-label*="Send" i]',
    'button[aria-label*="Share" i]',
    'button[aria-label*="share" i]',
    '[data-test-id="share-button"]',
    '[data-test-id="closeup-share-button"] button',
  ];

  // Create download button
  function createDownloadButton() {
    const button = document.createElement('button');
    button.className = 'klickpin-download-btn';
    button.setAttribute('aria-label', 'Download pin with KlickPin');
    // Remove title to prevent tooltip conflict
    button.setAttribute('data-klickpin', 'true');
    button.type = 'button'; // Prevent form submission
    
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15.577l-3.539-3.538 1.414-1.414L11 12.586V4h2v8.586l1.125-1.125 1.414 1.414L12 15.577z" fill="currentColor"/>
        <path d="M19 9v10H5V9H3v11a1 1 0 001 1h16a1 1 0 001-1V9h-2z" fill="currentColor"/>
      </svg>
    `;
    
    // Style the button (icon only, square shape)
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
      e.stopPropagation(); // Prevent tooltip from parent
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

    // Prevent all event bubbling for non-click events
    ['mousedown', 'mouseup', 'touchstart', 'touchend'].forEach(eventType => {
      button.addEventListener(eventType, (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }, true); // Use capture phase to catch before other handlers
    });
    
    // Add click handler with full event control
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();
      handleDownload(e);
    }, true); // Use capture phase

    return button;
  }

  // Find share button and inject download button right after it
  function injectDownloadButton() {
    // Check if already injected
    const existingBtn = document.querySelector('[data-klickpin="true"]');
    if (existingBtn) {
      return; // Already injected, skip
    }

    console.log('[KlickPin] Attempting to inject download button...');
    
    // Find the share button
    let shareButton = null;
    let shareButtonContainer = null;
    
    for (const selector of SHARE_BUTTON_SELECTORS) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          shareButton = element;
          // Find the actual button element (might be nested)
          if (element.tagName !== 'BUTTON') {
            shareButton = element.querySelector('button') || element;
          }
          shareButtonContainer = shareButton.closest('[data-test-id="closeup-share-button"]') || shareButton.parentElement;
          console.log('[KlickPin] Found share button with selector:', selector, shareButton);
          break;
        }
      } catch (e) {
        console.log('[KlickPin] Selector failed:', selector, e);
      }
    }

    if (!shareButton || !shareButtonContainer) {
      console.warn('[KlickPin] Could not find share button, will retry...');
      return;
    }

    try {
      const downloadBtn = createDownloadButton();
      
      // Find the parent container that holds action buttons (likely a flex container)
      let parentContainer = shareButtonContainer.parentElement;
      
      // Look for a container that has multiple action buttons (like, comment, share)
      // This ensures we're inserting in the right flex row
      let actionBarParent = parentContainer;
      let attempts = 0;
      while (attempts < 3 && actionBarParent) {
        const children = Array.from(actionBarParent.children || []);
        const buttonCount = children.filter(child => 
          child.tagName === 'BUTTON' || 
          child.querySelector('button') || 
          child.getAttribute('data-test-id')?.includes('button') ||
          child.getAttribute('data-test-id')?.includes('share')
        ).length;
        
        if (buttonCount >= 2) {
          // Found the action bar container
          break;
        }
        actionBarParent = actionBarParent.parentElement;
        attempts++;
      }
      
      // Use the action bar parent if found, otherwise use share button's parent
      const targetParent = actionBarParent || parentContainer;
      
      // Insert as sibling right after share button container
      if (shareButtonContainer.nextSibling) {
        targetParent.insertBefore(downloadBtn, shareButtonContainer.nextSibling);
      } else {
        // If no next sibling, append to parent
        targetParent.appendChild(downloadBtn);
      }
      
      // Ensure the button appears inline (not block)
      downloadBtn.style.display = 'inline-flex';
      
      console.log('[KlickPin] ✅ Download button injected successfully!', {
        parent: targetParent,
        shareContainer: shareButtonContainer
      });
    } catch (error) {
      console.error('[KlickPin] Error injecting button:', error);
    }
  }

  // Handle download with proper event handling
  async function handleDownload(event) {
    // Stop all event propagation immediately
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const button = event.currentTarget;
    
    // Prevent multiple clicks
    if (button.disabled || button.dataset.downloading === 'true') {
      return;
    }
    
    button.dataset.downloading = 'true';
    button.disabled = true;
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';

    try {
      const currentUrl = window.location.href;
      console.log('[KlickPin] Starting download for URL:', currentUrl);
      
      // Call API
      const response = await fetch(`${API_BASE_URL}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: currentUrl,
          platform: 'pinterest'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
      }

      // Parse streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }

      const data = JSON.parse(buffer);
      console.log('[KlickPin] API response:', data);
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No media found');
      }

      // Get best media item
      const images = data.data.filter(item => item.type === 'image');
      const videos = data.data.filter(item => item.type === 'video');
      
      let mediaItem = null;
      if (images.length > 0) {
        // Prefer original quality
        mediaItem = images.find(img => 
          img.url?.toLowerCase().includes('/orig') || 
          img.url?.toLowerCase().includes('orig/')
        ) || images[0];
      } else if (videos.length > 0) {
        mediaItem = videos[0];
      }

      if (!mediaItem) {
        throw new Error('No downloadable media found');
      }

      console.log('[KlickPin] Downloading media:', mediaItem);

      // Download file via proxy
      const downloadUrl = `${API_BASE_URL}/download-file?url=${encodeURIComponent(mediaItem.url)}&type=${mediaItem.type}&format=${mediaItem.extension || (mediaItem.type === 'image' ? 'jpg' : 'mp4')}`;
      
      // Use Chrome downloads API
      chrome.runtime.sendMessage({
        action: 'download',
        url: downloadUrl,
        filename: `pinterest-${mediaItem.type}-${Date.now()}.${mediaItem.extension || (mediaItem.type === 'image' ? 'jpg' : 'mp4')}`
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[KlickPin] Download error:', chrome.runtime.lastError);
        } else {
          console.log('[KlickPin] Download started:', response);
        }
      });

      // Show success feedback (brief visual feedback)
      button.style.backgroundColor = '#4CAF50'; // Green for success
      setTimeout(() => {
        button.disabled = false;
        button.dataset.downloading = 'false';
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.style.backgroundColor = PIN_RED;
      }, 1500);

    } catch (error) {
      console.error('[KlickPin] Download error:', error);
      
      // Better error message for connection refused
      let errorMessage = error.message;
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        errorMessage = 'Cannot connect to server. Please make sure your server is running on localhost:3000';
      }
      
      alert(`Download failed: ${errorMessage}`);
      
      // Reset button
      button.disabled = false;
      button.dataset.downloading = 'false';
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      button.style.backgroundColor = PIN_RED;
    }
  }

  // Initialize when page loads
  function init() {
    console.log('[KlickPin] Content script loaded on:', window.location.href);
    
    // Check if we're on a pin page
    if (!window.location.href.includes('/pin/')) {
      console.log('[KlickPin] Not a pin page, skipping injection');
      return;
    }

    // Try immediate injection
    injectDownloadButton();

    // Also try with delays (Pinterest loads content dynamically)
    setTimeout(injectDownloadButton, 1000);
    setTimeout(injectDownloadButton, 2000);
    setTimeout(injectDownloadButton, 3000);
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
      console.log('[KlickPin] URL changed, re-injecting:', url);
      lastUrl = url;
      setTimeout(injectDownloadButton, 500);
      setTimeout(injectDownloadButton, 1500);
      setTimeout(injectDownloadButton, 2500);
    }
  });
  urlObserver.observe(document, { subtree: true, childList: true });

  // Also observe for DOM changes that might indicate new content loaded
  const domObserver = new MutationObserver(() => {
    if (location.href.includes('/pin/')) {
      const existingBtn = document.querySelector('[data-klickpin="true"]');
      if (!existingBtn) {
        injectDownloadButton();
      }
    }
  });
  domObserver.observe(document.body || document.documentElement, { 
    subtree: true, 
    childList: true 
  });

})();
