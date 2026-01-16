#!/usr/bin/env python3
"""
KEYWAVE Server
==============
Global keyboard listener that broadcasts keypresses via WebSocket.
Also serves the static frontend files.

How it works:
1. pynput.keyboard.Listener captures ALL keyboard events system-wide
2. Each keypress/release is broadcast to all connected WebSocket clients as JSON
3. Modifier key states (shift, ctrl, alt, etc.) are tracked and sent with events
4. A simple HTTP server serves the static frontend files

Requires macOS Accessibility permission:
  System Preferences → Privacy & Security → Accessibility → Add Terminal
"""

import asyncio
import json
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from functools import partial
import os

# Third-party imports
from pynput import keyboard
import websockets

# Configuration
HTTP_PORT = 8080
WS_PORT = 8765
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

# Global set of connected WebSocket clients
connected_clients = set()

# Async event loop reference (set in main)
loop = None

# Track modifier key states
modifier_state = {
    'shift': False,
    'ctrl': False,
    'alt': False,
    'cmd': False,
    'caps_lock': False
}

# Map pynput key names to our modifier names
MODIFIER_KEYS = {
    'shift': ['shift', 'shift_l', 'shift_r'],
    'ctrl': ['ctrl', 'ctrl_l', 'ctrl_r'],
    'alt': ['alt', 'alt_l', 'alt_r', 'alt_gr'],
    'cmd': ['cmd', 'cmd_l', 'cmd_r'],
    'caps_lock': ['caps_lock']
}

# Special keys we care about
SPECIAL_KEYS = {
    'space': 'space',
    'enter': 'enter',
    'backspace': 'backspace',
    'delete': 'delete',
    'tab': 'tab',
    'esc': 'escape',
    'up': 'up',
    'down': 'down',
    'left': 'left',
    'right': 'right',
    'f1': 'f1', 'f2': 'f2', 'f3': 'f3', 'f4': 'f4', 'f5': 'f5',
    'f6': 'f6', 'f7': 'f7', 'f8': 'f8', 'f9': 'f9', 'f10': 'f10',
    'f11': 'f11', 'f12': 'f12'
}


def get_key_name(key):
    """Extract the key name from a pynput key object."""
    if hasattr(key, 'char') and key.char is not None:
        return key.char.lower()
    else:
        return str(key).replace('Key.', '').lower()


def is_modifier_key(key_name):
    """Check if a key name is a modifier key."""
    for mod_name, mod_keys in MODIFIER_KEYS.items():
        if key_name in mod_keys:
            return mod_name
    return None


def on_key_press(key):
    """
    Callback for pynput keyboard listener - key press events.
    """
    global modifier_state
    
    try:
        key_name = get_key_name(key)
        
        # Check if it's a modifier key
        mod_name = is_modifier_key(key_name)
        if mod_name:
            modifier_state[mod_name] = True
            # Send modifier state update
            send_event('modifier', mod_name, True)
            return
        
        # Check if it's a special key we care about
        if key_name in SPECIAL_KEYS:
            key_str = SPECIAL_KEYS[key_name]
        elif hasattr(key, 'char') and key.char is not None:
            key_str = key.char.lower()
        else:
            # Ignore other keys
            return
        
        # Send keydown event with modifier states
        send_event('keydown', key_str, modifier_state.copy())
            
    except Exception as e:
        print(f"Error processing key press: {e}", flush=True)


def on_key_release(key):
    """
    Callback for pynput keyboard listener - key release events.
    """
    global modifier_state
    
    try:
        key_name = get_key_name(key)
        
        # Check if it's a modifier key
        mod_name = is_modifier_key(key_name)
        if mod_name:
            modifier_state[mod_name] = False
            # Send modifier state update
            send_event('modifier', mod_name, False)
            return
        
        # Check if it's a special key we care about
        if key_name in SPECIAL_KEYS:
            key_str = SPECIAL_KEYS[key_name]
        elif hasattr(key, 'char') and key.char is not None:
            key_str = key.char.lower()
        else:
            return
        
        # Send keyup event
        send_event('keyup', key_str, modifier_state.copy())
            
    except Exception as e:
        print(f"Error processing key release: {e}", flush=True)


def send_event(event_type, key, data):
    """Create and send an event message."""
    message = json.dumps({
        "type": event_type,
        "key": key,
        "modifiers": modifier_state if event_type in ['keydown', 'keyup'] else None,
        "value": data if event_type == 'modifier' else None,
        "timestamp": int(time.time() * 1000)
    })
    
    if loop and connected_clients:
        asyncio.run_coroutine_threadsafe(broadcast(message), loop)


async def broadcast(message):
    """Send a message to all connected WebSocket clients."""
    if connected_clients:
        tasks = [asyncio.create_task(safe_send(client, message)) for client in connected_clients]
        await asyncio.gather(*tasks)


async def safe_send(websocket, message):
    """Send message to a single client, removing it if disconnected."""
    try:
        await websocket.send(message)
    except websockets.exceptions.ConnectionClosed:
        connected_clients.discard(websocket)


async def websocket_handler(websocket, path=None):
    """Handle a new WebSocket connection."""
    connected_clients.add(websocket)
    print(f"Client connected. Total clients: {len(connected_clients)}", flush=True)
    
    try:
        async for message in websocket:
            pass  # Client messages ignored for now
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"Client disconnected. Total clients: {len(connected_clients)}", flush=True)


def run_http_server():
    """Run the HTTP server for static files in a separate thread."""
    os.chdir(STATIC_DIR)
    handler = partial(SimpleHTTPRequestHandler, directory=STATIC_DIR)
    httpd = HTTPServer(('localhost', HTTP_PORT), handler)
    print(f"HTTP server running at http://localhost:{HTTP_PORT}", flush=True)
    httpd.serve_forever()


async def main():
    """Main entry point - starts all services."""
    global loop
    loop = asyncio.get_event_loop()
    
    # Start HTTP server in background thread
    http_thread = threading.Thread(target=run_http_server, daemon=True)
    http_thread.start()
    
    # Start keyboard listener in background thread with both press and release handlers
    listener = keyboard.Listener(on_press=on_key_press, on_release=on_key_release)
    listener.start()
    print("Keyboard listener started (requires Accessibility permission)", flush=True)
    
    # Start WebSocket server
    print(f"WebSocket server running at ws://localhost:{WS_PORT}", flush=True)
    async with websockets.serve(websocket_handler, "localhost", WS_PORT):
        print("\n" + "="*50, flush=True)
        print("KEYWAVE is running!", flush=True)
        print(f"Open http://localhost:{HTTP_PORT} in your browser", flush=True)
        print("Press Ctrl+C to stop", flush=True)
        print("="*50 + "\n", flush=True)
        
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down...")
