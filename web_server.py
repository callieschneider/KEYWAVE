"""
KEYWAVE Web Server
Simple static file server for Railway deployment
"""

import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from functools import partial

PORT = int(os.environ.get('PORT', 8080))
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)
    
    def log_message(self, format, *args):
        # Quieter logging
        pass

def main():
    os.chdir(STATIC_DIR)
    handler = partial(SimpleHTTPRequestHandler, directory=STATIC_DIR)
    httpd = HTTPServer(('0.0.0.0', PORT), handler)
    print(f"KEYWAVE server running on port {PORT}")
    print(f"Serving files from: {STATIC_DIR}")
    httpd.serve_forever()

if __name__ == "__main__":
    main()
