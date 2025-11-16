# KlickPin Chrome Extension - Complete Implementation Guide

## Project Overview

Create a Chrome extension for KlickPin that adds a download button to Pinterest pin pages. The button appears to the right of the share icon and downloads media directly when clicked.

**Target:** Individual Pinterest pin pages only (e.g., `pinterest.com/pin/...`)

**API Base URL:** `https://klickpin.com/api` (or your production API URL)

---

## API Integration

### Endpoints Used

1. **Main Download Endpoint**
   - **URL:** `POST /api/download`
   - **Request Body:**
     ```json
     {
       "url": "https://pinterest.com/pin/123456789/",
       "platform": "pinterest"
     }
     ```
   - **Response:** Streaming JSON with media items
   - **Response Format:**
     ```json
     {
       "data": [
         {
           "type": "image" | "video",
           "url": "https://...",
           "extension": "jpg" | "mp4",
           "thumbnail": "https://...",
           "width": 1080,
           "height": 1920
         }
       ]
     }
     ```

2. **File Download Proxy**
   - **URL:** `GET /api/download-file?url={encoded_url}&format={format}&type={type}`
   - **Purpose:** CORS bypass for downloading files
   - **Returns:** Blob/File stream

### API Response Handling

- Parse streaming JSON response
- Filter duplicates by URL
- For images: Prefer URLs containing "orig" or "original"
- For videos: Use first available video
- Download best quality available (original format)

---

## Theme & Styling

### Color Scheme (Pinterest Red Theme)

- **Primary Red:** `#BD081C` (Pinterest red)
- **Hover Red:** `#A00715` (darker red)
- **Background:** `#F5F5F5` (light gray)
- **Text:** `#0B1726` (dark gray/black)
- **White:** `#FFFFFF`

### Typography

- **Font Family:** System fonts (inherit from Pinterest)
- **Button Font:** 600 weight (semibold)
- **Icon Size:** 20px (1.25rem)

### Button Styling

```css
/* Download Button */
- Background: #BD081C (Pinterest red)
- Color: White (#FFFFFF)
- Border: None
- Border Radius: 8px
- Padding: 8px 12px
- Font Size: 14px
- Font Weight: 600
- Hover: Background #A00715
- Transition: 0.2s ease
- Display: inline-flex
- Align Items: center
- Gap: 6px
```

### Icon Styling

- Use Font Awesome icon: `FaDownload` from `react-icons/fa`
- Size: 16px (1rem)
- Color: White
- Vertical alignment: center

---

## Chrome Extension Structure

### File Structure

```
klickpin-extension/
├── manifest.json
├── background.js
├── content.js
├── popup.html (optional - for settings)
├── styles/
│   └── content.css
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── icon-256.png
└── README.md
```

---

## Manifest.json

```json
{
  "manifest_version": 3,
  "name": "KlickPin - Pinterest Downloader",
  "version": "1.0.0",
  "description": "Download Pinterest pins directly with one click. Not affiliated with Pinterest.",
  "permissions": [
    "activeTab",
    "downloads",
    "storage"
  ],
  "host_permissions": [
    "https://pinterest.com/*",
    "https://*.pinterest.com/*",
    "https://pin.it/*",
    "https://klickpin.com/*"
  ],
  "content_scripts": [
    {
      "matches": [
        "https://pinterest.com/pin/*",
        "https://*.pinterest.com/pin/*"
      ],
      "js": ["content.js"],
      "css": ["styles/content.css"],
      "run_at": "document_idle"
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    },
    "default_title": "KlickPin - Pinterest Downloader"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
    "256": "icons/icon-256.png"
  },
  "web_accessible_resources": [
    {
      "resources": ["icons/*"],
      "matches": ["https://pinterest.com/*", "https://*.pinterest.com/*"]
    }
  ]
}
```

---

## Content Script Implementation

### content.js

