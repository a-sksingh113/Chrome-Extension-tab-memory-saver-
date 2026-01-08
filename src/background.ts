

// ==================== INTERFACES ====================

interface TabTimestamp {
  [tabId: number]: number;
}

interface ExtensionSettings {
  enabled: boolean;
  inactivityTime: number; // in minutes
  whitelist: string[];
}

interface SessionStats {
  discardedCount: number;
}

// ==================== CONSTANTS ====================

const ALARM_NAME = 'checkInactiveTabs';
const ALARM_INTERVAL_MINUTES = 5;

const DEFAULT_SETTINGS: ExtensionSettings = {
  enabled: true,
  inactivityTime: 15,
  whitelist: []
};

const DEFAULT_STATS: SessionStats = {
  discardedCount: 0
};

// ==================== STATE MANAGEMENT ====================

// Store last active time for each tab
const tabTimestamps: TabTimestamp = {};

// Session-only stats (not persisted)
let sessionStats: SessionStats = { ...DEFAULT_STATS };

// ==================== INITIALIZATION ====================

/**
 * Initialize extension on install
 */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Tab Memory Saver installed/updated');
  
  // Set default settings if not already set
  const result = await chrome.storage.sync.get(['settings']);
  if (!result.settings) {
    console.log('Setting default settings');
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  } else {
    console.log('Existing settings found:', result.settings);
  }
  
  // Create periodic alarm for checking inactive tabs
  console.log(`Creating alarm: ${ALARM_NAME} with interval ${ALARM_INTERVAL_MINUTES} minutes`);
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: ALARM_INTERVAL_MINUTES
  });
  
  // Verify alarm was created
  const alarms = await chrome.alarms.getAll();
  console.log('Active alarms:', alarms);
  
  // Initialize timestamps for all existing tabs
  const tabs = await chrome.tabs.query({});
  const now = Date.now();
  tabs.forEach(tab => {
    if (tab.id) {
      tabTimestamps[tab.id] = now;
    }
  });
  console.log(`Initialized timestamps for ${tabs.length} tabs`);
});

// ==================== TAB EVENT LISTENERS ====================

/**
 * Update timestamp when a tab becomes active
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const timestamp = Date.now();
  tabTimestamps[activeInfo.tabId] = timestamp;
  console.log(`Tab ${activeInfo.tabId} activated at ${new Date(timestamp).toLocaleTimeString()}`);
});

/**
 * Update timestamp when a tab finishes loading
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    tabTimestamps[tabId] = Date.now();
  }
});

/**
 * Clean up timestamp when tab is closed
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabTimestamps[tabId];
});

// ==================== ALARM LISTENER ====================

/**
 * Periodic check for inactive tabs
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm.name);
  if (alarm.name === ALARM_NAME) {
    console.log('Running automatic tab suspension check...');
    await checkAndDiscardInactiveTabs();
  }
});

// ==================== CORE LOGIC ====================

/**
 * Check all tabs and discard inactive ones based on settings
 */
async function checkAndDiscardInactiveTabs(): Promise<void> {
  try {
    console.log('===== AUTO-SUSPENSION CHECK STARTED =====');
    console.log('Timestamp:', new Date().toLocaleString());
    
    // Get current settings
    const result = await chrome.storage.sync.get(['settings']);
    const settings: ExtensionSettings = result.settings || DEFAULT_SETTINGS;
    console.log('Settings:', settings);
    
    // Exit if extension is disabled
    if (!settings.enabled) {
      console.log('Extension is disabled, skipping auto-suspension');
      return;
    }
    
    // Get all tabs
    const tabs = await chrome.tabs.query({});
    const currentTime = Date.now();
    const inactivityThreshold = settings.inactivityTime * 60 * 1000; // Convert to milliseconds
    console.log(`Found ${tabs.length} tabs`);
    console.log(`Inactivity threshold: ${settings.inactivityTime} minutes (${inactivityThreshold}ms)`);
    
    // Get active tab
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTabId = activeTabs.length > 0 && activeTabs[0].id ? activeTabs[0].id : null;
    console.log('Active tab ID:', activeTabId);
    
    // Check each tab
    for (const tab of tabs) {
      if (!tab.id) continue;
      
      // Skip if should not be discarded
      const shouldDiscard = shouldDiscardTab(tab, activeTabId, settings.whitelist);
      if (!shouldDiscard) {
        console.log(`Tab ${tab.id} (${tab.title}): SKIP - safety rule`);
        continue;
      }
      
      // Get last active time
      const lastActive = tabTimestamps[tab.id] || currentTime;
      const inactiveTime = currentTime - lastActive;
      const inactiveMinutes = Math.floor(inactiveTime / 60000);
      
      console.log(`Tab ${tab.id} (${tab.title}):`);
      console.log(`  - Last active: ${new Date(lastActive).toLocaleTimeString()}`);
      console.log(`  - Inactive for: ${inactiveMinutes} minutes (${inactiveTime}ms)`);
      console.log(`  - Threshold: ${settings.inactivityTime} minutes (${inactivityThreshold}ms)`);
      
      // Discard if inactive longer than threshold
      if (inactiveTime >= inactivityThreshold) {
        console.log(`  - ACTION: DISCARDING tab ${tab.id}`);
        await discardTab(tab.id);
      } else {
        console.log(`  - ACTION: KEEPING (not inactive long enough)`);
      }
    }
    
    console.log('===== AUTO-SUSPENSION CHECK COMPLETED =====');
  } catch (error) {
    console.error('Error checking inactive tabs:', error);
  }
}

