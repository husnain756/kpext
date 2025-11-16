# KlickPin Chrome Extension

A Chrome extension that adds a download button to Pinterest pin pages, allowing users to download images and videos directly with one click.

## Features

- ✅ One-click download button on Pinterest pin pages
- ✅ Supports both images and videos
- ✅ Downloads original quality media when available
- ✅ Pinterest red theme matching the site's design
- ✅ Automatic button injection on page navigation (SPA support)
- ✅ User-friendly error handling and feedback

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `kpext` directory
6. The extension should now be installed and active

### From Chrome Web Store

*Coming soon - extension will be available on the Chrome Web Store*

## Usage

1. Navigate to any Pinterest pin page (e.g., `https://pinterest.com/pin/123456789/`)
2. Look for the red "Download" button next to the share button
3. Click the button to download the pin's media
4. The file will be saved to your default downloads folder

## Requirements

- Google Chrome (version 88+)
- Active internet connection
- Access to `https://klickpin.com/api` (API endpoint)

## File Structure

```
kpext/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── content.js             # Content script (button injection)
├── styles/
│   └── content.css        # Button styling
├── icons/
│   ├── icon-16.png        # 16x16 icon
│   ├── icon-48.png        # 48x48 icon
│   ├── icon-128.png       # 128x128 icon
│   └── icon-256.png       # 256x256 icon
└── README.md              # This file
```

## API Configuration

The extension uses the KlickPin API at `https://klickpin.com/api`. To change the API endpoint, edit the `API_BASE_URL` constant in `content.js`:

```javascript
const API_BASE_URL = 'https://klickpin.com/api'; // Change this to your API URL
```

## Permissions

The extension requires the following permissions:

- **activeTab**: To access the current Pinterest tab
- **downloads**: To download files to your computer
- **storage**: For extension settings (future use)
- **Host permissions**: Access to Pinterest and KlickPin API domains

## Development

### Testing

1. Load the extension in developer mode
2. Navigate to a Pinterest pin page
3. Open Chrome DevTools (F12) to see console logs
4. Test the download functionality

### Building for Production

1. Ensure all files are in place
2. Test thoroughly on various Pinterest pin types
3. Create a ZIP file of the extension directory
4. Submit to Chrome Web Store (if publishing)

## Troubleshooting

### Button doesn't appear

- Make sure you're on a Pinterest pin page (URL contains `/pin/`)
- Refresh the page
- Check browser console for errors
- Verify extension is enabled in `chrome://extensions/`

### Download fails

- Check internet connection
- Verify API endpoint is accessible
- Check browser console for error messages
- Ensure the pin has downloadable media

### Button appears but doesn't work

- Check browser console for JavaScript errors
- Verify API endpoint is correct in `content.js`
- Check that Chrome downloads permission is granted

## Privacy

- This extension does not collect any user data
- All downloads are user-initiated
- No tracking or analytics
- API requests only contain the Pinterest URL being downloaded

## Legal Notice

- This extension is **not affiliated with Pinterest**
- Users are responsible for copyright compliance
- Downloads are for personal use only
- Respect Pinterest's Terms of Service

## Support

For issues or questions:
- Check the troubleshooting section above
- Review browser console for error messages
- Contact support at support@klickpin.com

## License

Copyright © 2024 KlickPin. All rights reserved.

## Version History

- **1.0.0** (Current)
  - Initial release
  - Basic download functionality
  - Pinterest red theme
  - SPA navigation support

---

**Note:** Pinterest frequently updates their UI. If the button doesn't appear, Pinterest may have changed their DOM structure. Please report issues so we can update the selectors.


