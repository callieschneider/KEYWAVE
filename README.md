# KEYWAVE

Turn your keyboard typing into music. Every keypress plays a musical note based on letter frequency in English.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Grant Accessibility Permission (macOS)

KEYWAVE needs to listen to keyboard events globally. On macOS:

1. Open **System Preferences** → **Privacy & Security** → **Privacy** tab
2. Select **Accessibility** in the left sidebar
3. Click the lock icon and authenticate
4. Click **+** and add your Terminal app (Terminal.app, iTerm, etc.)
5. Restart your terminal

### 3. Run the Server

```bash
python server.py
```

### 4. Open the Browser

Navigate to: **http://localhost:8080**

Click anywhere on the page to enable audio (browser autoplay policy).

## How It Works

```
Keyboard → pynput (Python) → WebSocket → Browser → Web Audio API → Sound
```

- **Python backend** captures global keyboard events using `pynput`
- Events are broadcast over **WebSocket** to connected browsers
- **Web Audio API** synthesizes notes with minimal latency
- Letters map to musical notes based on frequency in English text

### Letter-to-Note Mapping

| Tier | Letters | Behavior |
|------|---------|----------|
| Most common | e, t, a, o, i, n | Root, 3rd, 5th - stable tones |
| Common | s, r, h, l, d, c, u, m, w | Scale degrees - melodic fill |
| Less common | f, g, y, p, b, v, k | Higher octave - brightness |
| Rare | j, x, q, z | Octave jumps - emphasis |
| Space | (spacebar) | Rest - silence |
| Enter | (return) | Low root note |

## Controls

- **Scale**: Major, Minor, Pentatonic, Blues, Dorian
- **Wave**: Sine, Triangle, Sawtooth, Square
- **Octave Range**: 1-3 octaves
- **Reverb**: 0-100% wet mix
- **Decay**: 100-1000ms note length
- **Volume**: Master volume

## Files

```
KEYWAVE/
├── server.py          # Keyboard listener + servers
├── static/
│   ├── index.html     # UI structure
│   ├── style.css      # Dark theme styling
│   └── app.js         # Audio engine + visuals
├── requirements.txt   # Python dependencies
└── README.md          # This file
```

## Troubleshooting

### "No sound playing"
- Click anywhere on the page to enable audio
- Check that the status shows "Connected"
- Verify WebSocket server is running (check terminal output)

### "Keyboard not detected"
- Ensure Accessibility permission is granted
- Restart terminal after granting permission
- Try running with `sudo python server.py` (not recommended for regular use)

### "High latency"
- Close other audio applications
- Use Chrome or Firefox (Safari has higher audio latency)
- Reduce reverb amount

## Tech Stack

- **Python 3.8+** with pynput, websockets
- **Vanilla JavaScript** with Web Audio API
- **No build tools** - just open and run

---

Built for exploring the musicality of everyday typing.
