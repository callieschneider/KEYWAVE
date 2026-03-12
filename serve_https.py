#!/usr/bin/env python3
import http.server, ssl, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static'))
base = os.path.dirname(os.path.abspath(__file__))

server = http.server.HTTPServer(('0.0.0.0', 5180), http.server.SimpleHTTPRequestHandler)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(os.path.join(base, 'cert.pem'), os.path.join(base, 'key.pem'))
server.socket = ctx.wrap_socket(server.socket, server_side=True)

print('HTTPS server on https://0.0.0.0:5180')
server.serve_forever()
