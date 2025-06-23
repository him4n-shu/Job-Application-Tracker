// Content script for Job Application Tracker
console.log('Job Application Tracker content script loaded');

// Helper function to safely send messages to the background script
function safelySendMessage(message) {
  try {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        console.log('Error sending message:', chrome.runtime.lastError.message);
        // Don't throw an error, just log it
      } else {
        console.log('Message sent successfully, response:', response);
      }
    });
  } catch (error) {
    // Handle extension context invalidated error gracefully
    console.log('Failed to send message, extension context may be invalidated:', error.message);
  }
}

// Function to detect job application forms
function detectJobApplication() {
  try {
    const url = window.location.href;
    console.log('Analyzing page:', url);
    
    let jobInfo = null;
    let isApplicationSubmission = false;
    
    // LinkedIn job detection
    if (url.includes('linkedin.com')) {
      console.log('LinkedIn page detected:', url);
      
      // Check if this is an application submission page
      if (url.includes('/post-apply/') || 
          url.includes('/applied/') || 
          url.includes('next-best-action') ||
          document.querySelector('.application-confirmation') || 
          document.querySelector('.jobs-easy-apply-content') ||
          document.querySelector('.artdeco-inline-feedback--success')) {
        isApplicationSubmission = true;
        console.log('LinkedIn application submission detected');
      }
      
      // Get job ID from URL
      let jobId = '';
      const jobIdMatch = url.match(/currentJobId=(\d+)/) || url.match(/\/jobs\/view\/(\d+)/);
      if (jobIdMatch && jobIdMatch[1]) {
        jobId = jobIdMatch[1];
        console.log('Job ID extracted from URL:', jobId);
      }
      
      // Handle LinkedIn job search results page
      if (url.includes('/jobs/search/')) {
        console.log('LinkedIn job search results page detected');
        
        // For search results pages, we need to find the currently selected job
        // This is typically shown in a panel on the right side
        
        // First, try to get job title from the right panel
        let jobTitle = null;
        let companyElement = null;
        
        // Try to find the job details panel
        const jobPanel = document.querySelector('.jobs-search__right-rail') || 
                         document.querySelector('.jobs-search-two-pane__details');
        
        if (jobPanel) {
          console.log('Job details panel found');
          
          // Try to find job title within the panel
          jobTitle = jobPanel.querySelector('.jobs-unified-top-card__job-title') || 
                     jobPanel.querySelector('.job-details-jobs-unified-top-card__job-title') ||
                     jobPanel.querySelector('h2');
          
          // Try to find company name within the panel
          companyElement = jobPanel.querySelector('.jobs-unified-top-card__company-name') || 
                          jobPanel.querySelector('.job-details-jobs-unified-top-card__company-name') ||
                          jobPanel.querySelector('.jobs-unified-top-card__subtitle-primary-grouping a');
          
          console.log('Job panel search results:', 
                     'Title found:', !!jobTitle, 
                     'Company found:', !!companyElement);
        }
        
        // If we found job info in the panel, create the job info object
        if (jobTitle) {
          jobInfo = {
            title: jobTitle.textContent.trim(),
            company: companyElement ? companyElement.textContent.trim() : 'LinkedIn Company',
            url: url,
            jobId: jobId,
            source: 'LinkedIn',
            date: new Date().toISOString(),
            status: isApplicationSubmission ? 'applied' : 'viewed'
          };
          
          console.log('LinkedIn job info extracted from search results:', jobInfo);
        } else if (url.includes('keywords=')) {
          // If we couldn't find job info but have keywords, use those
          const keywordsMatch = url.match(/keywords=([^&]+)/);
          if (keywordsMatch && keywordsMatch[1]) {
            const decodedKeywords = decodeURIComponent(keywordsMatch[1]).replace(/\+/g, ' ');
            
            jobInfo = {
              title: decodedKeywords,
              company: 'LinkedIn Search',
              url: url,
              jobId: jobId,
              source: 'LinkedIn',
              date: new Date().toISOString(),
              status: isApplicationSubmission ? 'applied' : 'viewed'
            };
            
            console.log('LinkedIn job info extracted from URL keywords:', jobInfo);
          }
        }
      }
      // Handle regular job view pages
      else if (url.includes('/jobs/') || url.includes('/job/')) {
        console.log('LinkedIn job view page detected');
        
        // Try multiple selectors for job title
        const jobTitleSelectors = [
          '.jobs-unified-top-card__job-title',
          '.job-details-jobs-unified-top-card__job-title',
          '.job-title',
          '.topcard__title',
          'h1'
        ];
        
        let jobTitle = null;
        for (const selector of jobTitleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            jobTitle = element;
            console.log('Found job title with selector:', selector);
            break;
          }
        }
        
        // Try multiple selectors for company name
        const companySelectors = [
          '.jobs-unified-top-card__company-name',
          '.job-details-jobs-unified-top-card__company-name',
          '.company-name',
          '.topcard__org-name-link',
          '.jobs-unified-top-card__subtitle-primary-grouping a'
        ];
        
        let companyElement = null;
        for (const selector of companySelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            companyElement = element;
            console.log('Found company name with selector:', selector);
            break;
          }
        }
        
        // For post-apply pages, try to extract from the page content
        if (isApplicationSubmission && (!jobTitle || !companyElement)) {
          console.log('Trying to extract job info from post-apply page');
          
          // Try to find any heading that might contain job title
          const headings = document.querySelectorAll('h1, h2, h3');
          for (const heading of headings) {
            if (heading.textContent.includes('applied') || 
                heading.textContent.includes('Application') || 
                heading.textContent.includes('submitted')) {
              // Look for nearby elements that might contain job info
              const parentElement = heading.closest('section') || heading.parentElement;
              if (parentElement) {
                const allText = parentElement.textContent;
                // Extract job title and company from text if possible
                const jobMatch = allText.match(/for\s+(.+?)\s+at\s+(.+?)(\s|$)/i);
                if (jobMatch) {
                  jobTitle = { textContent: jobMatch[1] };
                  companyElement = { textContent: jobMatch[2] };
                  console.log('Extracted job info from text:', jobMatch[1], 'at', jobMatch[2]);
                }
              }
              break;
            }
          }
          
          // If still no job title, try to get it from the URL
          if (!jobTitle && url.includes('keywords=')) {
            const keywordsMatch = url.match(/keywords=([^&]+)/);
            if (keywordsMatch && keywordsMatch[1]) {
              const decodedKeywords = decodeURIComponent(keywordsMatch[1]).replace(/\+/g, ' ');
              jobTitle = { textContent: decodedKeywords };
              console.log('Extracted job title from URL keywords:', decodedKeywords);
            }
          }
        }
        
        if (jobTitle || isApplicationSubmission) {
          jobInfo = {
            title: jobTitle ? jobTitle.textContent.trim() : 'LinkedIn Job',
            company: companyElement ? companyElement.textContent.trim() : 'LinkedIn Company',
            url: url,
            jobId: jobId,
            source: 'LinkedIn',
            date: new Date().toISOString(),
            status: isApplicationSubmission ? 'applied' : 'viewed'
          };
          
          console.log('LinkedIn job info extracted:', jobInfo);
        }
      }
    }
    
    // Indeed job detection
    else if (url.includes('indeed.com')) {
      // Check if this is an application submission page
      if (url.includes('/apply/confirmation') || 
          document.querySelector('.indeed-apply-confirmation') || 
          document.querySelector('.ia-JobApplicationSuccess')) {
        isApplicationSubmission = true;
      }
      
      if (url.includes('/viewjob') || url.includes('/job/') || url.includes('/jobs/')) {
        const jobTitle = document.querySelector('.jobsearch-JobInfoHeader-title') ||
                        document.querySelector('h1.icl-u-xs-mb--xs');
        
        const companyElement = document.querySelector('.jobsearch-InlineCompanyRating-companyName') ||
                              document.querySelector('.icl-u-lg-mr--sm');
        
        if (jobTitle) {
          jobInfo = {
            title: jobTitle.textContent.trim(),
            company: companyElement ? companyElement.textContent.trim() : 'Indeed Job',
            url: url,
            source: 'Indeed',
            date: new Date().toISOString(),
            status: isApplicationSubmission ? 'applied' : 'viewed'
          };
        }
      }
    }
    
    // Naukri job detection
    else if (url.includes('naukri.com')) {
      // Check if this is an application submission page
      if (url.includes('/application-successful') || 
          document.querySelector('.successMsg') || 
          document.querySelector('.success-message')) {
        isApplicationSubmission = true;
      }
      
      if (url.includes('/job-listings-') || url.includes('/jobs/')) {
        const jobTitle = document.querySelector('.jd-header-title') ||
                        document.querySelector('h1.jd-header-title');
        
        const companyElement = document.querySelector('.jd-header-comp-name') ||
                              document.querySelector('.comp-name');
        
        if (jobTitle) {
          jobInfo = {
            title: jobTitle.textContent.trim(),
            company: companyElement ? companyElement.textContent.trim() : 'Naukri Job',
            url: url,
            source: 'Naukri',
            date: new Date().toISOString(),
            status: isApplicationSubmission ? 'applied' : 'viewed'
          };
        }
      }
    }
    
    // Send job info to background script if detected
    if (jobInfo) {
      console.log('Job detected, sending message:', jobInfo);
      safelySendMessage({
        action: isApplicationSubmission ? 'jobApplicationSubmitted' : 'possibleJobApplication',
        job: jobInfo
      });
    } else {
      console.log('No job information detected on this page');
    }
  } catch (error) {
    console.error('Error in detectJobApplication:', error);
  }
}

