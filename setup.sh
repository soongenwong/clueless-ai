#!/bin/bash

# Clueless AI Browser Extension - Quick Setup
echo "🤖 Setting up Clueless AI Browser Extension..."

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: Please run this script from the extension directory containing manifest.json"
    exit 1
fi

echo "✅ Extension files found!"

# Check if Shepherd.js files exist
if [ ! -f "shepherd.js" ] || [ ! -f "shepherd.css" ]; then
    echo "📥 Downloading Shepherd.js library..."
    
    # Download Shepherd.js if not present
    if ! command -v curl &> /dev/null; then
        echo "❌ Error: curl is required to download dependencies"
        exit 1
    fi
    
    curl -o shepherd.js https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/js/shepherd.min.js
    curl -o shepherd.css https://cdn.jsdelivr.net/npm/shepherd.js@11.2.0/dist/css/shepherd.css
    
    echo "✅ Dependencies downloaded!"
fi

# Validate manifest.json
echo "🔍 Validating extension files..."

if command -v python3 &> /dev/null; then
    python3 -c "import json; json.load(open('manifest.json'))" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ manifest.json is valid"
    else
        echo "❌ Error: manifest.json is not valid JSON"
        exit 1
    fi
fi

# Count files
FILE_COUNT=$(ls -1 *.js *.css *.html *.json 2>/dev/null | wc -l)
echo "📁 Extension contains $FILE_COUNT files"

echo ""
echo "🎉 Clueless AI Extension is ready!"
echo ""
echo "📋 Installation Instructions:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top-right)"
echo "3. Click 'Load unpacked' and select this folder"
echo "4. Pin the extension to your toolbar"
echo "5. Visit any website and click the extension icon!"
echo ""
echo "🚀 Try these example requests:"
echo "   • 'Find the search bar'"
echo "   • 'Help me login'"
echo "   • 'Where is the menu?'"
echo "   • 'Show me the shopping cart'"
echo ""
echo "Happy browsing with AI assistance! 🤖✨"
