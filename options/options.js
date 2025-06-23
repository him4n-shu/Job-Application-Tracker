// Options script for Job Application Tracker
document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const applicationsTable = document.getElementById('applications-table');
  const applicationsTbody = document.getElementById('applications-tbody');
  const noApplicationsMsg = document.getElementById('no-applications');
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const sortBy = document.getElementById('sort-by');
  const modal = document.getElementById('application-modal');
  const closeModal = document.querySelector('.close-modal');
  const editForm = document.getElementById('edit-application-form');
  const editIdInput = document.getElementById('edit-id');
  const editCompanyInput = document.getElementById('edit-company');
  const editPositionInput = document.getElementById('edit-position');
  const editDateInput = document.getElementById('edit-date');
  const editStatusInput = document.getElementById('edit-status');
  const editNotesInput = document.getElementById('edit-notes');
  const deleteButton = document.querySelector('.delete');
  
  // Settings elements
  const enableNotifications = document.getElementById('enable-notifications');
  const followUpDays = document.getElementById('follow-up-days');
  const autoDetect = document.getElementById('auto-detect');
  const autoSave = document.getElementById('auto-save');
  const jobSites = document.getElementById('job-sites');
  const saveSettingsButton = document.getElementById('save-settings');
  
  // Export/Import elements
  const exportButton = document.getElementById('export-data');
  const importFile = document.getElementById('import-file');
  const importButton = document.getElementById('import-data');
  const clearDataButton = document.getElementById('clear-data');
  
  // Application data
  let applications = [];
  let filteredApplications = [];
  
  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.add('active');
    });
  });
  
  // Load applications
  loadApplications();
  
  // Load settings
  loadSettings();
  
  // Event listeners
  searchInput.addEventListener('input', filterApplications);
  statusFilter.addEventListener('change', filterApplications);
  sortBy.addEventListener('change', filterApplications);
  
  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Edit form submission
  editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const applicationId = parseInt(editIdInput.value);
    const applicationIndex = applications.findIndex(app => app.id === applicationId);
    
    if (applicationIndex !== -1) {
      applications[applicationIndex] = {
        ...applications[applicationIndex],
        company: editCompanyInput.value,
        position: editPositionInput.value,
        date: editDateInput.value,
        status: editStatusInput.value,
        notes: editNotesInput.value,
        updated: new Date().toISOString()
      };
      
      saveApplications();
      loadApplications();
      modal.style.display = 'none';
    }
  });
  
  // Delete application
  deleteButton.addEventListener('click', () => {
    const applicationId = parseInt(editIdInput.value);
    
    if (confirm('Are you sure you want to delete this application?')) {
      applications = applications.filter(app => app.id !== applicationId);
      saveApplications();
      loadApplications();
      modal.style.display = 'none';
    }
  });
  
  // Save settings
  saveSettingsButton.addEventListener('click', () => {
    const settings = {
      notifications: enableNotifications.checked,
      followUpDays: parseInt(followUpDays.value),
      autoDetect: autoDetect.checked,
      autoSave: autoSave.checked,
      jobSites: jobSites.value.split('\n').filter(site => site.trim() !== '')
    };
    
    chrome.storage.sync.set({ settings }, () => {
      // Update content script with new job sites if needed
      if (settings.autoDetect) {
        updateContentScriptSettings(settings);
      }
      
      alert('Settings saved!');
    });
  });
  
  // Update content script with current settings
  function updateContentScriptSettings(settings) {
    // Use the scripting API to inject custom job site detection
    if (settings.jobSites && settings.jobSites.length > 0) {
      try {
        chrome.scripting.executeScript({
          target: { allFrames: false },
          func: (customSites) => {
            // Store custom sites in localStorage for content script to access
            localStorage.setItem('jobApplicationTrackerSites', JSON.stringify(customSites));
          },
          args: [settings.jobSites]
        });
      } catch (e) {
        console.error('Error updating content script settings:', e);
      }
    }
  }
  
  // Export data
  exportButton.addEventListener('click', () => {
    const data = {
      applications: applications,
      settings: {
        notifications: enableNotifications.checked,
        followUpDays: parseInt(followUpDays.value),
        autoDetect: autoDetect.checked,
        autoSave: autoSave.checked,
        jobSites: jobSites.value.split('\n').filter(site => site.trim() !== '')
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job_applications_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  
  // Import file selection
  importFile.addEventListener('change', () => {
    importButton.disabled = !importFile.files.length;
  });
  
  // Import data
  importButton.addEventListener('click', () => {
    const file = importFile.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (confirm('This will replace all your current data. Are you sure?')) {
          applications = data.applications || [];
          saveApplications();
          
          if (data.settings) {
            chrome.storage.sync.set({ settings: data.settings }, () => {
              loadSettings();
              
              // Update content script with imported settings
              if (data.settings.autoDetect) {
                updateContentScriptSettings(data.settings);
              }
            });
          }
          
          loadApplications();
          alert('Data imported successfully!');
        }
      } catch (error) {
        alert('Error importing data: ' + error.message);
      }
    };
    reader.readAsText(file);
  });
  
  // Clear data
  clearDataButton.addEventListener('click', () => {
    if (confirm('This will delete ALL your job application data. This cannot be undone. Are you sure?')) {
      applications = [];
      saveApplications();
      loadApplications();
      alert('All data has been cleared.');
    }
  });
  
  // Load applications from storage
  function loadApplications() {
    chrome.storage.sync.get('applications', (data) => {
      applications = data.applications || [];
      filterApplications();
    });
  }
  
  // Save applications to storage
  function saveApplications() {
    chrome.storage.sync.set({ applications });
  }
  
  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get('settings', (data) => {
      const settings = data.settings || {
        notifications: true,
        followUpDays: 7,
        autoDetect: true,
        autoSave: true,
        jobSites: []
      };
      
      enableNotifications.checked = settings.notifications;
      followUpDays.value = settings.followUpDays;
      autoDetect.checked = settings.autoDetect;
      autoSave.checked = settings.autoSave !== undefined ? settings.autoSave : true;
      jobSites.value = settings.jobSites.join('\n');
    });
  }
  
  // Filter and display applications
  function filterApplications() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;
    const sortValue = sortBy.value;
    
    filteredApplications = applications.filter(app => {
      // Search filter
      const matchesSearch = 
        app.company.toLowerCase().includes(searchTerm) ||
        app.position.toLowerCase().includes(searchTerm) ||
        (app.notes && app.notes.toLowerCase().includes(searchTerm));
      
      // Status filter
      const matchesStatus = statusValue === 'all' || app.status === statusValue;
      
      return matchesSearch && matchesStatus;
    });
    
    // Sort applications
    filteredApplications.sort((a, b) => {
      switch (sortValue) {
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'company':
          return a.company.localeCompare(b.company);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    
    displayApplications();
  }
  
  // Display applications in the table
  function displayApplications() {
    if (filteredApplications.length === 0) {
      applicationsTable.style.display = 'none';
      noApplicationsMsg.style.display = 'block';
    } else {
      applicationsTable.style.display = 'table';
      noApplicationsMsg.style.display = 'none';
      
      // Clear table
      applicationsTbody.innerHTML = '';
      
      // Add applications to table
      filteredApplications.forEach(app => {
        const tr = document.createElement('tr');
        
        // Format date
        const formattedDate = new Date(app.date).toLocaleDateString();
        
        tr.innerHTML = `
          <td>${app.company}</td>
          <td>${app.position}</td>
          <td>${formattedDate}</td>
          <td><span class="status-badge ${app.status}">${app.status}</span></td>
          <td>
            <button class="view-btn" data-id="${app.id}">View/Edit</button>
          </td>
        `;
        
        applicationsTbody.appendChild(tr);
      });
      
      // Add event listeners to view buttons
      document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', () => {
          const applicationId = parseInt(button.dataset.id);
          const application = applications.find(app => app.id === applicationId);
          
          if (application) {
            // Populate form
            editIdInput.value = application.id;
            editCompanyInput.value = application.company;
            editPositionInput.value = application.position;
            editDateInput.value = application.date;
            editStatusInput.value = application.status;
            editNotesInput.value = application.notes || '';
            
            // Show modal
            modal.style.display = 'block';
          }
        });
      });
    }
  }
}); 