// Monitor form submissions
function monitorFormSubmissions() {
  try {
    document.addEventListener('submit', function(event) {
      // Check if this might be a job application form
      const form = event.target;
      const formText = form.innerText.toLowerCase();
      const formHTML = form.innerHTML.toLowerCase();
      
      if (formText.includes('apply') || formText.includes('submit application') || 
          formText.includes('send application') || formHTML.includes('apply-button') ||
          formHTML.includes('application-submit')) {
        
        console.log('Detected job application form submission');
        
        // Trigger job detection with application status
        setTimeout(() => {
          detectJobApplication();
        }, 500); // Small delay to allow for page updates
      }
    });
    
    // Monitor button clicks that might be application submissions
    document.addEventListener('click', function(event) {
      const target = event.target;
      const targetText = target.innerText ? target.innerText.toLowerCase() : '';
      const targetHTML = target.outerHTML.toLowerCase();
      
      if ((targetText.includes('apply') || targetText.includes('submit') || targetText.includes('send application')) &&
          (targetHTML.includes('button') || target.tagName === 'BUTTON' || target.role === 'button')) {
        
        console.log('Detected job application button click');
        
        // Trigger job detection with application status
        setTimeout(() => {
          detectJobApplication();
        }, 1000); // Delay to allow for page updates
      }
    });
  } catch (error) {
    console.error('Error in monitorFormSubmissions:', error);
  }
}

