#!/usr/bin/env python3
"""
Simple HTTP server for testing the Clueless AI extension with local HTML files.
This avoids file:// URL restrictions in Chrome extensions.

Usage:
    python3 start-test-server.py

Then open: http://localhost:8000/test-page.html
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to avoid any potential issues
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

def start_server():
    # Change to the directory containing this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"🚀 Test server starting at http://localhost:{PORT}")
        print(f"📁 Serving files from: {script_dir}")
        print(f"🔗 Test page URL: http://localhost:{PORT}/test-page.html")
        print(f"🤖 Open this URL in Chrome and test your Clueless AI extension!")
        print(f"⏹️  Press Ctrl+C to stop the server")
        
        # Try to open the test page automatically
        try:
            webbrowser.open(f"http://localhost:{PORT}/test-page.html")
            print(f"🌐 Opened test page in your default browser")
        except:
            print(f"💡 Manually open: http://localhost:{PORT}/test-page.html")
        
        print(f"📡 Server is running...")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n🛑 Server stopped by user")
            sys.exit(0)

if __name__ == "__main__":
    start_server()
