// Popup script for Job Application Tracker
document.addEventListener('DOMContentLoaded', () => {
  // Get form elements
  const form = document.getElementById('application-form');
  const companyInput = document.getElementById('company');
  const positionInput = document.getElementById('position');
  const dateInput = document.getElementById('date');
  const statusInput = document.getElementById('status');
  const notesInput = document.getElementById('notes');
  const applicationsContainer = document.getElementById('applications-container');
  const viewAllButton = document.getElementById('view-all');
  const optionsButton = document.getElementById('options');
  
  // Set default date to today
  dateInput.value = new Date().toISOString().split('T')[0];
  
  // Check if there's a detected job from content script
  chrome.storage.local.get('detectedJob', (data) => {
    if (data.detectedJob) {
      // Pre-fill form with detected job
      companyInput.value = data.detectedJob.company || '';
      positionInput.value = data.detectedJob.title || '';
      
      // Add source to notes if available
      if (data.detectedJob.source) {
        notesInput.value = `Source: ${data.detectedJob.source}\nURL: ${data.detectedJob.url}\n`;
      }
      
      // Clear the detected job
      chrome.storage.local.remove('detectedJob');
    }
  });
  
  // Load existing applications
  loadApplications();
  
  // Form submission handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Create application object
    const application = {
      id: Date.now(), // Use timestamp as unique ID
      company: companyInput.value,
      position: positionInput.value,
      date: dateInput.value,
      status: statusInput.value,
      notes: notesInput.value,
      created: new Date().toISOString()
    };
    
    // Save application
    saveApplication(application);
    
    // Reset form
    form.reset();
    dateInput.value = new Date().toISOString().split('T')[0];
    
    // Reload applications list
    loadApplications();
  });
  
  // View all applications
  viewAllButton.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  });
  
  // Open options page
  optionsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Function to save application
  function saveApplication(application) {
    chrome.storage.sync.get('applications', (data) => {
      const applications = data.applications || [];
      applications.push(application);
      chrome.storage.sync.set({ applications });
    });
  }
  
  // Function to load applications
  function loadApplications() {
    chrome.storage.sync.get('applications', (data) => {
      const applications = data.applications || [];
      
      if (applications.length === 0) {
        applicationsContainer.innerHTML = '<div class="no-applications">No applications yet. Add one above!</div>';
        return;
      }
      
      // Sort applications by date (newest first)
      applications.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      // Display only the 5 most recent applications
      const recentApplications = applications.slice(0, 5);
      
      // Clear container
      applicationsContainer.innerHTML = '';
      
      // Add applications to container
      recentApplications.forEach(app => {
        const appElement = document.createElement('div');
        appElement.className = 'application-item';
        appElement.dataset.id = app.id;
        
        // Format date
        const formattedDate = new Date(app.date).toLocaleDateString();
        
        appElement.innerHTML = `
          <div class="app-header">
            <span class="company">${app.company}</span>
            <span class="status ${app.status}">${app.status}</span>
          </div>
          <div class="position">${app.position}</div>
          <div class="date">Applied: ${formattedDate}</div>
        `;
        
        applicationsContainer.appendChild(appElement);
      });
    });
  }
}); 