// Initialize the extension
function initialize() {
  try {
    console.log('Initializing Job Application Tracker content script');
    
    // Check if the extension is still valid
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
      console.log('Extension context is invalid, not initializing');
      return;
    }
    
    // Run detection after a short delay
    setTimeout(() => {
      detectJobApplication();
      monitorFormSubmissions();
    }, 1500); // Longer delay to ensure the page is fully rendered
  } catch (error) {
    console.error('Error initializing content script:', error);
  }
}

// Run detection after page is fully loaded
window.addEventListener('load', initialize);

// Also run when URL changes without page reload (for single-page applications)
let lastUrl = location.href;
try {
  const observer = new MutationObserver(() => {
    try {
      // Check if extension context is still valid
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        console.log('Extension context is invalid, disconnecting observer');
        observer.disconnect();
        return;
      }
      
      const url = location.href;
      if (url !== lastUrl) {
        console.log('URL changed from', lastUrl, 'to', url);
        lastUrl = url;
        setTimeout(() => {
          detectJobApplication();
        }, 1500); // Longer delay to ensure the page is fully rendered after URL change
      }
    } catch (error) {
      console.error('Error in MutationObserver callback:', error);
    }
  });
  
  observer.observe(document, {subtree: true, childList: true});
} catch (error) {
  console.error('Error setting up MutationObserver:', error);
} 