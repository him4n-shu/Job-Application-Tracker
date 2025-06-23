# Job Application Tracker

A Chrome extension to help you track and manage your job applications with a focus on LinkedIn, Indeed, and Naukri job sites.

## Features

- **Track Applications**: Keep track of all your job applications in one place
- **Status Management**: Update application status (Applied, Interview, Offer, Rejected)
- **Auto-Detection**: Automatically detects job application pages on LinkedIn, Indeed, and Naukri
- **Notifications**: Get notified when you're on a job application page
- **Notes**: Add notes for each application
- **Search & Filter**: Easily find applications by company, position, or status
- **Data Export/Import**: Backup and restore your application data

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The Job Application Tracker extension is now installed!

## Usage

### Adding Applications

- Click on the extension icon in your browser toolbar
- Fill out the application form with company name, position, date, and status
- Click "Save Application" to add it to your list
- When browsing LinkedIn, Indeed, or Naukri job listings, the extension will automatically detect job postings and offer to track them

### Managing Applications

- Click "View All Applications" in the popup to see all your applications
- Use the search bar and filters to find specific applications
- Click "View/Edit" on any application to update its details or delete it

### Settings

- Access the settings page to configure notifications and job site detection
- Enable/disable automatic detection of job application pages
- Add custom job sites to detect
- Set reminder intervals for follow-ups

### Data Management

- Export your data as a JSON file for backup
- Import previously exported data
- Clear all data if needed

## Development

### File Structure

```
├── manifest.json       # Extension configuration
├── background.js       # Background service worker
├── content.js          # Content script for job site detection
├── popup/              # Popup UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/            # Options page
│   ├── options.html
│   ├── options.js
│   └── options.css
└── icons/              # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Permissions

This extension requires the following permissions:
- **storage**: To save your job applications and settings
- **notifications**: To notify you about detected job applications
- **tabs**: To open the options page and detect the current URL
- **scripting**: To customize job site detection

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Feel free to submit a pull request or open an issue. 