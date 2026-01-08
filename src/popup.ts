interface ExtensionSettings {
  enabled: boolean;
  inactivityTime: number;
  whitelist: string[];
}

interface SessionStats {
  discardedCount: number;
}

// ==================== DOM ELEMENTS ====================

const enableToggle = document.getElementById('enableToggle') as HTMLInputElement;
const statusText = document.getElementById('statusText') as HTMLSpanElement;
const inactivitySelect = document.getElementById('inactivityTime') as HTMLSelectElement;
const customTimeContainer = document.getElementById('customTimeContainer') as HTMLDivElement;
const customTimeInput = document.getElementById('customTimeInput') as HTMLInputElement;
const applyCustomTimeButton = document.getElementById('applyCustomTime') as HTMLButtonElement;
const whitelistInput = document.getElementById('whitelist') as HTMLTextAreaElement;
const saveButton = document.getElementById('saveButton') as HTMLButtonElement;
const discardButton = document.getElementById('discardButton') as HTMLButtonElement;
const discardedCountSpan = document.getElementById('discardedCount') as HTMLSpanElement;
const feedbackDiv = document.getElementById('feedback') as HTMLDivElement;


/**
 * Initialize popup UI when opened
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup loaded - DOMContentLoaded fired');
  console.log('Elements found:', {
    enableToggle: !!enableToggle,
    inactivitySelect: !!inactivitySelect,
    customTimeContainer: !!customTimeContainer,
    customTimeInput: !!customTimeInput,
    applyCustomTimeButton: !!applyCustomTimeButton
  });
  
  await loadSettings();
  await loadStats();
  attachEventListeners();
  
  console.log('Event listeners attached');
});


/**
 * Load settings from storage and populate UI
 */
async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(['settings']);
    const settings: ExtensionSettings = result.settings || {
      enabled: true,
      inactivityTime: 15,
      whitelist: []
    };
    
    // Update UI elements
    enableToggle.checked = settings.enabled;
    updateStatusText(settings.enabled);
    
    // Check if inactivity time is a standard option
    const standardOptions = ['1', '2', '5', '10', '15', '30'];
    if (standardOptions.includes(settings.inactivityTime.toString())) {
      inactivitySelect.value = settings.inactivityTime.toString();
      customTimeContainer.style.display = 'none';
    } else {
      // Custom time
      inactivitySelect.value = 'custom';
      customTimeInput.value = settings.inactivityTime.toString();
      customTimeContainer.style.display = 'block';
    }
    
    whitelistInput.value = settings.whitelist.join(', ');
  } catch (error) {
    console.error('Error loading settings:', error);
    showFeedback('Error loading settings', 'error');
  }
}

/**
 * Load session stats from background
 */
async function loadStats(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStats' });
    const stats: SessionStats = response || { discardedCount: 0 };
    discardedCountSpan.textContent = stats.discardedCount.toString();
  } catch (error) {
    console.error('Error loading stats:', error);
    discardedCountSpan.textContent = '0';
  }
}


/**
 * Attach event listeners to UI elements
 */
function attachEventListeners(): void {
  // Enable/disable toggle
  enableToggle.addEventListener('change', async () => {
    const enabled = enableToggle.checked;
    await updateSetting('enabled', enabled);
    updateStatusText(enabled);
    showFeedback(enabled ? 'Extension enabled' : 'Extension disabled', 'success');
  });
  
  // Save settings button
  saveButton.addEventListener('click', async () => {
    await saveSettings();
  });
  
  // Discard inactive tabs now button
  discardButton.addEventListener('click', async () => {
    await discardInactiveTabsNow();
  });
  
  // Handle inactivity time change
  inactivitySelect.addEventListener('change', async () => {
    if (inactivitySelect.value === 'custom') {
      // Show custom input
      customTimeContainer.style.display = 'block';
      customTimeInput.focus();
    } else {
      // Hide custom input and save standard time
      customTimeContainer.style.display = 'none';
      const inactivityTime = parseInt(inactivitySelect.value, 10);
      await updateSetting('inactivityTime', inactivityTime);
      showFeedback(`Inactivity time set to ${inactivityTime} minutes`, 'success');
    }
  });
  
  // Apply custom time
  applyCustomTimeButton.addEventListener('click', async () => {
    console.log('Apply button clicked!');
    console.log('Custom time input value:', customTimeInput.value);
    
    try {
      const customTime = parseInt(customTimeInput.value, 10);
      console.log('Parsed custom time:', customTime);
      
      if (isNaN(customTime) || customTime < 1 || customTime > 1440) {
        console.log('Invalid time entered');
        showFeedback('Please enter a valid time between 1-1440 minutes', 'error');
        return;
      }
      
      // Disable button during save
      applyCustomTimeButton.disabled = true;
      applyCustomTimeButton.textContent = 'Applying...';
      console.log('Button disabled, saving...');
      
      await updateSetting('inactivityTime', customTime);
      
      // Keep custom selected but show confirmation
      showFeedback(`Custom time set to ${customTime} minutes`, 'success');
      console.log('Success feedback shown');
      
      // Re-enable button
      applyCustomTimeButton.disabled = false;
      applyCustomTimeButton.textContent = 'Apply';
    } catch (error) {
      console.error('Error applying custom time:', error);
      showFeedback('Error saving custom time', 'error');
      applyCustomTimeButton.disabled = false;
      applyCustomTimeButton.textContent = 'Apply';
    }
  });
  
  // Allow Enter key to apply custom time
  customTimeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      applyCustomTimeButton.click();
    }
  });
}


