// Content script that runs on all websites
class CluelessAI {
    constructor() {
        this.currentTour = null;
        this.speechSynthesis = window.speechSynthesis;
        this.isActive = false;
        
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
        });
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    initialize() {
        console.log('Clueless AI initialized on:', window.location.href);
        
        // Add visual indicator that extension is active
        this.addExtensionIndicator();
    }
    
    handleMessage(request, sender, sendResponse) {
        console.log('Received message:', request);
        
        switch (request.action) {
            case 'START_GUIDE':
                this.startGuidance(request.guidance, request.originalRequest);
                sendResponse({ success: true });
                break;
                
            case 'STOP_GUIDE':
                this.stopGuidance();
                sendResponse({ success: true });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }
    
    async startGuidance(guidance, originalRequest) {
        console.log('Starting guidance:', guidance);
        
        // Stop any existing tour
        this.stopGuidance();
        
        // Find elements based on guidance
        let elements = this.findElements(guidance.elements);
        
        if (elements.length === 0) {
            // Try AI-powered selector suggestions from background (GROQ / llama-3.1-8b-instant)
            try {
                const pageSnippet = document.documentElement.innerText.slice(0, 2000); // small context
                const resp = await this.requestAISuggestions(originalRequest, pageSnippet);
                if (resp && resp.selectors && resp.selectors.length > 0) {
                    console.log('AI suggested selectors:', resp.selectors);
                    elements = this.findElements(resp.selectors);
                }
            } catch (err) {
                console.warn('AI selector request failed:', err);
            }
        }
        
        if (elements.length === 0) {
            this.speak("Sorry, I couldn't find what you're looking for on this page.");
            this.showNotification("Element not found", "I couldn't locate the requested element on this page. Try being more specific!", "error");
            return;
        }
        
        // Create and start tour
        this.createTour(elements, guidance.message, originalRequest);
        this.isActive = true;
    }
    
    stopGuidance() {
        if (this.currentTour) {
            this.currentTour.complete();
            this.currentTour = null;
        }
        
        // Stop any ongoing speech
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
        
        // Remove any notifications
        this.removeNotification();
        
        this.isActive = false;
        console.log('Guidance stopped');
    }
    
    findElements(selectors) {
        const foundElements = [];
        
        for (const selector of selectors) {
            try {
                let elements;
                
                // Handle :contains() pseudo-selector (not native CSS)
                if (selector.includes(':contains(')) {
                    elements = this.findElementsByText(selector);
                } else {
                    elements = document.querySelectorAll(selector);
                }
                
                if (elements && elements.length > 0) {
                    foundElements.push(...Array.from(elements));
                }
            } catch (error) {
                console.warn('Invalid selector:', selector, error);
            }
        }
        
        // Remove duplicates and return visible elements
        const uniqueElements = [...new Set(foundElements)];
        return uniqueElements.filter(el => this.isElementVisible(el));
    }
    
    findElementsByText(selector) {
        // Extract text from :contains() selector
        const match = selector.match(/:contains\("([^"]+)"\)/i);
        if (!match) return [];
        
        const searchText = match[1].toLowerCase();
        const baseSelector = selector.replace(/:contains\("[^"]+"\)/i, '').trim() || '*';
        
        const elements = document.querySelectorAll(baseSelector);
        return Array.from(elements).filter(el => 
            el.textContent && el.textContent.toLowerCase().includes(searchText)
        );
    }
    
    isElementVisible(element) {
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               element.offsetWidth > 0 && 
               element.offsetHeight > 0;
    }
    
    createTour(elements, message, originalRequest) {
        // Use the first visible element
        const targetElement = elements[0];
        
        if (!targetElement) {
            this.speak("I couldn't find a suitable element to guide you to.");
            return;
        }
        
        // Scroll element into view
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Create tour using Shepherd.js
        this.currentTour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: 'clueless-ai-step',
                scrollTo: true,
                cancelIcon: {
                    enabled: true
                }
            }
        });
        
        // Add tour step
        this.currentTour.addStep({
            title: '🤖 Clueless AI Found It!',
            text: `
                <div class="clueless-ai-step-content">
                    <p><strong>Your request:</strong> "${originalRequest}"</p>
                    <p>${message}</p>
                    <p>🎯 This element should help you with what you're looking for!</p>
                </div>
            `,
            attachTo: {
                element: targetElement,
                on: 'top'
            },
            buttons: [
                {
                    text: 'Got it!',
                    action: () => {
                        this.currentTour.complete();
                        this.speak("Great! Let me know if you need help with anything else.");
                    },
                    classes: 'shepherd-button-primary'
                },
                {
                    text: 'Find Another',
                    action: () => {
                        this.showNextElement(elements, 1, message, originalRequest);
                    },
                    classes: 'shepherd-button-secondary'
                }
            ]
        });
        
        // Start the tour
        this.currentTour.start();
        
        // Add highlighting effect
        this.highlightElement(targetElement);
        
        // Speak the guidance
        this.speak(message);
        
        // Show notification
        this.showNotification("Found it!", message, "success");
    }
    
    showNextElement(elements, index, message, originalRequest) {
        if (index >= elements.length) {
            this.speak("That's all I could find. Try a different search term!");
            this.currentTour.complete();
            return;
        }
        
        const targetElement = elements[index];
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Update the current step
        this.currentTour.getCurrentStep().updateStepOptions({
            attachTo: {
                element: targetElement,
                on: 'top'
            },
            text: `
                <div class="clueless-ai-step-content">
                    <p><strong>Alternative option ${index + 1}:</strong></p>
                    <p>${message}</p>
                    <p>🎯 Here's another element that might help!</p>
                </div>
            `,
            buttons: [
                {
                    text: 'This one!',
                    action: () => {
                        this.currentTour.complete();
                        this.speak("Perfect choice!");
                    },
                    classes: 'shepherd-button-primary'
                },
                {
                    text: 'Keep looking',
                    action: () => {
                        this.showNextElement(elements, index + 1, message, originalRequest);
                    },
                    classes: 'shepherd-button-secondary'
                }
            ]
        });
        
        this.highlightElement(targetElement);
    }
    
    highlightElement(element) {
        // Remove existing highlights
        document.querySelectorAll('.clueless-ai-highlight').forEach(el => {
            el.classList.remove('clueless-ai-highlight');
        });
        
        // Add highlight class
        element.classList.add('clueless-ai-highlight');
        
        // Remove highlight after tour
        setTimeout(() => {
            element.classList.remove('clueless-ai-highlight');
        }, 5000);
    }
    
    speak(text) {
        // Prefer ElevenLabs TTS via background service worker. If that fails, fall back to Web Speech API.
        // Send message to background to generate audio with ElevenLabs (eleven_flash_v2_5).
        try {
            // Ask background to synthesize and return base64 audio
            chrome.runtime.sendMessage({ action: 'ELEVEN_TTS', text }, (response) => {
                if (response && response.success && response.audioBase64) {
                    this.playAudioFromBase64(response.audioBase64);
                } else {
                    // Fallback to Web Speech API
                    if (!this.speechSynthesis) return;
                    this._webSpeechSpeak(text);
                }
            });
        } catch (err) {
            console.warn('Eleven TTS request error, falling back to WebSpeech:', err);
            this._webSpeechSpeak(text);
        }
    }

    _webSpeechSpeak(text) {
        if (!this.speechSynthesis) return;
        this.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        const voices = this.speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Google') || 
            voice.name.includes('Alex') || 
            voice.name.includes('Samantha')
        );
        if (preferredVoice) utterance.voice = preferredVoice;
        this.speechSynthesis.speak(utterance);
    }

    playAudioFromBase64(base64) {
        try {
            const audio = new Audio('data:audio/mpeg;base64,' + base64);
            audio.play().catch(err => console.warn('Audio play failed:', err));
        } catch (err) {
            console.warn('Failed to play base64 audio:', err);
        }
    }

    requestAISuggestions(originalRequest, pageSnippet) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({
                    action: 'AI_SUGGEST_SELECTORS',
                    requestText: originalRequest,
                    pageSnippet: pageSnippet
                }, (response) => {
                    if (response && response.success && response.selectors) {
                        resolve({ selectors: response.selectors });
                    } else {
                        resolve({ selectors: [] });
                    }
                });
            } catch (err) {
                console.warn('requestAISuggestions error:', err);
                resolve({ selectors: [] });
            }
        });
    }
    
    showNotification(title, message, type = 'info') {
        // Remove existing notification
        this.removeNotification();
        
        const notification = document.createElement('div');
        notification.id = 'clueless-ai-notification';
        notification.className = `clueless-ai-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <span class="notification-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : '🤖'}</span>
                <span class="notification-title">${title}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="notification-message">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.removeNotification();
        }, 5000);
    }
    
    removeNotification() {
        const existing = document.getElementById('clueless-ai-notification');
        if (existing) {
            existing.remove();
        }
    }
    
    addExtensionIndicator() {
        // Add a small, unobtrusive indicator that the extension is active
        if (document.getElementById('clueless-ai-indicator')) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'clueless-ai-indicator';
        indicator.className = 'clueless-ai-indicator';
        indicator.innerHTML = '🤖';
        indicator.title = 'Clueless AI is ready to help!';
        
        document.body.appendChild(indicator);
        
        // Remove indicator after 3 seconds
        setTimeout(() => {
            if (indicator && indicator.parentNode) {
                indicator.remove();
            }
        }, 3000);
    }
}

// Initialize the extension when the script loads
new CluelessAI();
