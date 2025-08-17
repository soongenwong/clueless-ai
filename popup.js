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
        
        // Extract keywords from the user's request
        const keywords = this.extractKeywords(request);
        console.log('Extracted keywords:', keywords);
        
        // Generate smart selectors based on actual keywords from the request
        const smartSelectors = this.generateKeywordBasedSelectors(keywords);
        
        // Also add pattern-based selectors as fallback
        const patternSelectors = this.getPatternSelectors(lowercaseRequest);
        
        // Combine both approaches - keyword-based first, then pattern-based
        const allSelectors = [...smartSelectors, ...patternSelectors];
        
        return {
            type: 'keyword-based',
            elements: allSelectors,
            message: `Looking for "${keywords.join(', ')}" on this page...`,
            originalRequest: request,
            keywords: keywords
        };
    }

    extractKeywords(request) {
        // Remove common stop words and extract meaningful keywords
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'where', 'what', 'when', 'why', 'can', 'could', 'should', 'would', 'find', 'show', 'help', 'me', 'i', 'want', 'need']);
        
        const words = request.toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));
        
        return [...new Set(words)]; // Remove duplicates
    }

    generateKeywordBasedSelectors(keywords) {
        const selectors = [];
        
        keywords.forEach(keyword => {
            // Direct text content searches (most important)
            selectors.push(`*:contains("${keyword}")`);
            selectors.push(`button:contains("${keyword}")`);
            selectors.push(`a:contains("${keyword}")`);
            selectors.push(`input[value*="${keyword}" i]`);
            selectors.push(`label:contains("${keyword}")`);
            
            // Attribute-based searches
            selectors.push(`[aria-label*="${keyword}" i]`);
            selectors.push(`[placeholder*="${keyword}" i]`);
            selectors.push(`[title*="${keyword}" i]`);
            selectors.push(`[alt*="${keyword}" i]`);
            selectors.push(`[data-testid*="${keyword}" i]`);
            selectors.push(`[class*="${keyword}" i]`);
            selectors.push(`[id*="${keyword}" i]`);
            selectors.push(`[name*="${keyword}" i]`);
            selectors.push(`[href*="${keyword}" i]`);
            
            // Form-specific searches
            selectors.push(`input[type="submit"][value*="${keyword}" i]`);
            selectors.push(`button[type="submit"]:contains("${keyword}")`);
            
            // Variations and partial matches
            if (keyword.length > 3) {
                const partial = keyword.substring(0, Math.floor(keyword.length * 0.7));
                selectors.push(`*:contains("${partial}")`);
                selectors.push(`[class*="${partial}" i]`);
                selectors.push(`[id*="${partial}" i]`);
            }
        });
        
        return selectors;
    }

    getPatternSelectors(lowercaseRequest) {
        // Simplified pattern matching as fallback
        const patterns = {
            search: ['search', 'find', 'look', 'query'],
            login: ['login', 'signin', 'sign', 'account', 'auth'],
            menu: ['menu', 'nav', 'navigation', 'hamburger'],
            cart: ['cart', 'checkout', 'buy', 'purchase', 'order'],
            contact: ['contact', 'help', 'support', 'chat'],
            settings: ['settings', 'preferences', 'options', 'config'],
            profile: ['profile', 'account', 'user']
        };
        
        const selectors = [];
        
        for (const [category, keywords] of Object.entries(patterns)) {
            if (keywords.some(keyword => lowercaseRequest.includes(keyword))) {
                switch (category) {
                    case 'search':
                        selectors.push('input[placeholder*="search" i]', '[role="searchbox"]', 'input[type="search"]');
                        break;
                    case 'login':
                        selectors.push('a[href*="login" i]', 'button:contains("Login")', 'button:contains("Sign in")');
                        break;
                    case 'menu':
                        selectors.push('nav', '[role="navigation"]', 'button[aria-label*="menu" i]');
                        break;
                    case 'cart':
                        selectors.push('button:contains("Checkout")', 'a[href*="cart" i]', 'button:contains("Buy")');
                        break;
                    case 'contact':
                        selectors.push('a[href*="contact" i]', 'button:contains("Contact")', 'a[href*="support" i]');
                        break;
                    case 'settings':
                        selectors.push('a[href*="settings" i]', 'button:contains("Settings")');
                        break;
                    case 'profile':
                        selectors.push('a[href*="profile" i]', 'button:contains("Profile")');
                        break;
                }
            }
        }
        
        return selectors;
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
