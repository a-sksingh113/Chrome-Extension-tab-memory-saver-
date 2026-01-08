# Tab Memory Saver

A production-ready Chrome extension that automatically suspends inactive tabs to reduce memory consumption and improve browser performance.

## Overview

Tab Memory Saver is a lightweight Chrome extension built with TypeScript and Manifest V3 that monitors tab activity and automatically discards inactive tabs after a user-defined period. The extension helps users manage browser memory efficiently while maintaining a seamless browsing experience.

## Features

- **Automatic Tab Suspension**: Discards inactive tabs after a configurable time period
- **Manual Suspension**: Immediately suspend all inactive tabs with one click
- **Customizable Timeouts**: Choose from preset intervals (1, 2, 5, 10, 15, 30 minutes) or set a custom value
- **Smart Safety Rules**: Never suspends active, pinned, or audio-playing tabs
- **URL Whitelist**: Exclude specific domains from automatic suspension
- **Session Statistics**: Track the number of tabs suspended in the current session
- **Visual Indicators**: Suspended tabs are marked with a sleep indicator in the title
- **Seamless Restoration**: Tabs reload instantly when clicked

## Project Structure

```
Tab Memory Saver/
├── src/
│   ├── background.ts          # Service worker with tab management logic
│   └── popup.ts               # Popup UI logic and settings management
├── public/
│   ├── popup.html             # Extension popup interface
│   ├── popup.css              # Popup styling
│   └── icons/                 # Extension icons (16, 32, 48, 128px)
├── dist/                      # Compiled JavaScript output
│   ├── background.js
│   └── popup.js
├── manifest.json              # Chrome extension configuration
├── package.json               # Node.js dependencies and scripts
├── tsconfig.json              # TypeScript compiler configuration
└── README.md                  # Project documentation
```

## File Structure

### Source Files (src/)

**background.ts** (400+ lines)
- Service worker that runs persistently in the background
- Manages tab activity tracking using timestamps
- Implements alarm-based periodic checks every 5 minutes
- Handles tab discard logic with safety rules
- Processes messages from the popup UI
- Tracks session statistics

**popup.ts** (260+ lines)
- Manages the extension popup user interface
- Handles settings persistence via chrome.storage.sync
- Implements event listeners for user interactions
- Communicates with background service worker via message passing
- Updates UI with real-time statistics

### Public Files (public/)

**popup.html**
- Extension popup interface structure
- Enable/disable toggle switch
- Time interval selector with dropdown and custom input
- URL whitelist textarea
- Manual suspension button
- Statistics display

**popup.css** (250+ lines)
- Modern, clean styling for popup interface
- Custom toggle switch design
- Responsive input components
- Professional color scheme

### Configuration Files

**manifest.json**
- Manifest V3 configuration
- Permissions: tabs, storage, alarms, scripting
- Host permissions for all URLs
- Service worker registration
- Extension metadata and icons

**tsconfig.json**
- TypeScript compiler settings
- Strict type checking enabled
- ES2020 target for modern JavaScript
- Source maps for debugging

**package.json**
- TypeScript 5.3.3 dependency
- Chrome types for API definitions
- Build, watch, and clean scripts

## Architecture & Concept

### Core Components

#### 1. Tab Activity Tracking
The extension maintains an in-memory map of tab IDs to their last activity timestamps. Tabs are considered "inactive" when they haven't been accessed for the configured duration.

```
tabTimestamps: { [tabId: number]: number }
```

#### 2. Alarm-Based Checking
Instead of continuous polling, the extension uses Chrome's alarm API to perform periodic checks every 5 minutes, minimizing CPU usage and power consumption.

```
chrome.alarms.create('checkInactiveTabs', { periodInMinutes: 5 })
```

