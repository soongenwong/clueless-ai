// Background service worker for the extension
class BackgroundController {
    constructor() {
        this.initializeListeners();
    }
    
    initializeListeners() {
        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            console.log('Clueless AI Extension installed:', details);
            
            if (details.reason === 'install') {
                // Show welcome notification
                this.showWelcomeNotification();
            }
        });
        
        // Handle extension icon click
        chrome.action.onClicked.addListener((tab) => {
            console.log('Extension icon clicked for tab:', tab.url);
        });
        
        // Handle messages from content scripts
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
        });
        
        // Handle tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.onTabComplete(tabId, tab);
            }
        });
    }
    
    handleMessage(request, sender, sendResponse) {
        console.log('Background received message:', request);
        
        switch (request.action) {
            case 'GET_TAB_INFO':
                this.getTabInfo(sender.tab, sendResponse);
                break;
                
            case 'LOG_USAGE':
                this.logUsage(request.data);
                sendResponse({ success: true });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }
    
    async getTabInfo(tab, sendResponse) {
        try {
            const tabInfo = {
                url: tab.url,
                title: tab.title,
                id: tab.id
            };
            
            sendResponse({ success: true, data: tabInfo });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    
    logUsage(data) {
        // Simple usage logging for analytics
        console.log('Usage logged:', data);
        
        // Store usage data in local storage
        chrome.storage.local.get(['usageStats'], (result) => {
            const stats = result.usageStats || [];
            stats.push({
                ...data,
                timestamp: Date.now()
            });
            
            // Keep only last 100 entries
            if (stats.length > 100) {
                stats.splice(0, stats.length - 100);
            }
            
            chrome.storage.local.set({ usageStats: stats });
        });
    }
    
    onTabComplete(tabId, tab) {
        // Check if this is a supported website
        if (this.isSupportedWebsite(tab.url)) {
            console.log('Supported website loaded:', tab.url);
            
            // Could inject additional helpful context here
            this.injectHelpfulContext(tabId, tab.url);
        }
    }
    
    isSupportedWebsite(url) {
        if (!url) return false;
        
        // Support all http/https websites
        return url.startsWith('http://') || url.startsWith('https://');
    }
    
    async injectHelpfulContext(tabId, url) {
        // Inject context-specific helpers for popular websites
        try {
            const domain = new URL(url).hostname.toLowerCase();
            
            const siteSpecificHelpers = {
                'github.com': {
                    message: 'GitHub detected! I can help you find repositories, issues, or code.',
                    quickActions: ['Find repository', 'Create new issue', 'Search code']
                },
                'stackoverflow.com': {
                    message: 'Stack Overflow detected! I can help you navigate questions and answers.',
                    quickActions: ['Ask question', 'Search answers', 'Find tags']
                },
                'amazon.com': {
                    message: 'Amazon detected! I can help you with shopping and checkout.',
                    quickActions: ['Search products', 'View cart', 'Track orders']
                },
                'google.com': {
                    message: 'Google detected! I can help you with search and navigation.',
                    quickActions: ['Advanced search', 'Search tools', 'My account']
                }
            };
            
            const helper = siteSpecificHelpers[domain];
            if (helper) {
                await chrome.tabs.sendMessage(tabId, {
                    action: 'SITE_CONTEXT',
                    context: helper
                });
            }
        } catch (error) {
            console.warn('Error injecting context:', error);
        }
    }
    
    showWelcomeNotification() {
        // Create a notification to welcome new users
        if (chrome.notifications) {
            chrome.notifications.create('welcome', {
                type: 'basic',
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Im0xMiAyIDMuMDkgNi4yNkwyMSA5bC0yLjc5IDQuNzQuNjkgNi42OS01Ljc5LTMuMTNMMTAgMjBsLjY5LTYuNjlMMSA5bDUuOTEtLjc0TDEyIDJ6Ii8+Cjwvc3ZnPgo8L3N2Zz4K',
                title: 'Welcome to Clueless AI!',
                message: 'Your smart web assistant is ready. Click the extension icon on any website to get started!'
            });
            
            // Auto-clear notification after 10 seconds
            setTimeout(() => {
                chrome.notifications.clear('welcome');
            }, 10000);
        }
    }
}

// Initialize background controller
new BackgroundController();
