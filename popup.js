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
        this.groqKeyInput = document.getElementById('groqKey');
        this.elevenKeyInput = document.getElementById('elevenKey');
        this.saveKeysBtn = document.getElementById('saveKeys');
        this.toggleGroqBtn = document.getElementById('toggleGroq');
        this.toggleElevenBtn = document.getElementById('toggleEleven');

        // Add Clear Keys button dynamically if not present
        if (!document.getElementById('clearKeys')) {
            const clearBtn = document.createElement('button');
            clearBtn.id = 'clearKeys';
            clearBtn.className = 'secondary-btn';
            clearBtn.textContent = 'Clear Keys';
            clearBtn.style.flex = '1';
            // insert after save button
            this.saveKeysBtn.parentElement.appendChild(clearBtn);
            this.clearKeysBtn = clearBtn;
        } else {
            this.clearKeysBtn = document.getElementById('clearKeys');
        }
    }

    bindEvents() {
        this.startGuideBtn.addEventListener('click', () => this.startGuide());
        this.stopGuideBtn.addEventListener('click', () => this.stopGuide());
        this.saveKeysBtn.addEventListener('click', () => this.saveKeys());
        this.clearKeysBtn.addEventListener('click', () => this.clearKeys());
        this.toggleGroqBtn.addEventListener('click', (e) => this.toggleVisibility(e, this.groqKeyInput));
        this.toggleElevenBtn.addEventListener('click', (e) => this.toggleVisibility(e, this.elevenKeyInput));
        
        // Allow Enter key to trigger guide
        this.userRequestInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.startGuide();
            }
        });
        
        // Focus input on popup open
        this.userRequestInput.focus();

        // Load saved keys and keep them visible
        this.loadSavedKeys();
    }

    toggleVisibility(event, inputEl) {
        event.preventDefault();
        if (inputEl.type === 'password') {
            inputEl.type = 'text';
        } else {
            inputEl.type = 'password';
        }
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

    saveKeys() {
        const groq = this.groqKeyInput.value.trim();
        const eleven = this.elevenKeyInput.value.trim();

        const newValues = {};
        if (groq) newValues.groq_api_key = groq;
        if (eleven) newValues.eleven_api_key = eleven;

        if (Object.keys(newValues).length === 0) {
            this.showStatus('No keys entered to save', 'error');
            return;
        }

        chrome.storage.local.set(newValues, () => {
            this.showStatus('API keys saved permanently', 'success');
            console.log('Keys saved:', Object.keys(newValues));
        });
    }

    loadSavedKeys() {
        chrome.storage.local.get(['groq_api_key', 'eleven_api_key', 'eleven_voice_id'], (result) => {
            console.log('Loading saved keys:', Object.keys(result));
            if (result.groq_api_key) {
                this.groqKeyInput.value = result.groq_api_key;
                console.log('Loaded GROQ key');
            }
            if (result.eleven_api_key) {
                this.elevenKeyInput.value = result.eleven_api_key;
                console.log('Loaded Eleven key');
            }
            if (result.eleven_voice_id) {
                console.log('Eleven voice ID available:', result.eleven_voice_id);
            }
        });
    }

    clearKeys() {
        chrome.storage.local.remove(['groq_api_key', 'eleven_api_key', 'eleven_voice_id'], () => {
            this.groqKeyInput.value = '';
            this.elevenKeyInput.value = '';
            this.showStatus('API keys cleared', 'success');
        });
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});
