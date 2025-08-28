# 🔧 Troubleshooting Guide

## Error: "Make sure you are on a webpage"

This error occurs when the extension can't inject its content script into the current page. Here are the solutions:

### 🎯 Quick Solutions

#### Option 1: Enable File URL Access (for local HTML files)
1. Open Chrome and go to `chrome://extensions/`
2. Find "Clueless AI - Web Assistant"
3. Click the "Details" button
4. Scroll down and toggle ON "Allow access to file URLs"
5. Reload your test page and try again

#### Option 2: Use Local Server (Recommended)
Instead of opening `file://` URLs, use a local server:

**Python method:**
```bash
python3 start-test-server.py
```

**Node.js method:**
```bash
npm install
npm start
```

Both will open `http://localhost:8000/test-page.html` automatically.

#### Option 3: Test on Live Websites
The extension works perfectly on live websites without any setup:
- https://example.com
- https://github.com
- https://stackoverflow.com
- https://amazon.com

### 🔍 Debugging Steps

1. **Check the Console**
   - Open Developer Tools (F12)
   - Look for error messages in the Console tab
   - Check if content scripts are loading

2. **Verify Extension Permissions**
   - Go to `chrome://extensions/`
   - Ensure the extension is enabled
   - Check that permissions are granted

3. **Test Basic Functionality**
   - Try clicking "📄 Summarize Page" first
   - If that works, the issue is with the guidance feature specifically

### 🚨 Common Issues

#### Issue: Extension icon is grayed out
**Solution:** The current page doesn't allow extensions (like chrome:// pages). Switch to a regular website.

#### Issue: "Failed to establish connection"
**Solution:** The content script isn't loaded. Check:
- Extension is enabled
- Page is fully loaded
- Try refreshing the page

#### Issue: Works on some sites but not others
**Solution:** Some sites have strict Content Security Policies. This is normal - try the extension on different sites.

### ✅ Verification Checklist

- [ ] Extension is installed and enabled
- [ ] "Allow access to file URLs" is enabled (for local testing)
- [ ] Page is fully loaded
- [ ] Not on a restricted page (chrome://, about:, etc.)
- [ ] Developer console shows no critical errors

### 🛠️ Developer Tools

To see what's happening under the hood:

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Try the extension**
4. **Look for messages like:**
   - "Content script connection test successful"
   - "Background received message"
   - Any error messages in red

### 📞 Still Having Issues?

If none of these solutions work:

1. **Test on a known working site** like https://example.com
2. **Check the browser console** for specific error messages
3. **Try reloading the extension** in chrome://extensions/
4. **Restart Chrome** and try again

The extension has been tested and works reliably on standard web pages!