```javascript
// KlickPin Chrome Extension - Content Script
// Injects download button into Pinterest pin pages

(function() {
  'use strict';

  const API_BASE_URL = 'https://klickpin.com/api'; // Change to your API URL
  const PIN_PAGE_SELECTOR = '[data-test-id="pin"]';
  const SHARE_BUTTON_SELECTOR = '[data-test-id="share-button"], button[aria-label*="Share"], button[aria-label*="share"]';
  
  // Pinterest red color
  const PIN_RED = '#BD081C';
  const PIN_RED_HOVER = '#A00715';

  // Create download button
  function createDownloadButton() {
    const button = document.createElement('button');
    button.className = 'klickpin-download-btn';
    button.setAttribute('aria-label', 'Download pin with KlickPin');
    button.setAttribute('title', 'Download pin with KlickPin');
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15.577l-3.539-3.538 1.414-1.414L11 12.586V4h2v8.586l1.125-1.125 1.414 1.414L12 15.577z" fill="currentColor"/>
        <path d="M19 9v10H5V9H3v11a1 1 0 001 1h16a1 1 0 001-1V9h-2z" fill="currentColor"/>
      </svg>
      <span class="klickpin-download-text">Download</span>
    `;
    
    // Style the button
    Object.assign(button.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: PIN_RED,
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      fontFamily: 'inherit',
      lineHeight: '1',
      marginLeft: '8px'
    });

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = PIN_RED_HOVER;
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = PIN_RED;
    });

    button.addEventListener('click', handleDownload);

    return button;
  }

  // Inject button next to share button
  function injectDownloadButton() {
    // Wait for Pinterest's UI to load
    const checkForShareButton = setInterval(() => {
      const shareButton = document.querySelector(SHARE_BUTTON_SELECTOR);
      const existingDownloadBtn = document.querySelector('.klickpin-download-btn');
      
      if (shareButton && !existingDownloadBtn) {
        // Find the parent container (usually a button group)
        const shareButtonParent = shareButton.closest('div[role="button"]')?.parentElement 
          || shareButton.parentElement 
          || shareButton.closest('[data-test-id="action-bar"]')
          || shareButton.closest('div[class*="button"]');
        
        if (shareButtonParent) {
          const downloadBtn = createDownloadButton();
          shareButtonParent.appendChild(downloadBtn);
          clearInterval(checkForShareButton);
        }
      }
    }, 500);

    // Stop checking after 10 seconds
    setTimeout(() => clearInterval(checkForShareButton), 10000);
  }

  // Handle download
  async function handleDownload(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.currentTarget;
    const originalText = button.querySelector('.klickpin-download-text')?.textContent;
    
    // Update button state
    button.disabled = true;
    button.style.opacity = '0.7';
    button.style.cursor = 'not-allowed';
    if (button.querySelector('.klickpin-download-text')) {
      button.querySelector('.klickpin-download-text').textContent = 'Downloading...';
    }

    try {
      const currentUrl = window.location.href;
      
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
        throw new Error('Failed to fetch media');
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

      // Download file via proxy
      const downloadUrl = `${API_BASE_URL}/download-file?url=${encodeURIComponent(mediaItem.url)}&type=${mediaItem.type}&format=${mediaItem.extension || (mediaItem.type === 'image' ? 'jpg' : 'mp4')}`;
      
      // Use Chrome downloads API
      chrome.runtime.sendMessage({
        action: 'download',
        url: downloadUrl,
        filename: `pinterest-${mediaItem.type}-${Date.now()}.${mediaItem.extension || (mediaItem.type === 'image' ? 'jpg' : 'mp4')}`
      });

      // Show success feedback
      if (button.querySelector('.klickpin-download-text')) {
        button.querySelector('.klickpin-download-text').textContent = 'Downloaded!';
      }
      setTimeout(() => {
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        if (button.querySelector('.klickpin-download-text')) {
          button.querySelector('.klickpin-download-text').textContent = originalText;
        }
      }, 2000);

    } catch (error) {
      console.error('KlickPin download error:', error);
      alert(`Download failed: ${error.message}`);
      
      // Reset button
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      if (button.querySelector('.klickpin-download-text')) {
        button.querySelector('.klickpin-download-text').textContent = originalText;
      }
    }
  }

  // Initialize when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectDownloadButton);
  } else {
    injectDownloadButton();
  }

  // Re-inject on navigation (Pinterest is SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(injectDownloadButton, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

})();
```

---

## Background Service Worker

### background.js

```javascript
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
    // Already on pin page, do nothing or show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-48.png',
      title: 'KlickPin',
      message: 'Click the download button on the pin to download!'
    });
  }
});
```

---

## Content CSS

### styles/content.css

```css
/* KlickPin Download Button Styles */