/**
 * Determine if a tab should be discarded
 */
function shouldDiscardTab(
  tab: chrome.tabs.Tab,
  activeTabId: number | null,
  whitelist: string[]
): boolean {
  // Never discard if no tab ID
  if (!tab.id) {
    console.log(`  ❌ No tab ID`);
    return false;
  }
  
  // Never discard active tab
  if (tab.id === activeTabId || tab.active) {
    console.log(`  ❌ Tab is active`);
    return false;
  }
  
  // Never discard already discarded tabs
  if (tab.discarded) {
    console.log(`  ❌ Already discarded`);
    return false;
  }
  
  // Never discard pinned tabs
  if (tab.pinned) {
    console.log(`  ❌ Tab is pinned`);
    return false;
  }
  
  // Never discard tabs playing audio
  if (tab.audible) {
    console.log(`  ❌ Tab is playing audio`);
    return false;
  }
  
  // Never discard internal browser pages
  if (tab.url) {
    const url = tab.url.toLowerCase();
    if (
      url.startsWith('chrome://') ||
      url.startsWith('edge://') ||
      url.startsWith('about:') ||
      url.startsWith('chrome-extension://')
    ) {
      console.log(`  ❌ Internal browser page: ${url}`);
      return false;
    }
  }
  
  // Check whitelist
  if (tab.url && isWhitelisted(tab.url, whitelist)) {
    console.log(`  ❌ Whitelisted domain`);
    return false;
  }
  
  console.log(`  ✅ CAN BE DISCARDED`);
  return true;
}

/**
 * Check if a URL matches the whitelist
 */
function isWhitelisted(url: string, whitelist: string[]): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    return whitelist.some(domain => {
      const cleanDomain = domain.trim().toLowerCase();
      if (!cleanDomain) return false;
      
      // Exact match or subdomain match
      return hostname === cleanDomain || hostname.endsWith('.' + cleanDomain);
    });
  } catch (error) {
    // Invalid URL, don't whitelist
    return false;
  }
}

/**
 * Discard a tab and update stats
 */
async function discardTab(tabId: number): Promise<void> {
  try {
    // Add visual indicator before discarding
    const tab = await chrome.tabs.get(tabId);
    if (tab.title && !tab.title.startsWith('💤 ')) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            if (!document.title.startsWith('💤 ')) {
              document.title = `💤 ${document.title}`;
            }
          }
        });
      } catch (e) {
        console.log('Could not inject title script (tab may not support it):', e);
      }
    }
    
    await chrome.tabs.discard(tabId);
    sessionStats.discardedCount++;
    console.log(`Discarded tab ${tabId}. Total: ${sessionStats.discardedCount}`);
  } catch (error) {
    console.error(`Error discarding tab ${tabId}:`, error);
  }
}

/**
 * Manually discard all inactive tabs (triggered from popup)
 */
