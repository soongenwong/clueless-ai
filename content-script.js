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
                
            case 'SUMMARIZE_PAGE':
                this.summarizePage();
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
            // Try AI-powered selector suggestions from background (natural-language parsing via GROQ)
            try {
                const pageSnippet = this.getPageContext();
                const resp = await this.requestAISuggestions(originalRequest, pageSnippet);
                if (resp && resp.selectors && resp.selectors.length > 0) {
                    console.log('AI suggested selectors:', resp.selectors);
                    elements = this.findElements(resp.selectors);
                    if (resp.message) guidance.message = resp.message; // use natural-language message from AI
                }
            } catch (err) {
                console.warn('AI selector request failed:', err);
            }
        }

        // If still no elements, try smart text-based search
        if (elements.length === 0) {
            elements = this.smartTextSearch(originalRequest);
            if (elements.length > 0) {
                // Update message to be more specific about what was found
                const elementType = this.getElementDescription(elements[0]);
                guidance.message = `Found ${elementType} containing "${originalRequest}"`;
            }
        }
        
        if (elements.length === 0) {
            this.speak("Sorry, I couldn't find what you're looking for on this page. Could you try being more specific?");
            this.showNotification("Element not found", `I couldn't locate "${originalRequest}" on this page. Try describing it differently or being more specific!`, "error");
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

    async summarizePage() {
        console.log('Starting page summarization...');
        
        try {
            // Show initial notification
            this.showNotification("Analyzing Page", "Extracting and analyzing page content...", "info");
            
            // Extract comprehensive page content
            const pageContent = this.extractPageContent();
            
            // Request AI summarization from background script
            const summary = await this.requestPageSummary(pageContent);
            
            if (summary && summary.success) {
                // Create and show summary tour
                this.createSummaryTour(summary.summary, summary.keyPoints);
                
                // Speak the summary (shorter version)
                const shortSummary = summary.summary.length > 200 
                    ? summary.summary.substring(0, 200) + "..."
                    : summary.summary;
                this.speak("Here's a summary of this page: " + shortSummary);
                
            } else {
                this.showNotification("Summary Failed", "Unable to generate page summary. Please check your GROQ API key.", "error");
                this.speak("I'm sorry, I couldn't generate a summary of this page. Please check your API key settings.");
            }
            
        } catch (error) {
            console.error('Error summarizing page:', error);
            this.showNotification("Summary Error", "An error occurred while summarizing the page.", "error");
            this.speak("I encountered an error while trying to summarize this page.");
        }
    }

    extractPageContent() {
        const content = {
            title: document.title || '',
            url: window.location.href,
            headings: [],
            mainText: '',
            links: [],
            buttons: [],
            forms: [],
            images: []
        };
        
        // Extract headings (h1-h6)
        document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
            content.headings.push({
                level: parseInt(heading.tagName.charAt(1)),
                text: heading.textContent.trim()
            });
        });
        
        // Extract main text content from paragraphs and articles
        const textElements = document.querySelectorAll('p, article, section, main, .content, .post, .article');
        const textParts = [];
        textElements.forEach(el => {
            const text = el.textContent.trim();
            if (text.length > 20) { // Only include substantial text
                textParts.push(text);
            }
        });
        content.mainText = textParts.slice(0, 10).join(' ').substring(0, 2000); // Limit text length
        
        // Extract navigation links
        document.querySelectorAll('nav a, .navigation a, .menu a').forEach(link => {
            const text = link.textContent.trim();
            const href = link.getAttribute('href');
            if (text && href) {
                content.links.push({ text, href });
            }
        });
        
        // Extract buttons and interactive elements
        document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]').forEach(btn => {
            const text = btn.textContent.trim() || btn.getAttribute('value') || btn.getAttribute('aria-label') || '';
            if (text) {
                content.buttons.push(text);
            }
        });
        
        // Extract form information
        document.querySelectorAll('form').forEach(form => {
            const inputs = Array.from(form.querySelectorAll('input, select, textarea'))
                .map(input => {
                    const label = input.getAttribute('placeholder') || 
                                input.getAttribute('aria-label') || 
                                input.getAttribute('name') || 
                                input.getAttribute('id') || '';
                    const type = input.getAttribute('type') || input.tagName.toLowerCase();
                    return { type, label };
                })
                .filter(input => input.label);
            
            if (inputs.length > 0) {
                content.forms.push({ inputs });
            }
        });
        
        // Extract image alt texts
        document.querySelectorAll('img[alt]').forEach(img => {
            const alt = img.getAttribute('alt').trim();
            if (alt) {
                content.images.push(alt);
            }
        });
        
        return content;
    }

    async requestPageSummary(pageContent) {
        return new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({
                    action: 'SUMMARIZE_PAGE_CONTENT',
                    pageContent: pageContent
                }, (response) => {
                    resolve(response || { success: false });
                });
            } catch (err) {
                console.warn('requestPageSummary error:', err);
                resolve({ success: false });
            }
        });
    }

    createSummaryTour(summary, keyPoints) {
        // Stop any existing tour
        this.stopGuidance();
        
        // Create a new tour for the summary
        this.currentTour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: 'clueless-ai-step clueless-ai-summary-step',
                scrollTo: false, // Don't scroll for summary
                cancelIcon: {
                    enabled: true
                }
            }
        });
        
        // Format key points as bullet list if available
        const keyPointsHtml = keyPoints && keyPoints.length > 0 
            ? '<ul>' + keyPoints.map(point => `<li>${point}</li>`).join('') + '</ul>'
            : '';
        
        this.currentTour.addStep({
            title: '📄 Page Summary',
            text: `
                <div class="clueless-ai-summary-content">
                    <div class="summary-text">
                        <h4>Summary:</h4>
                        <p>${summary}</p>
                    </div>
                    ${keyPointsHtml ? `
                        <div class="key-points">
                            <h4>Key Points:</h4>
                            ${keyPointsHtml}
                        </div>
                    ` : ''}
                    <div class="summary-footer">
                        <small>💡 This summary was generated by AI based on the page content.</small>
                    </div>
                </div>
            `,
            attachTo: {
                element: 'body',
                on: 'top'
            },
            buttons: [
                {
                    text: 'Got it!',
                    action: () => {
                        this.currentTour.complete();
                        this.speak("That's the summary! Let me know if you need help finding anything specific on this page.");
                    },
                    classes: 'shepherd-button-primary'
                },
                {
                    text: 'Read Aloud',
                    action: () => {
                        this.speak(summary);
                    },
                    classes: 'shepherd-button-secondary'
                }
            ]
        });
        
        // Start the tour
        this.currentTour.start();
        
        // Update notification
        this.showNotification("Summary Ready", "Page summary generated successfully!", "success");
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
        
        // Remove duplicates and return visible, interactive elements
        const uniqueElements = [...new Set(foundElements)];
        const visibleElements = uniqueElements.filter(el => this.isElementVisible(el));
        
        // Prioritize interactive/clickable elements
        return this.prioritizeInteractiveElements(visibleElements);
    }

    prioritizeInteractiveElements(elements) {
        const interactive = [];
        const nonInteractive = [];
        
        elements.forEach(el => {
            if (this.isInteractiveElement(el)) {
                interactive.push(el);
            } else {
                nonInteractive.push(el);
            }
        });
        
        // Return interactive elements first, then non-interactive
        return [...interactive, ...nonInteractive];
    }

    isInteractiveElement(element) {
        const tagName = element.tagName.toLowerCase();
        
        // Check if element is inherently interactive
        const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'label'];
        if (interactiveTags.includes(tagName)) return true;
        
        // Check for clickable attributes
        if (element.onclick || element.getAttribute('onclick')) return true;
        if (element.style.cursor === 'pointer') return true;
        if (element.getAttribute('role') === 'button') return true;
        if (element.getAttribute('tabindex') && element.getAttribute('tabindex') !== '-1') return true;
        
        // Check for clickable classes (common patterns)
        const classList = element.className.toLowerCase();
        const clickableClasses = ['btn', 'button', 'click', 'link', 'menu-item', 'nav-item', 'action'];
        if (clickableClasses.some(cls => classList.includes(cls))) return true;
        
        // Check if it's focusable or has event listeners
        try {
            if (element.tabIndex >= 0) return true;
        } catch (e) {}
        
        return false;
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

        // Check if element is interactive and provide appropriate message
        const isInteractive = this.isInteractiveElement(targetElement);
        const actionText = this.getActionText(targetElement);
        
        // Scroll element into view with better positioning
        targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
        });
        
        // Calculate optimal attachment position
        const attachmentPosition = this.getOptimalAttachmentPosition(targetElement);
        
        // Create tour using Shepherd.js
        this.currentTour = new Shepherd.Tour({
            useModalOverlay: true,
            defaultStepOptions: {
                classes: 'clueless-ai-step',
                scrollTo: { behavior: 'smooth', block: 'center' },
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
                    ${isInteractive ? `<p>🖱️ <strong>${actionText}</strong></p>` : ''}
                    <p>🎯 This ${isInteractive ? 'interactive ' : ''}element should help you with what you're looking for!</p>
                </div>
            `,
            attachTo: {
                element: targetElement,
                on: attachmentPosition
            },
            buttons: [
                {
                    text: isInteractive ? 'Click It!' : 'Got it!',
                    action: () => {
                        if (isInteractive) {
                            // Highlight the element more before clicking
                            this.flashElement(targetElement);
                            setTimeout(() => {
                                targetElement.click();
                                this.speak("I clicked it for you!");
                            }, 500);
                        }
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
        
        // Add highlighting effect with precise pointing
        this.highlightElementPrecisely(targetElement);
        
        // Speak the guidance
        this.speak(message + (isInteractive ? ` ${actionText}` : ''));
        
        // Show notification
        this.showNotification("Found it!", message, "success");
    }

    getOptimalAttachmentPosition(element) {
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Calculate available space in each direction
        const spaceTop = rect.top;
        const spaceBottom = viewportHeight - rect.bottom;
        const spaceLeft = rect.left;
        const spaceRight = viewportWidth - rect.right;
        
        // Choose position based on available space
        if (spaceTop > 200) return 'top';
        if (spaceBottom > 200) return 'bottom';
        if (spaceRight > 300) return 'right';
        if (spaceLeft > 300) return 'left';
        
        // Fallback to position with most space
        const maxSpace = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
        if (maxSpace === spaceTop) return 'top';
        if (maxSpace === spaceBottom) return 'bottom';
        if (maxSpace === spaceRight) return 'right';
        return 'left';
    }

    highlightElementPrecisely(element) {
        // Remove existing highlights
        document.querySelectorAll('.clueless-ai-highlight, .clueless-ai-pointer').forEach(el => {
            el.classList.remove('clueless-ai-highlight', 'clueless-ai-pointer');
        });
        
        // Add precise highlight class
        element.classList.add('clueless-ai-highlight');
        
        // Create a pointer arrow that points directly to the element
        this.createPointerArrow(element);
        
        // Remove highlight after tour
        setTimeout(() => {
            element.classList.remove('clueless-ai-highlight');
            this.removePointerArrow();
        }, 10000);
    }

    createPointerArrow(element) {
        const rect = element.getBoundingClientRect();
        const arrow = document.createElement('div');
        arrow.className = 'clueless-ai-pointer-arrow';
        arrow.innerHTML = '👆';
        
        // Position the arrow to point at the element
        arrow.style.cssText = `
            position: fixed;
            z-index: 10001;
            font-size: 24px;
            animation: clueless-ai-bounce 1s infinite;
            pointer-events: none;
            left: ${rect.left + rect.width / 2 - 12}px;
            top: ${rect.top - 30}px;
        `;
        
        document.body.appendChild(arrow);
        
        // Store reference for cleanup
        this.currentPointerArrow = arrow;
    }

    removePointerArrow() {
        if (this.currentPointerArrow) {
            this.currentPointerArrow.remove();
            this.currentPointerArrow = null;
        }
    }

    flashElement(element) {
        element.style.transition = 'all 0.3s ease';
        element.style.transform = 'scale(1.05)';
        element.style.boxShadow = '0 0 20px #ff6b6b';
        
        setTimeout(() => {
            element.style.transform = '';
            element.style.boxShadow = '';
        }, 300);
    }

    getActionText(element) {
        const tagName = element.tagName.toLowerCase();
        
        switch (tagName) {
            case 'button':
                return 'Click this button to proceed';
            case 'a':
                return 'Click this link to navigate';
            case 'input':
                const type = element.getAttribute('type') || 'text';
                if (type === 'submit' || type === 'button') {
                    return 'Click this button to submit';
                } else {
                    return 'Click here to type your input';
                }
            case 'select':
                return 'Click here to choose an option';
            case 'textarea':
                return 'Click here to enter text';
            default:
                if (this.isInteractiveElement(element)) {
                    return 'Click here to interact';
                }
                return 'This is the element you requested';
        }
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
                    action: 'AI_PARSE_REQUEST',
                    text: originalRequest,
                    pageSnippet: pageSnippet
                }, (response) => {
                    if (response && response.success) {
                        resolve({ selectors: response.selectors || [], message: response.message || null });
                    } else {
                        // Fallback to older selector-only endpoint if available
                        if (response && response.selectors) {
                            resolve({ selectors: response.selectors, message: null });
                        } else {
                            resolve({ selectors: [], message: null });
                        }
                    }
                });
            } catch (err) {
                console.warn('requestAISuggestions error:', err);
                resolve({ selectors: [], message: null });
            }
        });
    }

    getPageContext() {
        // Get more relevant page context for AI processing
        const titleText = document.title || '';
        const headingTexts = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent).join(' ');
        const buttonTexts = Array.from(document.querySelectorAll('button, [role="button"]')).map(b => b.textContent).slice(0, 10).join(' ');
        const linkTexts = Array.from(document.querySelectorAll('a')).map(a => a.textContent).slice(0, 10).join(' ');
        const inputLabels = Array.from(document.querySelectorAll('label, input')).map(i => i.textContent || i.placeholder || i.getAttribute('aria-label')).filter(Boolean).slice(0, 10).join(' ');
        
        return `Title: ${titleText} | Headings: ${headingTexts} | Buttons: ${buttonTexts} | Links: ${linkTexts} | Inputs: ${inputLabels}`.slice(0, 2000);
    }

    smartTextSearch(searchTerm) {
        console.log('Performing smart text search for:', searchTerm);
        
        // Extract keywords from the search term (same logic as popup)
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'how', 'where', 'what', 'when', 'why', 'can', 'could', 'should', 'would', 'find', 'show', 'help', 'me', 'i', 'want', 'need']);
        
        const keywords = searchTerm.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2 && !stopWords.has(word));
        
        console.log('Keywords extracted:', keywords);
        
        const foundElements = new Set();
        
        // Search strategy 1: Exact keyword matches in text content
        keywords.forEach(keyword => {
            const exactMatches = this.findElementsContainingText(keyword, true);
            exactMatches.forEach(el => foundElements.add(el));
        });
        
        // Search strategy 2: Partial keyword matches in text content
        keywords.forEach(keyword => {
            const partialMatches = this.findElementsContainingText(keyword, false);
            partialMatches.forEach(el => foundElements.add(el));
        });
        
        // Search strategy 3: Attribute-based search
        keywords.forEach(keyword => {
            const attrElements = document.querySelectorAll(`
                [aria-label*="${keyword}" i],
                [placeholder*="${keyword}" i],
                [title*="${keyword}" i],
                [alt*="${keyword}" i],
                [data-testid*="${keyword}" i],
                [class*="${keyword}" i],
                [id*="${keyword}" i],
                [name*="${keyword}" i],
                [value*="${keyword}" i]
            `);
            
            Array.from(attrElements).forEach(el => foundElements.add(el));
        });
        
        // Convert Set to Array and filter
        const elementsArray = Array.from(foundElements);
        const visibleElements = elementsArray.filter(el => this.isElementVisible(el));
        const prioritizedElements = this.prioritizeInteractiveElements(visibleElements);
        
        console.log(`Found ${prioritizedElements.length} elements for keywords: ${keywords.join(', ')}`);
        return prioritizedElements;
    }

    findElementsContainingText(keyword, exactMatch = false) {
        const elements = [];
        const allElements = document.querySelectorAll('*');
        
        for (const element of allElements) {
            // Skip elements with children (we want leaf nodes for text content)
            if (element.children.length > 0) continue;
            
            const text = element.textContent?.trim().toLowerCase();
            if (!text) continue;
            
            let isMatch = false;
            if (exactMatch) {
                // Look for the keyword as a whole word
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                isMatch = regex.test(text);
            } else {
                // Look for the keyword as a substring
                isMatch = text.includes(keyword.toLowerCase());
            }
            
            if (isMatch) {
                // Also check parent elements for interactivity
                let targetElement = element;
                let parent = element.parentElement;
                
                // Walk up the DOM to find the nearest interactive parent
                while (parent && parent !== document.body) {
                    if (this.isInteractiveElement(parent)) {
                        targetElement = parent;
                        break;
                    }
                    parent = parent.parentElement;
                }
                
                elements.push(targetElement);
            }
        }
        
        return elements;
    }

    getElementDescription(element) {
        const tagName = element.tagName.toLowerCase();
        const text = element.textContent?.trim().slice(0, 30) || '';
        
        if (tagName === 'button') {
            return `button "${text}"`;
        } else if (tagName === 'a') {
            return `link "${text}"`;
        } else if (tagName === 'input') {
            const type = element.getAttribute('type') || 'text';
            const placeholder = element.getAttribute('placeholder') || '';
            return `${type} input ${placeholder ? `"${placeholder}"` : ''}`;
        } else if (tagName === 'select') {
            return 'dropdown menu';
        } else if (element.getAttribute('role') === 'button') {
            return `clickable element "${text}"`;
        } else if (this.isInteractiveElement(element)) {
            return `interactive element "${text}"`;
        } else {
            return `element containing "${text}"`;
        }
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
