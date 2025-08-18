# 🤖 Clueless AI - Smart Web Assistant

**An AI-powered 4. **Pin the extension** to your toolbar for easy access

## ⚙️ Configuration (Optional)

Clueless AI works great out of the box, but you can enhance it with optional API integrations:

### GROQ API (Optional - for advanced AI features)
1. **Get a GROQ API key** from [console.groq.com](https://console.groq.com)
2. **Open the extension popup**
3. **Enter your GROQ API key** in the settings
4. **Click "Save Keys"** to enable advanced AI features

### ElevenLabs TTS (Optional - for premium voice)
1. **Get an ElevenLabs API key** from [elevenlabs.io](https://elevenlabs.io)
2. **Enter your API key** in the extension settings
3. **Enhanced voice quality** for read-aloud features

> **Note**: The extension works fully without any API keys - these are just for enhanced features!rowser extension that provides visual guidance and page summarization on any website**

Clueless AI is a revolutionary browser extension that transforms how users interact with websites by providing intelligent, visual guidance for any task and instant page summaries. Simply tell it what you're looking for, and it will find and highlight the relevant elements on any webpage with voice guidance and interactive tours. Get quick page summaries to understand content at a glance.

## 🚀 Quick Start

1. **Install** the extension (see installation guide below)
2. **Visit any website** you want help with
3. **Click the 🤖 extension icon** in your browser toolbar
4. **Try it out**:
   - Type "find the search bar" and click "Guide Me"
   - Or click "📄 Summarize Page" for an instant overview
5. **Enjoy guided assistance** with visual highlights and voice instructions!

## ✨ Features

- **Universal Web Support**: Works on any website, not just specific ones
- **Page Summarization**: Instantly understand what any webpage is about
- **Intelligent Element Detection**: Smart algorithms find what you're looking for
- **Visual Guidance**: Interactive tours with highlighting and tooltips
- **Voice Instructions**: Spoken guidance using text-to-speech
- **Simple Natural Language**: Just tell it what you want in plain English
- **Beautiful UI**: Clean, modern interface that doesn't get in the way
- **No API Keys Required**: Core functionality works without external dependencies

## 🚀 How It Works

### Visual Guidance
1. **Click the extension icon** in your browser toolbar
2. **Type what you need help with** (e.g., "find the search bar", "help me login")
3. **Get guided assistance** with visual highlights and voice instructions
4. **Complete your task** with confidence!

### Page Summarization
1. **Click the extension icon** in your browser toolbar
2. **Click "📄 Summarize Page"** button
3. **Get an instant summary** of the page content and key interactive elements
4. **Use "🔊 Read Aloud"** to hear the summary spoken

## 💡 Example Requests

### Visual Guidance Examples
- "Find the search bar"
- "Show me how to login"
- "Where is the menu?"
- "Help me checkout"
- "Find contact information"
- "Show me the shopping cart"
- "Where do I sign up?"

### Page Summary Features
- **Instant Understanding**: Get a quick overview of any webpage's purpose
- **Key Points Extraction**: Identify main interactive elements (buttons, forms, links)
- **Content Analysis**: Understand page structure and navigation options
- **Accessibility**: Read summaries aloud with text-to-speech

## 🛠️ Installation

### For Chrome/Edge (Developer Mode)

1. **Download the extension files** to a folder on your computer
2. **Open Chrome** and go to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in the top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Pin the extension** to your toolbar for easy access

### For Firefox (Developer Mode)

1. **Open Firefox** and go to `about:debugging`
2. **Click "This Firefox"**
3. **Click "Load Temporary Add-on"**
4. **Select the manifest.json file** from the extension folder

## 🏗️ Project Structure

```
clueless-ai/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html             # Extension popup interface with summary section
├── popup.js               # Popup logic, NLP processing, and summary display
├── content-script.js      # Main AI guidance engine and content extraction
├── content-styles.css     # Custom styling for guidance and summaries
├── background.js          # Background service worker with AI integrations
├── shepherd.js            # Tour library (Shepherd.js) for visual guidance
├── shepherd.css           # Tour library styles
└── README.md              # This documentation
```

## 🔧 Current Implementation

### Core Features (No API Required)
- **Local NLP**: Keyword-based natural language processing
- **Page Analysis**: Rule-based content extraction and summarization
- **Element Detection**: CSS selector and pattern matching
- **Visual Tours**: Shepherd.js integration for guidance
- **Browser TTS**: Built-in speech synthesis for voice guidance

### Enhanced Features (API-Powered)
- **GROQ Integration**: Advanced AI for complex natural language requests
- **ElevenLabs TTS**: Premium voice synthesis for better audio quality
- **Contextual Understanding**: Better interpretation of user intent

## 🧠 How the AI Works

### Local Processing First
The extension prioritizes local processing for reliability:
- **Rule-based Summarization**: Analyzes page titles, headings, and content structure
- **Keyword-based NLP**: Simple natural language processing without external APIs
- **Pattern Recognition**: Identifies common web patterns and element types

### Enhanced AI Features (Optional)
For advanced functionality, optional API integrations include:
- **GROQ API**: Advanced natural language understanding for complex requests
- **ElevenLabs TTS**: High-quality voice synthesis for read-aloud features

### Simple NLP Engine
The extension uses a keyword-based natural language processing system that:
- Analyzes user input for intent (search, login, navigation, etc.)
- Maps requests to CSS selectors and element patterns
- Falls back to generic text-based searching

### Page Content Analysis
The summarization system works by:
- **Content Extraction**: Pulls titles, headings, main text, and interactive elements
- **Structure Analysis**: Identifies page layout and navigation patterns
- **Key Point Generation**: Highlights important buttons, links, and forms
- **Smart Prioritization**: Focuses on user-actionable elements

### Intelligent Element Finding
The system finds elements using multiple strategies:
- **Semantic selectors**: `[aria-label*="search"]`, `[role="searchbox"]`
- **Text content matching**: Elements containing relevant keywords
- **Common patterns**: Standard web form patterns and conventions
- **Visual heuristics**: Prioritizes visible, interactive elements

### Visual Guidance System
- **Shepherd.js Integration**: Creates beautiful, interactive tours
- **Smart Positioning**: Automatically positions guidance tooltips
- **Progressive Discovery**: Shows alternative options if first choice isn't right
- **Accessibility**: Works with screen readers and keyboard navigation

## 🔧 Technical Implementation

### Manifest V3 Compliance
- Uses modern Chrome extension standards
- Service worker for background processing
- Content Security Policy compliant

### Cross-Site Compatibility
- Injects safely into any website
- Respects site CSP policies where possible
- Graceful degradation when blocked

### Performance Optimized
- Lazy loading of tour libraries
- Minimal DOM impact
- Efficient element detection algorithms

## 🎯 Hackathon Achievement Targets

This project demonstrates:

1. **Full-Stack Development**: Frontend UI, content injection, background processing
2. **AI/ML Integration**: Natural language processing and intelligent element detection
3. **Browser APIs**: Extension APIs, Web Speech API, DOM manipulation
4. **User Experience**: Intuitive interface with accessibility considerations
5. **Cross-Platform**: Works across different websites and browsers

## 🚀 Future Enhancements

- **Machine Learning**: Train models on user interactions for better element detection
- **Advanced Summarization**: Enhanced AI-powered content analysis
- **Site-Specific Optimizations**: Custom logic for popular websites
- **User Profiles**: Remember preferences and common tasks
- **Analytics Dashboard**: Usage insights and optimization suggestions
- **Mobile Support**: Browser extension support for mobile devices
- **Multi-language**: Support for non-English websites and instructions
- **Collaborative Features**: Share helpful guidance patterns between users

## 🏆 Hackathon Demo Script

### Core Features Demo
1. **Open any website** (e.g., GitHub, Amazon, Stack Overflow)
2. **Click the Clueless AI extension**
3. **Try different requests**:
   - "Find the search bar" → Highlights and guides to search functionality
   - "Help me login" → Finds and explains login options
   - "Where's the menu?" → Locates navigation elements

### Page Summarization Demo
4. **Click "📄 Summarize Page"** → Shows instant page summary
5. **Review key points** → See extracted buttons, links, and interactive elements
6. **Try "🔊 Read Aloud"** → Demonstrates text-to-speech integration
7. **Cross-site testing** → Switch to different websites to show universal compatibility

### Advanced Features (Optional)
8. **Show API integration** → Demonstrate GROQ API for complex requests
9. **Voice guidance** → Show enhanced TTS with ElevenLabs
10. **Alternative options** → Click "Find Another" to see multiple results

## 📊 Success Metrics

- **Universal Compatibility**: Works on 95%+ of websites without setup
- **Accuracy Rate**: Finds requested elements 80%+ of the time
- **Summary Quality**: Provides meaningful page overviews in <2 seconds
- **User Satisfaction**: Intuitive enough for non-technical users
- **Performance**: <500ms response time for element detection
- **Accessibility**: Compatible with assistive technologies
- **Reliability**: Core features work without internet connectivity

## 🤝 Contributing

This is a hackathon project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple websites
5. Submit a pull request

## 📝 License

MIT License - feel free to use this project as inspiration for your own AI-powered web tools!

---

**Built with ❤️ for making the web more accessible to everyone!**