/**
 * Save all settings to storage
 */
async function saveSettings(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(['settings']);
    const currentSettings: ExtensionSettings = result.settings || {
      enabled: true,
      inactivityTime: 15,
      whitelist: []
    };
    
    // Parse whitelist from textarea
    const whitelistText = whitelistInput.value;
    const whitelist = whitelistText
      .split(',')
      .map(domain => domain.trim())
      .filter(domain => domain.length > 0);
    
    // Update settings
    const newSettings: ExtensionSettings = {
      ...currentSettings,
      whitelist
    };
    
    await chrome.storage.sync.set({ settings: newSettings });
    showFeedback('Settings saved successfully', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showFeedback('Error saving settings', 'error');
  }
}

/**
 * Update a single setting
 */
async function updateSetting(key: keyof ExtensionSettings, value: boolean | number | string[]): Promise<void> {
  try {
    console.log(`Updating setting ${key} to:`, value);
    const result = await chrome.storage.sync.get(['settings']);
    const settings: ExtensionSettings = result.settings || {
      enabled: true,
      inactivityTime: 15,
      whitelist: []
    };
    
    console.log('Current settings:', settings);
    (settings as any)[key] = value;
    console.log('New settings:', settings);
    
    await chrome.storage.sync.set({ settings });
    console.log('Settings saved successfully');
    
    // Verify save
    const verify = await chrome.storage.sync.get(['settings']);
    console.log('Verified saved settings:', verify.settings);
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    throw error;
  }
}

/**
 * Manually discard all inactive tabs
 */
async function discardInactiveTabsNow(): Promise<void> {
  try {
    console.log('discardInactiveTabsNow called from popup');
    discardButton.disabled = true;
    discardButton.textContent = 'Suspending...';
    
    console.log('Sending discardNow message to background');
    const response = await chrome.runtime.sendMessage({ action: 'discardNow' });
    console.log('Response from background:', response);
    
    if (response.success) {
      const count = response.count;
      console.log(`Successfully suspended ${count} tabs`);
      showFeedback(`Suspended ${count} tab${count !== 1 ? 's' : ''}`, 'success');
      
      // Refresh stats
      await loadStats();
    } else {
      console.error('Failed to suspend tabs:', response.error);
      showFeedback('Error suspending tabs', 'error');
    }
  } catch (error) {
    console.error('Error discarding tabs:', error);
    showFeedback('Error suspending tabs', 'error');
  } finally {
    discardButton.disabled = false;
    discardButton.textContent = 'Suspend inactive tabs now';
  }
}

/**
 * Update status text based on enabled state
 */
function updateStatusText(enabled: boolean): void {
  statusText.textContent = enabled ? 'ON' : 'OFF';
  statusText.className = enabled ? 'status-on' : 'status-off';
}

/**
 * Show feedback message to user
 */
function showFeedback(message: string, type: 'success' | 'error'): void {
  feedbackDiv.textContent = message;
  feedbackDiv.className = `feedback ${type}`;
  feedbackDiv.style.display = 'block';
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    feedbackDiv.style.display = 'none';
  }, 3000);
}