.klickpin-download-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  background-color: #BD081C !important;
  color: #FFFFFF !important;
  border: none !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
  font-size: 14px !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: background-color 0.2s ease !important;
  font-family: inherit !important;
  line-height: 1 !important;
  margin-left: 8px !important;
  vertical-align: middle !important;
}

.klickpin-download-btn:hover:not(:disabled) {
  background-color: #A00715 !important;
}

.klickpin-download-btn:disabled {
  opacity: 0.7 !important;
  cursor: not-allowed !important;
}

.klickpin-download-btn svg {
  width: 16px !important;
  height: 16px !important;
  fill: currentColor !important;
  flex-shrink: 0 !important;
}

.klickpin-download-text {
  white-space: nowrap !important;
}

/* Ensure button doesn't break Pinterest layout */
.klickpin-download-btn {
  box-sizing: border-box !important;
  max-width: 120px !important;
}
```

---

## Icon Assets

Create icons in these sizes:
- **16x16px** - Toolbar icon
- **48x48px** - Extension management
- **128x128px** - Chrome Web Store
- **256x256px** - High DPI displays

**Design:** Pinterest red (#BD081C) background with white download icon or "KP" monogram.

---

## Risk Mitigation Strategies

### 1. Chrome Web Store Approval

**Store Listing:**
- **Name:** "KlickPin - Pinterest Downloader"
- **Description:** "One-click download for Pinterest pins. Download images and videos directly from Pinterest pin pages. Not affiliated with Pinterest."
- **Privacy Policy:** Link to your privacy policy page
- **Screenshots:** Show button placement, download process
- **Category:** Productivity or Utilities

**Key Points to Emphasize:**
- User-initiated downloads only (no automatic downloads)
- Clear disclaimer: "Not affiliated with Pinterest"
- Respects user privacy (no data collection)
- Only works on public Pinterest content
- Users responsible for copyright compliance

### 2. Pinterest Terms Compliance

**In Extension:**
- Add disclaimer in button tooltip: "Download for personal use only"
- Don't modify Pinterest's core functionality
- Don't scrape or bulk download
- Only inject minimal UI (single button)
- Use Pinterest's existing share button as reference point

**Legal Protection:**
- Clear Terms of Service on your website
- User agreement that they own/have permission for content
- DMCA compliance statement
- Regular monitoring for policy changes

### 3. Technical Best Practices

- **Error Handling:** Graceful failures, user-friendly messages
- **Rate Limiting:** Respect API rate limits
- **Performance:** Minimal DOM manipulation
- **Security:** Sanitize URLs, validate responses
- **Updates:** Version management, backward compatibility

---

## Testing Checklist

- [ ] Button appears on individual pin pages
- [ ] Button positioned correctly (right of share button)
- [ ] Button styling matches Pinterest red theme
- [ ] Download works for images
- [ ] Download works for videos
- [ ] Error handling for failed downloads
- [ ] Button state changes (loading, success, error)
- [ ] Works on different Pinterest domains (.com, .co.uk, etc.)
- [ ] Works on mobile Pinterest (if applicable)
- [ ] No conflicts with Pinterest's JavaScript
- [ ] No console errors
- [ ] Performance impact is minimal

---

## Chrome Web Store Submission

### Required Information

1. **Extension Package:** ZIP file with all files
2. **Store Listing:**
   - Title: "KlickPin - Pinterest Downloader"
   - Description: (see above)
   - Category: Productivity
   - Language: English
   - Screenshots: 1-5 images (1280x800 or 640x400)
   - Promotional Images: 920x680, 440x280
3. **Privacy Practices:**
   - Single purpose: Yes (download Pinterest pins)
   - Host permissions: Only Pinterest and your API domain
   - User data: None collected
4. **Distribution:**
   - Visibility: Public or Unlisted
   - Regions: All or specific countries

### Review Process Tips

- **Be Transparent:** Clearly state what the extension does
- **Privacy First:** Emphasize no data collection
- **User Control:** Highlight user-initiated actions only
- **Compliance:** Reference your Terms of Service
- **Support:** Provide contact email for support

---

## API Configuration

### Environment Variables

```javascript
// In content.js, set your production API URL
const API_BASE_URL = 'https://klickpin.com/api'; // Production
// const API_BASE_URL = 'http://localhost:4000/api'; // Development
```

### CORS Configuration

Ensure your backend API allows requests from Chrome extension origins:
- Extension ID will be different for each installation
- Consider using `*` for extension origins or specific handling
- Or use `chrome.identity` API for authenticated requests

---

## Additional Features (Optional)

### 1. Settings Page
- Allow users to choose download location
- Format preferences (MP4, JPG, etc.)
- Quality selection

### 2. Download History
- Track downloaded pins
- Prevent duplicate downloads
- Show download status

### 3. Keyboard Shortcut
- Add `Ctrl+D` (or `Cmd+D`) to download current pin

### 4. Notification System
- Show download progress
- Success/failure notifications

---

## Support & Maintenance

### Version Updates

- Monitor Pinterest UI changes (they update frequently)
- Update selectors if Pinterest changes DOM structure
- Test on new Pinterest features
- Keep API endpoints updated

### User Support

- Provide clear error messages
- Log errors for debugging (without user data)
- Create FAQ page
- Support email: support@klickpin.com

---

## Security Considerations

1. **URL Validation:** Verify URLs are Pinterest pins before processing
2. **XSS Prevention:** Sanitize all user inputs
3. **API Security:** Use HTTPS only
4. **Content Security Policy:** Configure CSP in manifest
5. **Permissions:** Request minimal permissions needed

---

## Performance Optimization

1. **Lazy Loading:** Only inject button when needed
2. **Debouncing:** Prevent multiple rapid clicks
3. **Caching:** Cache API responses where appropriate
4. **Minimal DOM:** Keep injected elements minimal
5. **Efficient Selectors:** Use specific, fast selectors

---

## Complete Implementation Steps

1. **Setup Project:**
   - Create extension directory
   - Initialize with manifest.json
   - Set up file structure

2. **Create Assets:**
   - Design and export icons (16, 48, 128, 256px)
   - Create CSS file
   - Prepare screenshots for store

3. **Implement Content Script:**
   - Write content.js with button injection
   - Add error handling
   - Test on Pinterest pages

4. **Implement Background:**
   - Create background.js
   - Handle download messages
   - Test download functionality

5. **Styling:**
   - Match Pinterest red theme
   - Ensure responsive design
   - Test on different screen sizes

6. **Testing:**
   - Test on various pin types (image, video, GIF)
   - Test error scenarios
   - Test on different Pinterest domains
   - Performance testing

7. **Documentation:**
   - Write README
   - Create user guide
   - Document API integration

8. **Store Submission:**
   - Prepare store listing
   - Create screenshots
   - Write privacy policy
   - Submit for review

---

## Notes for Developer

- **Pinterest UI Changes:** Pinterest frequently updates their UI. The selectors in content.js may need updates.
- **API Rate Limiting:** Implement rate limiting to prevent abuse
- **User Education:** Make it clear users are responsible for copyright compliance
- **Monitoring:** Track download success rates and errors
- **Updates:** Plan for regular updates as Pinterest changes

---

## Contact & Support

For questions or issues during implementation:
- Check existing KlickPin web app codebase for reference
- Review API documentation
- Test API endpoints independently before integration

---

**End of Specification Document**