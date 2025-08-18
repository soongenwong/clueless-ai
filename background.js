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

            case 'AI_SUGGEST_SELECTORS':
                // Use GROQ API with model llama-3.1-8b-instant to suggest CSS selectors
                chrome.storage.local.get(['groq_api_key'], async (items) => {
                    const apiKey = items.groq_api_key;
                    if (!apiKey) {
                        sendResponse({ success: false, error: 'missing_groq_api_key' });
                        return;
                    }

                    try {
                        const prompt = `You are an assistant that returns a JSON object with a single key \"selectors\" whose value is an array of CSS selectors (or :contains() pseudo selectors) that best match the user's request.\nUser request: "${(request.requestText || '').replace(/"/g,'\"')}"\nPage snippet: "${(request.pageSnippet || '').replace(/"/g,'\"').slice(0,2000)}"\nRespond ONLY with valid JSON like: {"selectors": ["selector1", "selector2"]}`;

                        const body = {
                            messages: [
                                {
                                    role: "user",
                                    content: prompt
                                }
                            ],
                            model: "llama-3.1-8b-instant",
                            max_tokens: 300
                        };

                        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: JSON.stringify(body)
                        });

                        const data = await resp.json();

                        // Extract response from GROQ API format
                        let textOutput = '';
                        if (data.choices && data.choices[0] && data.choices[0].message) {
                            textOutput = data.choices[0].message.content;
                        } else if (data.choices && data.choices[0]) {
                            textOutput = data.choices[0].text || '';
                        } else {
                            console.error('Unexpected GROQ API response format:', data);
                            textOutput = JSON.stringify(data);
                        }

                        // Extract first JSON object from the model output
                        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
                        let selectors = [];
                        if (jsonMatch) {
                            try {
                                const parsed = JSON.parse(jsonMatch[0]);
                                if (Array.isArray(parsed.selectors)) selectors = parsed.selectors;
                            } catch (e) {
                                console.warn('Failed to parse selectors JSON from model output:', e);
                            }
                        }

                        sendResponse({ success: true, selectors });
                    } catch (err) {
                        console.warn('GROQ selector request failed:', err);
                        sendResponse({ success: false, error: String(err) });
                    }
                });
                return true; // indicate we'll call sendResponse asynchronously

            case 'AI_PARSE_REQUEST':
                // Use GROQ API with model llama-3.1-8b-instant to parse natural language request
                chrome.storage.local.get(['groq_api_key'], async (items) => {
                    const apiKey = items.groq_api_key;
                    if (!apiKey) {
                        sendResponse({ success: false, error: 'missing_groq_api_key' });
                        return;
                    }

                    try {
                        const prompt = `You are a helpful assistant for a browser extension. The user gives a natural language request and a short page snippet. Your job is to help them find CLICKABLE, INTERACTIVE elements they can actually use.

IMPORTANT: Focus on elements the user can click, type in, or interact with (buttons, links, inputs, menus, etc.).

Respond ONLY with valid JSON with these keys:
- "selectors": an array of CSS selectors (can include :contains("text") pseudo-selectors) that find INTERACTIVE elements matching the user's intent, ordered by priority
- "message": a short, natural instruction telling the user what they can DO with the element you found

User request: "${(request.text || '').replace(/"/g,'\\"')}"
Page snippet: "${(request.pageSnippet || '').replace(/"/g,'\\"').slice(0,2000)}"

Examples of good responses:
{"selectors": ["button:contains('Sign In')", "a[href*='login']"], "message": "Click here to sign into your account"}
{"selectors": ["input[placeholder*='search']", "button:contains('Search')"], "message": "Type your search term here and click search"}
{"selectors": ["a[href*='contact']", "button:contains('Contact')"], "message": "Click here to get in touch with support"}

Respond only with JSON:`;

                        const body = {
                            messages: [
                                {
                                    role: "user",
                                    content: prompt
                                }
                            ],
                            model: "llama-3.1-8b-instant",
                            max_tokens: 500
                        };

                        const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: JSON.stringify(body)
                        });

                        const data = await resp.json();

                        let textOutput = '';
                        if (data.choices && data.choices[0] && data.choices[0].message) {
                            textOutput = data.choices[0].message.content;
                        } else if (data.choices && data.choices[0]) {
                            textOutput = data.choices[0].text || '';
                        } else {
                            console.error('Unexpected GROQ API response format for AI_PARSE_REQUEST:', data);
                            textOutput = JSON.stringify(data);
                        }

                        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
                        let selectors = [];
                        let message = '';
                        if (jsonMatch) {
                            try {
                                const parsed = JSON.parse(jsonMatch[0]);
                                if (Array.isArray(parsed.selectors)) selectors = parsed.selectors;
                                if (typeof parsed.message === 'string') message = parsed.message;
                            } catch (e) {
                                console.warn('Failed to parse AI_PARSE_REQUEST JSON:', e);
                            }
                        }

                        sendResponse({ success: true, selectors, message });
                    } catch (err) {
                        console.warn('GROQ parse request failed:', err);
                        sendResponse({ success: false, error: String(err) });
                    }
                });
                return true;

            case 'SUMMARIZE_PAGE_CONTENT':
                // Simple page summary without complex AI processing
                try {
                    const pageContent = request.pageContent || {};
                    
                    // Create a simple summary based on page content
                    let summary = '';
                    let keyPoints = [];
                    
                    // Generate summary from title and headings
                    if (pageContent.title) {
                        summary = `This page is titled "${pageContent.title}"`;
                        
                        if (pageContent.headings && pageContent.headings.length > 0) {
                            const mainHeadings = pageContent.headings.slice(0, 3).map(h => h.text).join(', ');
                            summary += ` and covers topics including: ${mainHeadings}.`;
                        } else {
                            summary += '.';
                        }
                        
                        // Add main text context if available
                        if (pageContent.mainText && pageContent.mainText.length > 50) {
                            const firstSentence = pageContent.mainText.split('.')[0];
                            if (firstSentence.length > 10 && firstSentence.length < 200) {
                                summary += ` ${firstSentence}.`;
                            }
                        }
                    } else {
                        summary = 'This webpage contains various content and functionality.';
                    }
                    
                    // Generate key points from available actions
                    if (pageContent.buttons && pageContent.buttons.length > 0) {
                        keyPoints.push(`Interactive buttons: ${pageContent.buttons.slice(0, 3).join(', ')}`);
                    }
                    
                    if (pageContent.links && pageContent.links.length > 0) {
                        const linkTexts = pageContent.links.slice(0, 3).map(l => l.text).filter(t => t);
                        if (linkTexts.length > 0) {
                            keyPoints.push(`Navigation links: ${linkTexts.join(', ')}`);
                        }
                    }
                    
                    if (pageContent.forms && pageContent.forms.length > 0) {
                        keyPoints.push('Forms available for user input');
                    }
                    
                    // Add URL context
                    if (pageContent.url) {
                        try {
                            const domain = new URL(pageContent.url).hostname;
                            keyPoints.push(`Visit ${domain} for more information`);
                        } catch (e) {
                            // Invalid URL, skip
                        }
                    }
                    
                    // Ensure we have at least some key points
                    if (keyPoints.length === 0) {
                        keyPoints = [
                            'Browse the content on this page',
                            'Use navigation links to explore',
                            'Look for interactive elements to engage with'
                        ];
                    }
                    
                    sendResponse({ success: true, summary, keyPoints });
                    
                } catch (err) {
                    console.warn('Simple summarization failed:', err);
                    sendResponse({ 
                        success: true, 
                        summary: 'This webpage contains content and interactive elements for user engagement.',
                        keyPoints: ['Explore the page content', 'Use available navigation', 'Interact with buttons and links']
                    });
                }
                return true;

            case 'ELEVEN_TTS':
                // Use Eleven Labs TTS (eleven_flash_v2_5) to synthesize audio and return base64
                chrome.storage.local.get(['eleven_api_key', 'eleven_voice_id'], async (items) => {
                    const apiKey = items.eleven_api_key;
                    const voiceId = items.eleven_voice_id || 'alloy';

                    if (!apiKey) {
                        sendResponse({ success: false, error: 'missing_eleven_api_key' });
                        return;
                    }

                    try {
                        const elevenEndpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
                        const payload = {
                            text: request.text || '',
                            model: 'eleven_flash_v2_5'
                        };

                        const resp = await fetch(elevenEndpoint, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'xi-api-key': apiKey
                            },
                            body: JSON.stringify(payload)
                        });

                        if (!resp.ok) {
                            const text = await resp.text();
                            console.warn('Eleven TTS error response:', resp.status, text);
                            sendResponse({ success: false, error: `eleven_error_${resp.status}` });
                            return;
                        }

                        const arrayBuffer = await resp.arrayBuffer();
                        // Convert to base64
                        const base64 = arrayBufferToBase64(arrayBuffer);
                        sendResponse({ success: true, audioBase64: base64 });
                    } catch (err) {
                        console.warn('Eleven TTS request failed:', err);
                        sendResponse({ success: false, error: String(err) });
                    }
                });
                return true;

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
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJ3aGl0ZSI+CjxwYXRoIGQ9Im0xMiAyIDMuMDkgNi4yNkwyMSA9bC0yLjc5IDQuNzQuNjkgNi42OS01Ljc5LTMuMTNMMTAgMjBsLjY5LTYuNjlMMSA9bDUuOTEtLjc0TDEyIDJ6Ii8+Cjwvc3ZnPgo8L3N2Zz4K',
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

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