async function discardAllInactiveTabs(): Promise<number> {
  try {
    console.log('discardAllInactiveTabs called');
    const result = await chrome.storage.sync.get(['settings']);
    const settings: ExtensionSettings = result.settings || DEFAULT_SETTINGS;
    console.log('Current settings:', settings);
    
    if (!settings.enabled) {
      console.log('Extension is disabled, skipping');
      return 0;
    }
    
    const tabs = await chrome.tabs.query({});
    console.log(`Found ${tabs.length} total tabs`);
    
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTabId = activeTabs.length > 0 && activeTabs[0].id ? activeTabs[0].id : null;
    console.log('Active tab ID:', activeTabId);
    
    let discardedCount = 0;
    
    for (const tab of tabs) {
      if (!tab.id) continue;
      
      console.log(`\n--- Checking Tab ${tab.id}: "${tab.title}" ---`);
      console.log(`URL: ${tab.url}`);
      console.log(`Active: ${tab.active}, Pinned: ${tab.pinned}, Audible: ${tab.audible}, Discarded: ${tab.discarded}`);
      
      const shouldDiscard = shouldDiscardTab(tab, activeTabId, settings.whitelist);
      console.log(`Final decision: ${shouldDiscard ? 'WILL DISCARD' : 'WILL NOT DISCARD'}`);
      
      if (shouldDiscard) {
        console.log(`Attempting to discard tab ${tab.id}`);
        await discardTab(tab.id);
        discardedCount++;
      }
    }
    
    console.log(`Total tabs discarded: ${discardedCount}`);
    return discardedCount;
  } catch (error) {
    console.error('Error discarding all inactive tabs:', error);
    return 0;
  }
}

// ==================== MESSAGE HANDLER ====================

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received in background:', message);
  
  if (message.action === 'getStats') {
    console.log('Sending stats:', sessionStats);
    sendResponse(sessionStats);
  } else if (message.action === 'discardNow') {
    console.log('discardNow action triggered');
    discardAllInactiveTabs().then(count => {
      console.log('Discard completed, count:', count);
      sendResponse({ success: true, count });
    }).catch(error => {
      console.error('Discard failed:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep message channel open for async response
  }
  
  return false;
});

// ==================== TESTING FUNCTIONS ====================

/**
 * Test function to manually discard a specific tab
 * Run in console: testDiscardTab(TAB_ID)
 */
(globalThis as any).testDiscardTab = async (tabId: number) => {
  console.log(`Testing discard for tab ${tabId}`);
  try {
    const tab = await chrome.tabs.get(tabId);
    console.log('Tab before discard:', tab);
    console.log('Tab discarded status:', tab.discarded);
    
    await chrome.tabs.discard(tabId);
    console.log('Discard command sent successfully');
    
    // Check tab after discard
    setTimeout(async () => {
      const tabAfter = await chrome.tabs.get(tabId);
      console.log('Tab after discard:', tabAfter);
      console.log('Tab discarded status after:', tabAfter.discarded);
    }, 1000);
  } catch (error) {
    console.error('Error testing discard:', error);
  }
};

/**
 * Test function to list all tabs with their states
 * Run in console: listAllTabs()
 */
(globalThis as any).listAllTabs = async () => {
  const tabs = await chrome.tabs.query({});
  console.log(`Total tabs: ${tabs.length}`);
  tabs.forEach(tab => {
    console.log(`Tab ${tab.id}: ${tab.title}`);
    console.log(`  - URL: ${tab.url}`);
    console.log(`  - Active: ${tab.active}`);
    console.log(`  - Pinned: ${tab.pinned}`);
    console.log(`  - Discarded: ${tab.discarded}`);
    console.log(`  - Audible: ${tab.audible}`);
    console.log(`  - Last active: ${tabTimestamps[tab.id!] ? new Date(tabTimestamps[tab.id!]).toLocaleTimeString() : 'Unknown'}`);
  });
};

/**
 * Test function to manually trigger auto-suspension check
 * Run in console: testAutoSuspend()
 */
(globalThis as any).testAutoSuspend = async () => {
  console.log('Manually triggering auto-suspension check...');
  await checkAndDiscardInactiveTabs();
};

console.log('Test functions loaded:');
console.log('  - testDiscardTab(tabId) - Test discarding a specific tab');
console.log('  - listAllTabs() - List all tabs with their states');
console.log('  - testAutoSuspend() - Manually trigger auto-suspension check');