#### 3. Safety Rules
Before discarding any tab, the extension verifies multiple safety conditions:
- Tab is not currently active
- Tab is not pinned
- Tab is not playing audio
- Tab is not already discarded
- Tab URL is not an internal browser page (chrome://, chrome-extension://)
- Tab domain is not in the user's whitelist

#### 4. Message Passing Architecture
The popup UI communicates with the background service worker using Chrome's message passing API:
- `getStats`: Retrieve current session statistics
- `discardNow`: Manually trigger tab suspension

#### 5. Visual Feedback
Upon suspension, the extension injects a script to prepend a sleep indicator to the document title, providing clear visual feedback in the tab bar.

### Data Flow

```
User Action (Popup) 
  → Message to Service Worker 
  → Load Settings from Storage 
  → Query All Tabs 
  → Apply Safety Rules 
  → Inject Visual Indicator 
  → Discard Tab 
  → Update Statistics 
  → Send Response to Popup
```

## Installation

### From Source

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd "Tab Memory Saver"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)
   - Click "Load unpacked"
   - Select the `Tab Memory Saver` folder
   - The extension icon will appear in your toolbar

## Usage

### Configuration

1. **Enable/Disable**: Toggle the switch to activate or deactivate automatic suspension
2. **Set Time Interval**: Choose a preset time (1-30 minutes) or enter a custom value
3. **Add Whitelist URLs**: Enter domain patterns (one per line) to exclude from suspension
   - Example: `youtube.com`, `github.com`
4. **Apply Settings**: Changes are saved automatically

### Manual Suspension

Click the "Suspend inactive tabs now" button to immediately discard all inactive tabs, regardless of the time interval setting.

### Monitoring

The popup displays the total number of tabs suspended during the current browser session.

## Development

### Build Commands

```bash
# Compile TypeScript once
npm run build

# Watch mode (auto-compile on changes)
npm run watch

# Clean compiled files
npm run clean
```

### Development Workflow

1. Make changes to TypeScript files in `src/`
2. Run `npm run build` or `npm run watch`
3. Reload the extension in `chrome://extensions/`
4. Test changes in the browser

### Debugging

**Service Worker Console**
- Navigate to `chrome://extensions/`
- Find "Tab Memory Saver"
- Click "service worker" to open DevTools
- View logs from `background.ts`

**Popup Console**
- Right-click the extension icon
- Select "Inspect popup"
- View logs from `popup.ts`

## Technical Details

### Technologies

- **Language**: TypeScript 5.3.3
- **API**: Chrome Extension Manifest V3
- **Architecture**: Service Worker + Popup
- **Storage**: chrome.storage.sync API
- **Scheduling**: chrome.alarms API
- **Tab Management**: chrome.tabs API
- **Script Injection**: chrome.scripting API

### Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Chromium-based browsers (Edge, Brave, Opera)

### Performance Considerations

- Minimal memory footprint (service worker architecture)
- Efficient alarm-based checking (not continuous polling)
- Asynchronous operations throughout
- Type-safe code with strict TypeScript checking

### Security

- No external network requests
- No data collection or analytics
- All data stored locally using Chrome's sync storage
- Scoped permissions (only what's necessary)

## Configuration Options

### Default Settings

```typescript
{
  enabled: true,              // Extension enabled by default
  inactivityTime: 15,         // 15 minutes default timeout
  whitelist: []               // No whitelisted domains
}
```

### Time Intervals

- Minimum: 1 minute (for testing)
- Maximum: No limit (custom input)
- Presets: 1, 2, 5, 10, 15, 30 minutes

## Limitations

- Cannot suspend Chrome internal pages (chrome://, chrome-extension://)
- Cannot suspend the currently active tab
- Cannot suspend tabs playing audio
- Cannot suspend pinned tabs
- Cannot suspend already discarded tabs

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with clear commit messages
4. Ensure TypeScript compiles without errors
5. Test thoroughly in Chrome
6. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues, questions, or feature requests, please open an issue on the project repository.

## Acknowledgments

Built with Chrome Extension Manifest V3 best practices and modern TypeScript standards.
