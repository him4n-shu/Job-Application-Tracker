// Background script for Job Application Tracker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Job Application Tracker extension installed');
  
  // Initialize storage with empty applications array if not exists
  chrome.storage.sync.get('applications', (data) => {
    if (!data.applications) {
      chrome.storage.sync.set({ applications: [] });
    }
  });

  // Initialize settings if not exists
  chrome.storage.sync.get('settings', (data) => {
    if (!data.settings) {
      chrome.storage.sync.set({ 
        settings: {
          notifications: true,
          followUpDays: 7,
          autoDetect: true,
          autoSave: true,
          jobSites: []
        } 
      });
    }
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getApplications') {
    chrome.storage.sync.get('applications', (data) => {
      sendResponse({ applications: data.applications || [] });
    });
    return true; // Required for async sendResponse
  }
  
  if (message.action === 'possibleJobApplication') {
    // Check if notifications are enabled in settings
    chrome.storage.sync.get('settings', (data) => {
      const settings = data.settings || { notifications: true };
      
      if (settings.notifications) {
        // Show notification for detected job application
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png', // Using your existing icon128.png
          title: 'Job Application Detected',
          message: `Detected possible job at ${message.job.company}: ${message.job.title}`,
          buttons: [
            { title: 'Track Application' },
            { title: 'Ignore' }
          ],
          priority: 0
        });
      }
      
      // Store detected job temporarily regardless of notification settings
      chrome.storage.local.set({ 'detectedJob': message.job });
    });
    
    return true;
  }
  
  if (message.action === 'jobApplicationSubmitted') {
    // Automatically save the job application when submission is detected
    chrome.storage.sync.get(['settings', 'applications'], (data) => {
      const settings = data.settings || { autoSave: true };
      const applications = data.applications || [];
      
      // Only auto-save if the setting is enabled
      if (settings.autoSave) {
        // Create application object
        const application = {
          id: Date.now(), // Use timestamp as unique ID
          company: message.job.company,
          position: message.job.title,
          date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
          status: 'applied',
          notes: `Automatically tracked from ${message.job.source}\nURL: ${message.job.url}`,
          created: new Date().toISOString(),
          source: message.job.source,
          url: message.job.url
        };
        
        // Check if this job is already saved (avoid duplicates)
        const isDuplicate = applications.some(app => 
          app.company === application.company && 
          app.position === application.position &&
          // Consider it a duplicate if added in the last 24 hours
          new Date(app.created) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );
        
        if (!isDuplicate) {
          // Add to applications list
          applications.push(application);
          
          // Save updated applications list
          chrome.storage.sync.set({ applications }, () => {
            console.log('Job application automatically saved:', application);
            
            // Show confirmation notification
            if (settings.notifications) {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Job Application Tracked',
                message: `Automatically tracked your application to ${application.company} for ${application.position}`,
                priority: 0
              });
            }
          });
        } else {
          console.log('Duplicate job application detected, not saving again');
        }
      }
    });
    
    return true;
  }
});

// Listen for notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) { // Track Application button
    // Get the detected job
    chrome.storage.local.get('detectedJob', (data) => {
      if (data.detectedJob) {
        // Get existing applications
        chrome.storage.sync.get('applications', (appData) => {
          const applications = appData.applications || [];
          
          // Create application object
          const application = {
            id: Date.now(), // Use timestamp as unique ID
            company: data.detectedJob.company,
            position: data.detectedJob.title,
            date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
            status: 'applied',
            notes: `Tracked from ${data.detectedJob.source}\nURL: ${data.detectedJob.url}`,
            created: new Date().toISOString(),
            source: data.detectedJob.source,
            url: data.detectedJob.url
          };
          
          // Add to applications list
          applications.push(application);
          
          // Save updated applications list
          chrome.storage.sync.set({ applications }, () => {
            console.log('Job application saved from notification:', application);
            
            // Clear the detected job
            chrome.storage.local.remove('detectedJob');
          });
        });
      }
    });
  } else if (buttonIndex === 1) { // Ignore button
    // Clear the detected job
    chrome.storage.local.remove('detectedJob');
  }
}); 