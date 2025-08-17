// Popup script for the browser extension
class PopupController {
    constructor() {
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        this.userRequestInput = document.getElementById('userRequest');
        this.startGuideBtn = document.getElementById('startGuide');
        this.stopGuideBtn = document.getElementById('stopGuide');
        this.statusDiv = document.getElementById('status');
    }
    
    bindEvents() {
        this.startGuideBtn.addEventListener('click', () => this.startGuide());
        this.stopGuideBtn.addEventListener('click', () => this.stopGuide());
        
        // Allow Enter key to trigger guide
        this.userRequestInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.startGuide();
            }
        });
        
        // Focus input on popup open
        this.userRequestInput.focus();
    }
    
    async startGuide() {
        const userRequest = this.userRequestInput.value.trim();
        
        if (!userRequest) {
            this.showStatus('Please enter what you need help with!', 'error');
            return;
        }
        
        try {
            // Get the active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                this.showStatus('No active tab found!', 'error');
                return;
            }
            
            // Process the user's request using simple NLP
            const guidance = this.processUserRequest(userRequest);
            
            // Send message to content script
            await chrome.tabs.sendMessage(tab.id, {
                action: 'START_GUIDE',
                guidance: guidance,
                originalRequest: userRequest
            });
            
            this.showStatus('Starting guidance...', 'success');
            
            // Close popup after a short delay
            setTimeout(() => {
                window.close();
            }, 1000);
            
        } catch (error) {
            console.error('Error starting guide:', error);
            this.showStatus('Error starting guide. Make sure you\'re on a webpage!', 'error');
        }
    }
    
    async stopGuide() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, {
                    action: 'STOP_GUIDE'
                });
                
                this.showStatus('Guidance stopped!', 'success');
            }
        } catch (error) {
            console.error('Error stopping guide:', error);
            this.showStatus('Error stopping guide!', 'error');
        }
    }
    
    processUserRequest(request) {
        const lowercaseRequest = request.toLowerCase();
        
        // Simple keyword-based NLP for hackathon
        const patterns = {
            search: {
                keywords: ['search', 'find something', 'look for', 'search box', 'search bar'],
                elements: ['input[placeholder*="search" i]', 'input[aria-label*="search" i]', '[role="searchbox"]', 'input[type="search"]'],
                message: 'Here\'s the search functionality!'
            },
            login: {
                keywords: ['login', 'log in', 'sign in', 'signin', 'account', 'user'],
                elements: ['a[href*="login" i]', 'a[href*="signin" i]', 'button:contains("Login")', 'button:contains("Sign in")', '[data-testid*="login" i]'],
                message: 'Here\'s how you can sign in!'
            },
            menu: {
                keywords: ['menu', 'navigation', 'nav', 'hamburger', 'sidebar'],
                elements: ['nav', '[role="navigation"]', '.menu', '.nav', '.navbar', 'button[aria-label*="menu" i]'],
                message: 'Here\'s the navigation menu!'
            },
            checkout: {
                keywords: ['checkout', 'cart', 'buy', 'purchase', 'order', 'payment'],
                elements: ['button:contains("Checkout")', 'a[href*="checkout" i]', '[data-testid*="cart" i]', '.cart', 'button:contains("Buy")'],
                message: 'Here\'s the checkout process!'
            },
            contact: {
                keywords: ['contact', 'help', 'support', 'customer service', 'get in touch'],
                elements: ['a[href*="contact" i]', 'a[href*="support" i]', 'button:contains("Contact")', '[data-testid*="contact" i]'],
                message: 'Here\'s the contact information!'
            }
        };
        
        // Find matching pattern
        for (const [key, pattern] of Object.entries(patterns)) {
            if (pattern.keywords.some(keyword => lowercaseRequest.includes(keyword))) {
                return {
                    type: key,
                    elements: pattern.elements,
                    message: pattern.message,
                    originalRequest: request
                };
            }
        }
        
        // Default fallback - try to find elements based on the text
        return {
            type: 'generic',
            elements: [`*:contains("${request}")`, `[aria-label*="${request}" i]`, `[placeholder*="${request}" i]`],
            message: `Let me help you find: ${request}`,
            originalRequest: request
        };
    }
    
    showStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = `status ${type}`;
        this.statusDiv.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            this.statusDiv.style.display = 'none';
        }, 3000);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});
