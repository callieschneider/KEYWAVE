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

- **Scale**: Major, Minor, Pentatonic, Blues, Dorian, and 15+ more
- **Wave**: Sine, Triangle, Sawtooth, Square
- **Octave Range**: 1-3 octaves
- **Reverb**: 0-100% wet mix
- **Decay**: 100-2000ms note length
- **Volume**: Master volume
- **Effects Preset**: Ambient, Lo-Fi, Synth Lead, Dark, Aggressive, Dreamy, 8-Bit

## Webcam Motion Mode

Switch to Webcam mode using the Input toggle. Move in front of your camera to trigger notes.

### How It Works

```
Camera → Frame Differencing → Motion Map → Grid Cells → Note Triggers → Web Audio
```

1. Webcam feed is captured and analyzed at 25fps on a low-resolution canvas
2. Frame differencing computes per-pixel motion between consecutive frames
3. The video is divided into a **note grid** (right side) and a **control strip** (left side)
4. Each grid cell maps to a musical note from the selected scale
5. When motion in a cell exceeds the threshold, the note plays with velocity proportional to motion intensity

### Control Strip

The left portion of the webcam view is a control strip with two lanes:

- **Sustain (SUS)**: Move your hand higher to engage sustain. Notes ring until you lower your hand below the release threshold.
- **Swell (SWL)**: Move your hand higher to increase reverb and open the filter cutoff. Creates an expressive crescendo effect.

### Webcam Settings

- **Rows / Cols**: Grid dimensions (1-4 each, default 2x2)
- **Threshold**: Motion amount needed to trigger a note (lower = more sensitive)
- **Sensitivity**: Motion amplification before thresholding
- **Strip Width**: Control strip proportion (20-50% of view)

### Tips

- Use good lighting for reliable motion detection
- Position yourself so your hands are clearly visible against a contrasting background
- Start with the default 2x2 grid, then experiment with larger grids
- Try combining sustain control with slow swell movements for ambient textures
- The existing Scale, Wave, and Effects controls all apply to webcam-triggered notes

## Files

```
KEYWAVE/
├── server.py          # Keyboard listener + servers
├── web_server.py      # Static file server for deployment
├── static/
│   ├── index.html     # UI structure
│   ├── style.css      # Dark theme styling
│   └── app.js         # Audio engine + webcam motion + visuals
├── docs/
│   └── PLANNING.md    # Agent planning protocol
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
