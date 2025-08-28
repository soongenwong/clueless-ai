const express = require('express');
const path = require('path');
const open = require('open');

const app = express();
const PORT = 8000;

// Serve static files from current directory
app.use(express.static('.'));

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    next();
});

// Root route redirects to test page
app.get('/', (req, res) => {
    res.redirect('/test-page.html');
});

app.listen(PORT, () => {
    console.log('🚀 Test server starting at http://localhost:' + PORT);
    console.log('📁 Serving files from: ' + __dirname);
    console.log('🔗 Test page URL: http://localhost:' + PORT + '/test-page.html');
    console.log('🤖 Open this URL in Chrome and test your Clueless AI extension!');
    console.log('⏹️  Press Ctrl+C to stop the server');
    
    // Try to open the test page automatically
    open('http://localhost:' + PORT + '/test-page.html')
        .then(() => console.log('🌐 Opened test page in your default browser'))
        .catch(() => console.log('💡 Manually open: http://localhost:' + PORT + '/test-page.html'));
    
    console.log('📡 Server is running...');
});
