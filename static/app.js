/**
 * KEYWAVE - Keyboard to Music App v2.2
 * =====================================
 * 
 * Features:
 * 1. Two keyboard layout modes: Spatial (rows=octaves) and Frequency (letter frequency mapping)
 * 2. 20+ scales (modes, world, jazz, experimental)
 * 3. Full effects chain (reverb, delay, chorus, distortion, filter)
 * 4. Polyphony (6 voices)
 * 5. Modifier key controls (shift=octave up, ctrl=staccato, etc.)
 * 6. Number keys = chord triggers
 * 7. Dual quantize modes: Snap (grid timing) and Buffer (all notes played)
 * 8. Play/Stop playback for typing box
 * 9. Real piano keyboard display
 */

// =============================================================================
// CONFIGURATION & CONSTANTS
// =============================================================================

const WS_URL = 'ws://localhost:8765';
const C4_FREQ = 261.63;
const MAX_VOICES = 6;

// Note names for display
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// =============================================================================
// SCALES LIBRARY (20+ scales)
// =============================================================================

const SCALES = {
    // Basic
    major:              { name: 'Major',              intervals: [0, 2, 4, 5, 7, 9, 11] },
    minor:              { name: 'Natural Minor',      intervals: [0, 2, 3, 5, 7, 8, 10] },
    pentatonic_major:   { name: 'Pentatonic Major',   intervals: [0, 2, 4, 7, 9] },
    pentatonic_minor:   { name: 'Pentatonic Minor',   intervals: [0, 3, 5, 7, 10] },
    
    // Modes
    dorian:             { name: 'Dorian',             intervals: [0, 2, 3, 5, 7, 9, 10] },
    phrygian:           { name: 'Phrygian',           intervals: [0, 1, 3, 5, 7, 8, 10] },
    lydian:             { name: 'Lydian',             intervals: [0, 2, 4, 6, 7, 9, 11] },
    mixolydian:         { name: 'Mixolydian',         intervals: [0, 2, 4, 5, 7, 9, 10] },
    aeolian:            { name: 'Aeolian',            intervals: [0, 2, 3, 5, 7, 8, 10] },
    locrian:            { name: 'Locrian',            intervals: [0, 1, 3, 5, 6, 8, 10] },
    
    // Blues/Jazz
    blues:              { name: 'Blues',              intervals: [0, 3, 5, 6, 7, 10] },
    bebop_major:        { name: 'Bebop Major',        intervals: [0, 2, 4, 5, 7, 8, 9, 11] },
    bebop_dominant:     { name: 'Bebop Dominant',     intervals: [0, 2, 4, 5, 7, 9, 10, 11] },
    jazz_minor:         { name: 'Jazz Minor',         intervals: [0, 2, 3, 5, 7, 9, 11] },
    
    // World
    japanese:           { name: 'Japanese (In-Sen)',  intervals: [0, 1, 5, 7, 10] },
    arabic:             { name: 'Arabic (Hijaz)',     intervals: [0, 1, 4, 5, 7, 8, 11] },
    hungarian_minor:    { name: 'Hungarian Minor',    intervals: [0, 2, 3, 6, 7, 8, 11] },
    
    // Experimental
    whole_tone:         { name: 'Whole Tone',         intervals: [0, 2, 4, 6, 8, 10] },
    chromatic:          { name: 'Chromatic',          intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
    diminished:         { name: 'Diminished (W-H)',   intervals: [0, 2, 3, 5, 6, 8, 9, 11] },
    augmented:          { name: 'Augmented',          intervals: [0, 3, 4, 7, 8, 11] }
};

// =============================================================================
// SPATIAL KEY MAPPING (QWERTY rows = octaves)
// =============================================================================

const KEYBOARD_ROWS = {
    top: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'],
    middle: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"],
    bottom: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/']
};

function buildSpatialMap() {
    const map = {};
    KEYBOARD_ROWS.top.forEach((key, index) => {
        map[key] = { row: 'top', position: index, octaveOffset: 1 };
    });
    KEYBOARD_ROWS.middle.forEach((key, index) => {
        map[key] = { row: 'middle', position: index, octaveOffset: 0 };
    });
    KEYBOARD_ROWS.bottom.forEach((key, index) => {
        map[key] = { row: 'bottom', position: index, octaveOffset: -1 };
    });
    return map;
}

const SPATIAL_MAP = buildSpatialMap();

// =============================================================================
// FREQUENCY-BASED KEY MAPPING (original mode - letter frequency)
// =============================================================================

// FREQUENCY MODE: Vowel-Anchored Musical Mapping
// Vowels = stable tones (root, 5th), Consonants = melodic movement, Rare = accents
const LETTER_TIERS = {
    // VOWELS → Root & 5th (always stable, anchor the melody)
    'a': { tier: 0, degree: 0 },  // Root
    'e': { tier: 0, degree: 0 },  // Root (most common = most stable)
    'i': { tier: 0, degree: 4 },  // 5th
    'o': { tier: 0, degree: 4 },  // 5th
    'u': { tier: 0, degree: 2 },  // 3rd
    
    // COMMON CONSONANTS → Melodic body (2nd, 3rd, 4th)
    't': { tier: 1, degree: 1 },  // 2nd - stepwise up
    'n': { tier: 1, degree: 2 },  // 3rd - sweet
    's': { tier: 1, degree: 3 },  // 4th - tension
    'r': { tier: 1, degree: 2 },  // 3rd
    'h': { tier: 1, degree: 1 },  // 2nd
    'l': { tier: 1, degree: 3 },  // 4th
    'd': { tier: 1, degree: 4 },  // 5th
    'c': { tier: 1, degree: 3 },  // 4th
    'm': { tier: 1, degree: 1 },  // 2nd
    'y': { tier: 1, degree: 4 },  // 5th (semi-vowel)
    
    // MEDIUM CONSONANTS → Higher octave movement
    'w': { tier: 2, degree: 0 },  // Root up octave
    'f': { tier: 2, degree: 2 },  // 3rd up octave
    'g': { tier: 2, degree: 4 },  // 5th up octave
    'p': { tier: 2, degree: 1 },  // 2nd up octave
    'b': { tier: 2, degree: 3 },  // 4th up octave
    'v': { tier: 2, degree: 0 },  // Root up octave
    'k': { tier: 2, degree: 4 },  // 5th up octave (hard = strong)
    
    // RARE → Bass drops and drama
    'j': { tier: 3, degree: 0 },  // Root down octave (jump!)
    'x': { tier: 3, degree: 2 },  // 3rd down octave
    'q': { tier: 3, degree: 4 },  // 5th down octave
    'z': { tier: 3, degree: 0 }   // Root down octave (buzz = bass)
};

// =============================================================================
// CHORD DEFINITIONS (for number keys)
// =============================================================================

const CHORDS = {
    '1': { name: 'I (Major)',      semitones: [0, 4, 7] },
    '2': { name: 'ii (Minor)',     semitones: [2, 5, 9] },
    '3': { name: 'iii (Minor)',    semitones: [4, 7, 11] },
    '4': { name: 'IV (Major)',     semitones: [5, 9, 12] },
    '5': { name: 'V (Major)',      semitones: [7, 11, 14] },
    '6': { name: 'vi (Minor)',     semitones: [9, 12, 16] },
    '7': { name: 'vii° (Dim)',     semitones: [11, 14, 17] },
    '8': { name: 'I (High)',       semitones: [12, 16, 19] },
    '9': { name: 'Sus4',           semitones: [0, 5, 7] },
    '0': { name: 'Power',          semitones: [0, 7, 12] }
};

// =============================================================================
// EFFECTS PRESETS
// =============================================================================

const EFFECT_PRESETS = {
    clean:      { name: 'Clean',      reverb: 0,    delay: 0,    chorus: 0,   distortion: 0, filter: 20000 },
    ambient:    { name: 'Ambient',    reverb: 0.7,  delay: 0.4,  chorus: 0,   distortion: 0, filter: 20000 },
    lofi:       { name: 'Lo-Fi',      reverb: 0.3,  delay: 0.2,  chorus: 0,   distortion: 0.2, filter: 3000 },
    synth_lead: { name: 'Synth Lead', reverb: 0.4,  delay: 0.1,  chorus: 0.5, distortion: 0, filter: 8000 },
    dark:       { name: 'Dark',       reverb: 0.6,  delay: 0.3,  chorus: 0,   distortion: 0, filter: 1500 },
    aggressive: { name: 'Aggressive', reverb: 0.2,  delay: 0.15, chorus: 0,   distortion: 0.6, filter: 6000 },
    dreamy:     { name: 'Dreamy',     reverb: 0.8,  delay: 0.5,  chorus: 0.6, distortion: 0, filter: 12000 },
    eight_bit:  { name: '8-Bit',      reverb: 0,    delay: 0,    chorus: 0,   distortion: 0.4, filter: 4000 }
};

// =============================================================================
// GLOBAL STATE
// =============================================================================

let audioContext = null;
let masterGain = null;
let analyserNode = null;

// Effects nodes
let reverbNode = null;
let delayNode = null;
let delayFeedback = null;
let distortionNode = null;
let filterNode = null;
let dryGain = null;
let limiterNode = null;

// Voice pool for polyphony
let voicePool = [];

// State
let settings = {
    layoutMode: 'frequency',
    scale: 'pentatonic_major',
    waveType: 'sine',
    baseOctave: 4,
    transpose: 0,
    volume: 0.35,  // Reduced to prevent clipping
    decayTime: 0.6,
    reverb: 0.3,
    delay: 0.2,
    delayTime: 0.25,
    chorus: 0,
    distortion: 0,
    filterCutoff: 20000,
    effectPreset: 'ambient',
    // Quantize
    quantize: false,
    quantizeMode: 'snap',  // 'snap' or 'buffer'
    tempo: 120,
    quantizeGrid: '1/8',
    // Playback
    playbackSpeed: 1
};

let modifiers = { shift: false, ctrl: false, alt: false, cmd: false, caps_lock: false };

let sustainPedal = false;
let recentKeys = [];
const MAX_RECENT_KEYS = 20;
let heldKeys = new Set();  // Track currently pressed keys to filter repeats
let typingBoxFocused = false;  // Track if typing box has focus to avoid duplicate events

// Quantize timing
let quantizeStartTime = null;
let quantizeBuffer = [];  // For buffer mode - queue of notes to play
let quantizeIntervalId = null;
let lastBufferGridIndex = -1;  // Track which grid we last played on
let lastSnapGridIndex = -1;    // Track last grid we played on in snap mode
const MAX_BUFFER_SIZE = 24;    // Maximum notes in buffer

// Playback state
let isPlaying = false;
let playbackTimeoutId = null;
let playbackIndex = 0;
let loopMode = false;

// Buffer playback cursor
let bufferPlaybackIndex = 0;  // Tracks which character in the buffer we're playing

// Arp state
let arpEnabled = false;
let arpPattern = 'up';  // 'up', 'down', 'updown', 'random'
let arpOctaves = 1;
let arpIndex = 0;
let arpDirection = 1;  // 1 = up, -1 = down
let lastArpNote = null;

// Double-tap state
let doubleTapEnabled = false;

// Power state
let isPoweredOn = true;

// Keyboard range (1-3 octaves visible)
let keyboardRange = 2;

// =============================================================================
// AUDIO ENGINE
// =============================================================================

async function initAudio() {
    if (audioContext) return;
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    masterGain = audioContext.createGain();
    masterGain.gain.value = settings.volume;
    
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    
    await createEffectsChain();
    
    voicePool = [];
    quantizeStartTime = audioContext.currentTime;
    lastBufferGridIndex = -1;
    lastSnapGridIndex = -1;
    
    // Start quantize buffer flush interval
    startQuantizeInterval();
    
    console.log('Audio engine initialized');
    startVisualization();
}

async function createEffectsChain() {
    filterNode = audioContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = settings.filterCutoff;
    filterNode.Q.value = 0.7; // Gentler resonance
    
    distortionNode = audioContext.createWaveShaper();
    distortionNode.curve = makeDistortionCurve(0);
    distortionNode.oversample = '4x';
    
    delayNode = audioContext.createDelay(1.0);
    delayNode.delayTime.value = settings.delayTime;
    delayFeedback = audioContext.createGain();
    delayFeedback.gain.value = settings.delay * 0.4; // Reduced feedback
    
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    
    reverbNode = await createReverbImpulse();
    
    dryGain = audioContext.createGain();
    dryGain.gain.value = 0.7;
    
    const delayWet = audioContext.createGain();
    delayWet.gain.value = settings.delay * 0.4;
    
    const reverbWet = audioContext.createGain();
    reverbWet.gain.value = settings.reverb * 0.5;
    
    delayNode._wetGain = delayWet;
    reverbNode._wetGain = reverbWet;
    
    // Create limiter (compressor with fast attack, high ratio)
    limiterNode = audioContext.createDynamicsCompressor();
    limiterNode.threshold.value = -6;  // Start limiting at -6dB
    limiterNode.knee.value = 3;
    limiterNode.ratio.value = 12;
    limiterNode.attack.value = 0.003;
    limiterNode.release.value = 0.1;
    
    analyserNode.connect(filterNode);
    filterNode.connect(distortionNode);
    
    distortionNode.connect(dryGain);
    dryGain.connect(masterGain);
    
    distortionNode.connect(delayNode);
    delayNode.connect(delayWet);
    delayWet.connect(masterGain);
    
    distortionNode.connect(reverbNode);
    reverbNode.connect(reverbWet);
    reverbWet.connect(masterGain);
    
    // Route through limiter before output
    masterGain.connect(limiterNode);
    limiterNode.connect(audioContext.destination);
    
    updateEffects();
}

async function createReverbImpulse() {
    const convolver = audioContext.createConvolver();
    const sampleRate = audioContext.sampleRate;
    const length = sampleRate * 2.5;
    const impulse = audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            const t = i / sampleRate;
            const earlyReflections = Math.exp(-t * 3) * 0.5;
            const lateTail = Math.exp(-t * 1.5);
            channelData[i] = (Math.random() * 2 - 1) * (earlyReflections + lateTail) * 0.5;
        }
    }
    
    convolver.buffer = impulse;
    return convolver;
}

function makeDistortionCurve(amount) {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        if (amount === 0) {
            curve[i] = x;
        } else {
            curve[i] = ((3 + amount * 50) * x * 20 * deg) / (Math.PI + amount * 50 * Math.abs(x));
        }
    }
    return curve;
}

function updateEffects() {
    if (!audioContext) return;
    
    if (filterNode) {
        filterNode.frequency.setTargetAtTime(settings.filterCutoff, audioContext.currentTime, 0.1);
    }
    
    if (distortionNode) {
        distortionNode.curve = makeDistortionCurve(settings.distortion * 0.5); // Reduced distortion
    }
    
    if (delayNode && delayNode._wetGain) {
        delayNode._wetGain.gain.setTargetAtTime(settings.delay * 0.3, audioContext.currentTime, 0.1);
        delayFeedback.gain.setTargetAtTime(settings.delay * 0.35, audioContext.currentTime, 0.1);
    }
    
    if (reverbNode && reverbNode._wetGain) {
        reverbNode._wetGain.gain.setTargetAtTime(settings.reverb * 0.45, audioContext.currentTime, 0.1);
    }
    
    if (dryGain) {
        const wetTotal = settings.reverb + settings.delay;
        dryGain.gain.setTargetAtTime(Math.max(0.4, 0.8 - wetTotal * 0.2), audioContext.currentTime, 0.1);
    }
}

function applyEffectPreset(presetName) {
    const preset = EFFECT_PRESETS[presetName];
    if (!preset) return;
    
    settings.reverb = preset.reverb;
    settings.delay = preset.delay;
    settings.chorus = preset.chorus;
    settings.distortion = preset.distortion;
    settings.filterCutoff = preset.filter;
    settings.effectPreset = presetName;
    
    updateEffects();
    updateEffectSliders();
}

// =============================================================================
// QUANTIZE LOGIC (Dual Modes: Snap & Buffer)
// =============================================================================

function getGridDurationSeconds() {
    const beatDuration = 60 / settings.tempo;
    switch (settings.quantizeGrid) {
        case '1/4': return beatDuration;
        case '1/8': return beatDuration / 2;
        case '1/16': return beatDuration / 4;
        default: return beatDuration / 2;
    }
}

function getNextGridTime() {
    if (!audioContext || !quantizeStartTime) return 0;
    
    const now = audioContext.currentTime;
    const gridDuration = getGridDurationSeconds();
    const elapsed = now - quantizeStartTime;
    const gridsPassed = Math.floor(elapsed / gridDuration);
    const nextGridTime = quantizeStartTime + (gridsPassed + 1) * gridDuration;
    
    return nextGridTime;
}

function getQuantizeDelay() {
    if (!settings.quantize || !audioContext) return 0;
    
    const nextGrid = getNextGridTime();
    const now = audioContext.currentTime;
    return Math.max(0, nextGrid - now);
}

function startQuantizeInterval() {
    if (quantizeIntervalId) clearInterval(quantizeIntervalId);
    
    // Check buffer every 10ms - play ONE note per grid tick
    quantizeIntervalId = setInterval(() => {
        if (!settings.quantize || settings.quantizeMode !== 'buffer' || quantizeBuffer.length === 0) return;
        if (!audioContext) return;
        
        const now = audioContext.currentTime;
        const gridDuration = getGridDurationSeconds();
        const elapsed = now - quantizeStartTime;
        const currentGrid = Math.floor(elapsed / gridDuration);
        
        // Only play if we're on a new grid tick
        if (currentGrid > lastBufferGridIndex) {
            lastBufferGridIndex = currentGrid;
            
            // Play ONE note from the buffer
            if (quantizeBuffer.length > 0) {
                const item = quantizeBuffer.shift();
                playNoteImmediate(item.noteData, item.options);
                
                // Update cursor position if we have textIndex
                if (item.textIndex !== undefined) {
                    updatePlaybackCursor(item.textIndex);
                }
            }
        }
    }, 5);
}

// =============================================================================
// NOTE PLAYING (with polyphony and quantize)
// =============================================================================

function keyToNote(key, mods = modifiers) {
    const keyLower = key.toLowerCase();
    const scale = SCALES[settings.scale].intervals;
    
    if (settings.layoutMode === 'spatial') {
        return keyToNoteSpatial(keyLower, scale, mods);
    } else {
        return keyToNoteFrequency(keyLower, scale, mods);
    }
}

function keyToNoteSpatial(keyLower, scale, mods) {
    if (!SPATIAL_MAP[keyLower]) return null;
    
    const mapping = SPATIAL_MAP[keyLower];
    const degree = mapping.position % scale.length;
    const degreeOctave = Math.floor(mapping.position / scale.length);
    
    let octave = settings.baseOctave + mapping.octaveOffset + degreeOctave + settings.transpose;
    if (mods.shift) octave += 1;
    
    const semitone = scale[degree];
    const totalSemitones = semitone + (octave - 4) * 12;
    const frequency = C4_FREQ * Math.pow(2, totalSemitones / 12);
    
    return {
        frequency,
        noteName: NOTE_NAMES[semitone % 12],
        octave,
        semitone,
        isHarmony: mods.alt
    };
}

function keyToNoteFrequency(keyLower, scale, mods) {
    const letterData = LETTER_TIERS[keyLower];
    if (!letterData) {
        const hash = keyLower.charCodeAt(0) % scale.length;
        const semitone = scale[hash];
        const octave = settings.baseOctave + settings.transpose + (mods.shift ? 1 : 0);
        const frequency = C4_FREQ * Math.pow(2, (semitone + (octave - 4) * 12) / 12);
        return { frequency, noteName: NOTE_NAMES[semitone % 12], octave, semitone, isHarmony: mods.alt };
    }
    
    const degree = letterData.degree % scale.length;
    const tier = letterData.tier;
    
    let octave;
    if (tier <= 1) octave = settings.baseOctave;
    else if (tier === 2) octave = settings.baseOctave + 1;
    else octave = letterData.degree === 0 ? settings.baseOctave - 1 : settings.baseOctave + 1;
    
    octave += settings.transpose;
    if (mods.shift) octave += 1;
    
    const semitone = scale[degree];
    const totalSemitones = semitone + (octave - 4) * 12;
    const frequency = C4_FREQ * Math.pow(2, totalSemitones / 12);
    
    return { frequency, noteName: NOTE_NAMES[semitone % 12], octave, semitone, isHarmony: mods.alt };
}

function chordToNotes(chordKey) {
    const chord = CHORDS[chordKey];
    if (!chord) return null;
    
    const baseOctave = settings.baseOctave + settings.transpose;
    
    return chord.semitones.map(semitone => {
        const octaveOffset = Math.floor(semitone / 12);
        const noteSemitone = semitone % 12;
        const octave = baseOctave + octaveOffset;
        const totalSemitones = semitone + (baseOctave - 4) * 12;
        const frequency = C4_FREQ * Math.pow(2, totalSemitones / 12);
        
        return { frequency, noteName: NOTE_NAMES[noteSemitone], octave, semitone: noteSemitone };
    });
}

// =============================================================================
// ARPEGGIATOR
// =============================================================================

// Arp plays chord tones starting from the pressed note
// Common intervals: root (0), third (3 or 4), fifth (7), octave (12)
const ARP_INTERVALS = {
    triad: [0, 4, 7],           // Major triad
    triad_oct: [0, 4, 7, 12],   // Major triad + octave
    seventh: [0, 4, 7, 11],     // Major 7th
    power: [0, 7, 12],          // Power chord + octave
};

function getArpNotesForKey(baseNote) {
    if (!arpEnabled || !baseNote) return [baseNote];
    
    const notes = [];
    const intervals = ARP_INTERVALS.triad_oct;  // Use triad + octave
    
    // Build arp notes based on intervals from the base note across octaves
    for (let oct = 0; oct < arpOctaves; oct++) {
        intervals.forEach(interval => {
            const totalSemitones = baseNote.semitone + interval + (oct * 12);
            const semitone = totalSemitones % 12;
            const octaveOffset = Math.floor(totalSemitones / 12);
            const octave = baseNote.octave + octaveOffset;
            const frequency = C4_FREQ * Math.pow(2, (semitone + (octave - 4) * 12) / 12);
            
            notes.push({
                frequency,
                noteName: NOTE_NAMES[semitone],
                octave,
                semitone
            });
        });
    }
    
    return notes;
}

function playArpeggio(baseNote, options = {}) {
    if (!arpEnabled || !baseNote) {
        return playNote(baseNote, options);
    }
    
    const arpNotes = getArpNotesForKey(baseNote);
    if (arpNotes.length === 0) return;
    
    let noteSequence = [];
    
    switch (arpPattern) {
        case 'up':
            noteSequence = arpNotes;
            break;
        case 'down':
            noteSequence = [...arpNotes].reverse();
            break;
        case 'updown':
            noteSequence = [...arpNotes, ...arpNotes.slice(1, -1).reverse()];
            break;
        case 'random':
            noteSequence = arpNotes.sort(() => Math.random() - 0.5);
            break;
        default:
            noteSequence = arpNotes;
    }
    
    // Calculate delay between arp notes based on tempo
    const beatDuration = 60 / settings.tempo;
    const arpDelay = (beatDuration / 4) * 1000;  // 16th notes
    
    // Play each note in sequence
    noteSequence.forEach((note, i) => {
        setTimeout(() => {
            // Don't use the arp path again, play directly
            const voice = playNoteImmediate(note, { 
                ...options, 
                velocity: 0.25 - (i * 0.02),  // Slight velocity decrease
                decay: settings.decayTime * 0.6
            });
            updateNoteDisplay(note.noteName.toLowerCase(), note);
            highlightPianoKey(note);
        }, i * arpDelay);
    });
}

function resetArp() {
    arpIndex = 0;
    arpDirection = 1;
    lastArpNote = null;
}

function playNote(noteData, options = {}) {
    if (!audioContext || !noteData) return null;
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Apply double-tap if enabled
    const shouldDoubleTap = doubleTapEnabled && !options.isDoubleTap;
    
    if (!settings.quantize) {
        const voice = playNoteImmediate(noteData, options);
        if (shouldDoubleTap) {
            setTimeout(() => {
                playNoteImmediate(noteData, { ...options, isDoubleTap: true });
            }, 80);
        }
        return voice;
    }
    
    // Get current grid position
    const now = audioContext.currentTime;
    const gridDuration = getGridDurationSeconds();
    const elapsed = now - quantizeStartTime;
    const currentGrid = Math.floor(elapsed / gridDuration);
    
    if (settings.quantizeMode === 'snap') {
        // Snap mode: only play on grid boundaries, skip if we already played this grid
        if (currentGrid <= lastSnapGridIndex) {
            // Already played a note this grid, wait for next
            return null;
        }
        
        // Calculate delay to next grid
        const nextGridTime = quantizeStartTime + (currentGrid + 1) * gridDuration;
        const delay = Math.max(0, nextGridTime - now);
        
        // Mark this grid as used (use next grid since we're scheduling for it)
        lastSnapGridIndex = currentGrid;
        
        if (delay > 0.01) {
            // Schedule for next grid
            setTimeout(() => {
                playNoteImmediate(noteData, options);
                if (shouldDoubleTap) {
                    setTimeout(() => playNoteImmediate(noteData, { ...options, isDoubleTap: true }), 80);
                }
            }, delay * 1000);
        } else {
            // We're right on the grid, play now
            const voice = playNoteImmediate(noteData, options);
            if (shouldDoubleTap) {
                setTimeout(() => playNoteImmediate(noteData, { ...options, isDoubleTap: true }), 80);
            }
            return voice;
        }
        return null;
    } else {
        // Buffer mode: add to buffer if not full
        if (quantizeBuffer.length >= MAX_BUFFER_SIZE) {
            // Buffer full, drop oldest notes to make room
            quantizeBuffer.shift();
        }
        quantizeBuffer.push({ noteData, options, textIndex: options.textIndex });
        if (shouldDoubleTap && quantizeBuffer.length < MAX_BUFFER_SIZE) {
            quantizeBuffer.push({ noteData, options: { ...options, isDoubleTap: true }, textIndex: options.textIndex });
        }
        return null;
    }
}

function playNoteImmediate(noteData, options = {}) {
    const now = audioContext.currentTime;
    const { velocity = 0.3, decay = settings.decayTime, sustained = false } = options;
    
    const actualDecay = modifiers.ctrl ? 0.08 : decay;
    const actualVelocity = Math.min(0.4, modifiers.cmd ? velocity * 0.15 : velocity * 0.6); // Soft limit
    
    // Create a voice group for layered sound
    const voiceGain = audioContext.createGain();
    const attackTime = 0.02; // Softer attack
    const oscillators = [];
    
    // Main oscillator
    const osc1 = audioContext.createOscillator();
    osc1.type = settings.waveType;
    osc1.frequency.value = noteData.frequency;
    
    const osc1Gain = audioContext.createGain();
    osc1Gain.gain.value = 0.5;
    osc1.connect(osc1Gain);
    osc1Gain.connect(voiceGain);
    oscillators.push(osc1);
    
    // Sub oscillator (one octave down, softer) - adds warmth
    const oscSub = audioContext.createOscillator();
    oscSub.type = 'sine';
    oscSub.frequency.value = noteData.frequency / 2;
    
    const oscSubGain = audioContext.createGain();
    oscSubGain.gain.value = 0.2;
    oscSub.connect(oscSubGain);
    oscSubGain.connect(voiceGain);
    oscillators.push(oscSub);
    
    // Detuned oscillator (slightly sharp) - adds shimmer
    const osc2 = audioContext.createOscillator();
    osc2.type = settings.waveType === 'sine' ? 'triangle' : settings.waveType;
    osc2.frequency.value = noteData.frequency * 1.003; // Slight detune
    
    const osc2Gain = audioContext.createGain();
    osc2Gain.gain.value = 0.15;
    osc2.connect(osc2Gain);
    osc2Gain.connect(voiceGain);
    oscillators.push(osc2);
    
    // Envelope
    voiceGain.gain.setValueAtTime(0, now);
    voiceGain.gain.linearRampToValueAtTime(actualVelocity, now + attackTime);
    
    if (!sustained && !sustainPedal) {
        // Smooth exponential decay
        voiceGain.gain.setTargetAtTime(actualVelocity * 0.3, now + attackTime, actualDecay * 0.3);
        voiceGain.gain.setTargetAtTime(0.001, now + attackTime + actualDecay * 0.5, actualDecay * 0.5);
    }
    
    voiceGain.connect(analyserNode);
    
    // Start all oscillators
    oscillators.forEach(osc => osc.start(now));
    
    if (!sustained && !sustainPedal) {
        oscillators.forEach(osc => osc.stop(now + attackTime + actualDecay + 0.2));
    }
    
    const voice = { 
        oscillators, 
        gainNode: voiceGain, 
        noteData, 
        startTime: now, 
        sustained: sustained || sustainPedal 
    };
    
    voicePool.push(voice);
    if (voicePool.length > MAX_VOICES) {
        const oldVoice = voicePool.shift();
        stopVoice(oldVoice);
    }
    
    if (noteData.isHarmony && !options.isHarmony) {
        const harmonyFreq = noteData.frequency * Math.pow(2, 7/12);
        playNoteImmediate({
            frequency: harmonyFreq,
            noteName: NOTE_NAMES[(noteData.semitone + 7) % 12],
            octave: noteData.octave,
            semitone: (noteData.semitone + 7) % 12
        }, { ...options, isHarmony: true, velocity: actualVelocity * 0.4 });
    }
    
    return voice;
}

function playSpacebarSound() {
    // Play a low soft tone (G3) - warm like a bass pad
    if (!audioContext) return;
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const spaceNote = {
        frequency: C4_FREQ * Math.pow(2, 7/12) / 2, // G3
        noteName: 'G',
        octave: 3,
        semitone: 7
    };
    
    playNote(spaceNote, { velocity: 0.25, decay: 0.4 });
    updateNoteDisplay('space', spaceNote);
}

function playChord(chordKey) {
    const notes = chordToNotes(chordKey);
    if (!notes) return;
    
    // Stagger chord notes slightly and reduce velocity for clean sound
    notes.forEach((note, i) => {
        setTimeout(() => {
            playNote(note, { velocity: 0.2 });
        }, i * 15);
    });
    
    updateChordDisplay(CHORDS[chordKey].name);
}

function stopVoice(voice) {
    if (!voice) return;
    
    const now = audioContext.currentTime;
    try {
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
        voice.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        
        // Stop all oscillators in the voice
        if (voice.oscillators) {
            voice.oscillators.forEach(osc => {
                try { osc.stop(now + 0.1); } catch (e) {}
            });
        } else if (voice.oscillator) {
            voice.oscillator.stop(now + 0.1);
        }
    } catch (e) {}
}

function stopAllVoices() {
    voicePool.forEach(stopVoice);
    voicePool = [];
    quantizeBuffer = [];
}

// =============================================================================
// PLAYBACK FEATURE
// =============================================================================

function startPlayback() {
    const typingBox = document.getElementById('typingBox');
    if (!typingBox || isPlaying) return;
    
    const text = typingBox.value;
    if (!text.length) return;
    
    isPlaying = true;
    playbackIndex = 0;
    updatePlaybackUI();
    updatePlaybackCursor(0);
    
    playNextCharacter(text);
}

function stopPlayback() {
    isPlaying = false;
    if (playbackTimeoutId) {
        clearTimeout(playbackTimeoutId);
        playbackTimeoutId = null;
    }
    playbackIndex = 0;
    updatePlaybackUI();
    clearPlaybackCursor();
}

function playNextCharacter(text) {
    if (!isPlaying) {
        stopPlayback();
        return;
    }
    
    if (playbackIndex >= text.length) {
        if (loopMode) {
            // Loop back to start
            playbackIndex = 0;
            updatePlaybackCursor(0);
        } else {
            stopPlayback();
            return;
        }
    }
    
    const char = text[playbackIndex];
    const currentIndex = playbackIndex;
    playbackIndex++;
    
    // Play the character's sound
    let key = char.toLowerCase();
    if (char === ' ') key = 'space';
    else if (char === '\n') key = 'enter';
    
    handleKeyDown(key, modifiers, true, currentIndex);
    
    // Update cursor position
    updatePlaybackCursor(playbackIndex);
    
    // Schedule next character
    const baseDelay = 150; // ms per character at 1x
    const delay = baseDelay / settings.playbackSpeed;
    
    playbackTimeoutId = setTimeout(() => playNextCharacter(text), delay);
}

function updatePlaybackCursor(index) {
    const typingBox = document.getElementById('typingBox');
    if (!typingBox) return;
    
    // Set selection to show cursor position
    typingBox.focus();
    typingBox.setSelectionRange(index, index + 1);
    
    // Update cursor indicator
    const indicator = document.getElementById('cursorPosition');
    if (indicator) {
        indicator.textContent = `${index + 1}/${typingBox.value.length}`;
        indicator.classList.add('active');
    }
}

function clearPlaybackCursor() {
    const indicator = document.getElementById('cursorPosition');
    if (indicator) {
        indicator.textContent = '';
        indicator.classList.remove('active');
    }
}

function updatePlaybackUI() {
    const playBtn = document.getElementById('playBtn');
    const stopBtn = document.getElementById('stopBtn');
    const loopBtn = document.getElementById('loopBtn');
    
    if (playBtn) {
        playBtn.classList.toggle('active', isPlaying);
    }
    if (stopBtn) {
        stopBtn.classList.toggle('active', isPlaying);
    }
    if (loopBtn) {
        loopBtn.classList.toggle('active', loopMode);
    }
}

// =============================================================================
// KEY HANDLING
// =============================================================================

function handleKeyDown(key, mods = modifiers, fromTypingBox = false, textIndex = undefined) {
    // Don't play sounds when powered off
    if (!isPoweredOn) return;
    
    if (!audioContext) {
        initAudio();
        return;
    }
    
    const keyLower = key.toLowerCase();
    
    switch (keyLower) {
        case 'space':
            playSpacebarSound();
            addRecentKey('␣');
            return;
            
        case 'backspace':
            if (!fromTypingBox && voicePool.length > 0) {
                const voice = voicePool.pop();
                stopVoice(voice);
            }
            return;
            
        case 'delete':
        case 'escape':
            stopAllVoices();
            settings.transpose = 0;
            updateTransposeDisplay();
            return;
            
        case 'enter':
            const bassNote = { frequency: C4_FREQ / 4, noteName: 'C', octave: 2, semitone: 0 };
            playNote(bassNote, { velocity: 0.7, decay: 1.0 });
            updateNoteDisplay('enter', bassNote);
            addRecentKey('⏎');
            return;
            
        case 'tab':
            return;
            
        case '`':
            const scale = SCALES[settings.scale].intervals;
            const randomDegree = Math.floor(Math.random() * scale.length);
            const randomSemitone = scale[randomDegree];
            const randomOctave = settings.baseOctave + Math.floor(Math.random() * 2);
            const randomFreq = C4_FREQ * Math.pow(2, (randomSemitone + (randomOctave - 4) * 12) / 12);
            const randomNote = { frequency: randomFreq, noteName: NOTE_NAMES[randomSemitone], octave: randomOctave, semitone: randomSemitone };
            playNote(randomNote);
            updateNoteDisplay('~', randomNote);
            addRecentKey('~');
            return;
            
        case 'plus':
            settings.baseOctave = Math.min(settings.baseOctave + 1, 7);
            updateOctaveDisplay();
            buildPiano();
            return;
        case 'minus':
            settings.baseOctave = Math.max(settings.baseOctave - 1, 1);
            updateOctaveDisplay();
            buildPiano();
            return;
        case 'up':
        case 'down':
        case 'left':
        case 'right':
            return;
            
        case 'f1': applyScalePreset('pentatonic_major'); return;
        case 'f2': applyScalePreset('major'); return;
        case 'f3': applyScalePreset('minor'); return;
        case 'f4': applyScalePreset('blues'); return;
        case 'f5': applyScalePreset('dorian'); return;
        case 'f6': settings.waveType = 'sine'; return;
        case 'f7': settings.waveType = 'triangle'; return;
        case 'f8': settings.waveType = 'sawtooth'; return;
        case 'f9': settings.waveType = 'square'; return;
    }
    
    if (keyLower >= '0' && keyLower <= '9') {
        playChord(keyLower);
        addRecentKey(keyLower);
        return;
    }
    
    const noteData = keyToNote(keyLower, mods);
    if (noteData) {
        // Apply arpeggiator if enabled - plays a sequence for this key
        if (arpEnabled) {
            playArpeggio(noteData, { sustained: sustainPedal, textIndex });
            addRecentKey(keyLower);
        } else {
            playNote(noteData, { sustained: sustainPedal, textIndex });
            updateNoteDisplay(keyLower, noteData);
            addRecentKey(keyLower);
            highlightPianoKey(noteData);
        }
    }
}

function handleKeyUp(key) {}

function handleModifierChange(modifier, isPressed) {
    modifiers[modifier] = isPressed;
    updateModifierDisplay();
}

function applyScalePreset(scaleName) {
    if (SCALES[scaleName]) {
        settings.scale = scaleName;
        const select = document.getElementById('scaleSelect');
        if (select) select.value = scaleName;
        buildPiano();
    }
}

// =============================================================================
// VISUALIZATION
// =============================================================================

function startVisualization() {
    const canvas = document.getElementById('waveform');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        requestAnimationFrame(draw);
        
        analyserNode.getByteTimeDomainData(dataArray);
        
        ctx.fillStyle = 'rgba(10, 10, 15, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00f5d4';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f5d4';
        
        ctx.beginPath();
        const sliceWidth = canvas.width / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            
            x += sliceWidth;
        }
        
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    draw();
}

// =============================================================================
// REAL PIANO KEYBOARD
// =============================================================================

function buildPiano() {
    const piano = document.getElementById('piano');
    if (!piano) return;
    
    piano.innerHTML = '';
    
    const scale = SCALES[settings.scale].intervals;
    
    // Always build 3 octaves, dim unused ones based on keyboardRange
    // keyboardRange: 1 = middle octave only, 2 = middle 2 octaves, 3 = all 3
    const totalOctaves = 3;
    
    for (let octOffset = 0; octOffset < totalOctaves; octOffset++) {
        const octave = settings.baseOctave + octOffset;
        
        // Determine if this octave should be dimmed based on range
        let isDimmed = false;
        if (keyboardRange === 1) {
            // Only middle octave (index 1) is active
            isDimmed = octOffset !== 1;
        } else if (keyboardRange === 2) {
            // Middle two octaves (index 0 and 1) are active
            isDimmed = octOffset === 2;
        }
        // keyboardRange === 3: nothing dimmed
        
        const octaveDiv = document.createElement('div');
        octaveDiv.className = 'piano-octave-real';
        if (isDimmed) octaveDiv.classList.add('dimmed');
        octaveDiv.dataset.octave = octave;
        
        // White keys container
        const whiteKeysDiv = document.createElement('div');
        whiteKeysDiv.className = 'white-keys';
        
        // Black keys container
        const blackKeysDiv = document.createElement('div');
        blackKeysDiv.className = 'black-keys';
        
        // White key semitones: C=0, D=2, E=4, F=5, G=7, A=9, B=11
        const whiteNotes = [0, 2, 4, 5, 7, 9, 11];
        // Black key semitones: C#=1, D#=3, F#=6, G#=8, A#=10
        const blackNotes = [1, 3, 6, 8, 10];
        // Black key positions (which white key they're after): 0, 1, 3, 4, 5
        const blackPositions = [0, 1, 3, 4, 5];
        
        // Create white keys
        whiteNotes.forEach((semitone, i) => {
            const isInScale = scale.includes(semitone);
            const key = document.createElement('div');
            key.className = 'piano-key-real white';
            key.dataset.semitone = semitone;
            key.dataset.octave = octave;
            
            if (!isInScale) key.classList.add('out-of-scale');
            
            const label = document.createElement('span');
            label.className = 'key-label';
            label.textContent = NOTE_NAMES[semitone];
            key.appendChild(label);
            
            whiteKeysDiv.appendChild(key);
        });
        
        // Create black keys
        blackNotes.forEach((semitone, i) => {
            const isInScale = scale.includes(semitone);
            const key = document.createElement('div');
            key.className = 'piano-key-real black';
            key.dataset.semitone = semitone;
            key.dataset.octave = octave;
            key.dataset.position = blackPositions[i];
            
            if (!isInScale) key.classList.add('out-of-scale');
            
            const label = document.createElement('span');
            label.className = 'key-label';
            label.textContent = NOTE_NAMES[semitone];
            key.appendChild(label);
            
            blackKeysDiv.appendChild(key);
        });
        
        octaveDiv.appendChild(whiteKeysDiv);
        octaveDiv.appendChild(blackKeysDiv);
        piano.appendChild(octaveDiv);
    }
}

function highlightPianoKey(noteData) {
    if (!noteData) return;
    
    const keys = document.querySelectorAll('.piano-key-real');
    keys.forEach(key => {
        if (parseInt(key.dataset.semitone) === noteData.semitone &&
            parseInt(key.dataset.octave) === noteData.octave) {
            key.classList.add('active');
            
            // Auto-release after decay time
            const releaseTime = (settings.decayTime + 0.1) * 1000;
            setTimeout(() => {
                key.classList.remove('active');
            }, releaseTime);
        }
    });
}

// =============================================================================
// UI UPDATES
// =============================================================================

function updateNoteDisplay(key, noteData) {
    const keyEl = document.getElementById('currentKey');
    const noteNameEl = document.querySelector('.note-name');
    const noteFreqEl = document.querySelector('.note-freq');
    
    if (keyEl) {
        const displayKey = key === 'space' ? '␣' : key === 'enter' ? '⏎' : key.toUpperCase();
        keyEl.textContent = displayKey;
        keyEl.classList.add('active');
        setTimeout(() => keyEl.classList.remove('active'), 100);
    }
    
    if (noteData) {
        if (noteNameEl) noteNameEl.textContent = noteData.noteName + (noteData.octave || '');
        if (noteFreqEl) noteFreqEl.textContent = noteData.frequency ? noteData.frequency.toFixed(0) + 'Hz' : '—';
    }
}

function updateChordDisplay(chordName) {
    const noteNameEl = document.querySelector('.note-name');
    if (noteNameEl) noteNameEl.textContent = chordName;
}

function addRecentKey(key) {
    recentKeys.unshift(key);
    if (recentKeys.length > MAX_RECENT_KEYS) recentKeys.pop();
    
    const container = document.getElementById('recentKeys');
    if (container) {
        container.innerHTML = recentKeys.map(k => `<span class="recent-key">${k}</span>`).join('');
    }
}

function updateModifierDisplay() {
    const indicators = document.querySelectorAll('.modifier-indicator');
    indicators.forEach(el => {
        const mod = el.dataset.modifier;
        if (mod && modifiers[mod]) el.classList.add('active');
        else el.classList.remove('active');
    });
}

function updateSustainIndicator() {
    const indicator = document.getElementById('sustainIndicator');
    if (indicator) indicator.classList.toggle('active', sustainPedal);
}

function updateTransposeDisplay() {
    const display = document.getElementById('transposeValue');
    if (display) {
        const sign = settings.transpose > 0 ? '+' : '';
        display.textContent = sign + settings.transpose;
    }
}

function updateOctaveDisplay() {
    const display = document.getElementById('octaveValue');
    if (display) {
        display.textContent = settings.baseOctave;
    }
}

function updateQuantizeIndicator() {
    const indicator = document.getElementById('quantizeIndicator');
    if (indicator) {
        indicator.classList.toggle('active', settings.quantize);
        indicator.textContent = settings.quantize ? 'On' : 'Off';
    }
}

function updateEffectSliders() {
    const reverbSlider = document.getElementById('reverbAmount');
    const delaySlider = document.getElementById('delayAmount');
    const distortionSlider = document.getElementById('distortionAmount');
    const filterSlider = document.getElementById('filterCutoff');
    
    if (reverbSlider) {
        reverbSlider.value = settings.reverb * 100;
        document.getElementById('reverbValue').textContent = Math.round(settings.reverb * 100) + '%';
    }
    if (delaySlider) {
        delaySlider.value = settings.delay * 100;
        document.getElementById('delayValue').textContent = Math.round(settings.delay * 100) + '%';
    }
    if (distortionSlider) {
        distortionSlider.value = settings.distortion * 100;
        document.getElementById('distortionValue').textContent = Math.round(settings.distortion * 100) + '%';
    }
    if (filterSlider) {
        filterSlider.value = settings.filterCutoff;
        document.getElementById('filterValue').textContent = settings.filterCutoff >= 10000 ? 
            (settings.filterCutoff / 1000).toFixed(0) + 'k' : settings.filterCutoff + '';
    }
}

// =============================================================================
// WEBSOCKET CONNECTION (optional - for local global keyboard capture)
// =============================================================================

let ws = null;
let wsConnected = false;

function connectWebSocket() {
    const statusEl = document.getElementById('status');
    const statusText = statusEl?.querySelector('.status-text');
    
    // Skip WebSocket in production (non-localhost)
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1';
    
    if (!isLocalhost) {
        // Running online - just show browser mode
        if (statusEl) statusEl.className = 'status browser';
        if (statusText) statusText.textContent = 'Browser';
        return;
    }
    
    try {
        ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
            wsConnected = true;
            if (statusEl) statusEl.className = 'status connected';
            if (statusText) statusText.textContent = 'Global';
            initAudio();
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Skip WebSocket events if typing box is focused (avoid duplicates)
                if (typingBoxFocused && (data.type === 'keydown' || data.type === 'keyup')) {
                    return;
                }
                
                if (data.type === 'keydown') {
                    // Ignore key repeats (key already held down)
                    if (heldKeys.has(data.key)) return;
                    heldKeys.add(data.key);
                    
                    if (data.modifiers) {
                        Object.assign(modifiers, data.modifiers);
                        updateModifierDisplay();
                    }
                    handleKeyDown(data.key, modifiers, false);
                } else if (data.type === 'keyup') {
                    heldKeys.delete(data.key);
                    handleKeyUp(data.key);
                } else if (data.type === 'modifier') {
                    handleModifierChange(data.key, data.value);
                }
            } catch (e) {
                // Silently ignore parse errors
            }
        };
        
        ws.onclose = () => {
            wsConnected = false;
            if (statusEl) statusEl.className = 'status browser';
            if (statusText) statusText.textContent = 'Browser';
            // Don't auto-reconnect - user can refresh if needed
        };
        
        ws.onerror = () => {
            // Silently fail - WebSocket is optional
            wsConnected = false;
            if (statusEl) statusEl.className = 'status browser';
            if (statusText) statusText.textContent = 'Browser';
        };
    } catch (e) {
        // WebSocket not available
        if (statusEl) statusEl.className = 'status browser';
        if (statusText) statusText.textContent = 'Browser';
    }
}

// =============================================================================
// CONTROLS SETUP
// =============================================================================

function setupControls() {
    // Layout mode
    const layoutSelect = document.getElementById('layoutMode');
    if (layoutSelect) {
        layoutSelect.value = settings.layoutMode;
        layoutSelect.addEventListener('change', (e) => {
            settings.layoutMode = e.target.value;
        });
    }
    
    // Keyboard range
    const keyboardRangeSelect = document.getElementById('keyboardRange');
    if (keyboardRangeSelect) {
        keyboardRangeSelect.value = keyboardRange;
        keyboardRangeSelect.addEventListener('change', (e) => {
            keyboardRange = parseInt(e.target.value);
            buildPiano();
        });
    }
    
    // Scale
    const scaleSelect = document.getElementById('scaleSelect');
    if (scaleSelect) {
        scaleSelect.innerHTML = '';
        Object.entries(SCALES).forEach(([key, scale]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = scale.name;
            scaleSelect.appendChild(option);
        });
        scaleSelect.value = settings.scale;
        scaleSelect.addEventListener('change', (e) => {
            settings.scale = e.target.value;
            buildPiano();
        });
    }
    
    // Wave type
    const waveSelect = document.getElementById('waveType');
    if (waveSelect) {
        waveSelect.addEventListener('change', (e) => {
            settings.waveType = e.target.value;
        });
    }
    
    // Effect preset
    const presetSelect = document.getElementById('effectPreset');
    if (presetSelect) {
        presetSelect.innerHTML = '';
        Object.entries(EFFECT_PRESETS).forEach(([key, preset]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.name;
            presetSelect.appendChild(option);
        });
        presetSelect.value = settings.effectPreset;
        presetSelect.addEventListener('change', (e) => {
            applyEffectPreset(e.target.value);
        });
    }
    
    // Decay
    const decaySlider = document.getElementById('decayTime');
    if (decaySlider) {
        decaySlider.addEventListener('input', (e) => {
            settings.decayTime = parseInt(e.target.value) / 1000;
            document.getElementById('decayValue').textContent = e.target.value + 'ms';
        });
    }
    
    // Volume
    const volumeSlider = document.getElementById('volume');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            settings.volume = parseInt(e.target.value) / 100;
            document.getElementById('volumeValue').textContent = e.target.value + '%';
            if (masterGain) {
                masterGain.gain.setTargetAtTime(settings.volume, audioContext.currentTime, 0.1);
            }
        });
    }
    
    // Effect sliders
    const reverbSlider = document.getElementById('reverbAmount');
    if (reverbSlider) {
        reverbSlider.addEventListener('input', (e) => {
            settings.reverb = parseInt(e.target.value) / 100;
            document.getElementById('reverbValue').textContent = e.target.value + '%';
            updateEffects();
        });
    }
    
    const delaySlider = document.getElementById('delayAmount');
    if (delaySlider) {
        delaySlider.addEventListener('input', (e) => {
            settings.delay = parseInt(e.target.value) / 100;
            document.getElementById('delayValue').textContent = e.target.value + '%';
            updateEffects();
        });
    }
    
    const distortionSlider = document.getElementById('distortionAmount');
    if (distortionSlider) {
        distortionSlider.addEventListener('input', (e) => {
            settings.distortion = parseInt(e.target.value) / 100;
            document.getElementById('distortionValue').textContent = e.target.value + '%';
            updateEffects();
        });
    }
    
    const filterSlider = document.getElementById('filterCutoff');
    if (filterSlider) {
        filterSlider.addEventListener('input', (e) => {
            settings.filterCutoff = parseInt(e.target.value);
            const display = settings.filterCutoff >= 10000 ? 
                (settings.filterCutoff / 1000).toFixed(0) + 'k' : settings.filterCutoff + '';
            document.getElementById('filterValue').textContent = display;
            updateEffects();
        });
    }
    
    // Quantize toggle
    const quantizeToggle = document.getElementById('quantizeToggle');
    if (quantizeToggle) {
        quantizeToggle.checked = settings.quantize;
        quantizeToggle.addEventListener('change', (e) => {
            settings.quantize = e.target.checked;
            if (settings.quantize && audioContext) {
                quantizeStartTime = audioContext.currentTime;
                lastBufferGridIndex = -1;
                lastSnapGridIndex = -1;
                quantizeBuffer = [];  // Clear any pending notes
            }
            updateQuantizeIndicator();
        });
    }
    
    // Quantize mode
    const quantizeModeSelect = document.getElementById('quantizeMode');
    if (quantizeModeSelect) {
        quantizeModeSelect.value = settings.quantizeMode;
        quantizeModeSelect.addEventListener('change', (e) => {
            settings.quantizeMode = e.target.value;
        });
    }
    
    // Tempo
    const tempoSlider = document.getElementById('tempo');
    if (tempoSlider) {
        tempoSlider.value = settings.tempo;
        tempoSlider.addEventListener('input', (e) => {
            settings.tempo = parseInt(e.target.value);
            document.getElementById('tempoValue').textContent = e.target.value;
        });
    }
    
    // Grid
    const gridSelect = document.getElementById('quantizeGrid');
    if (gridSelect) {
        gridSelect.value = settings.quantizeGrid;
        gridSelect.addEventListener('change', (e) => {
            settings.quantizeGrid = e.target.value;
        });
    }
    
    // Playback speed
    const speedSelect = document.getElementById('playbackSpeed');
    if (speedSelect) {
        speedSelect.value = settings.playbackSpeed;
        speedSelect.addEventListener('change', (e) => {
            settings.playbackSpeed = parseFloat(e.target.value);
        });
    }
    
    // Play/Stop/Loop buttons
    const playBtn = document.getElementById('playBtn');
    if (playBtn) {
        playBtn.addEventListener('click', startPlayback);
    }
    
    const stopBtn = document.getElementById('stopBtn');
    if (stopBtn) {
        stopBtn.addEventListener('click', stopPlayback);
    }
    
    const loopBtn = document.getElementById('loopBtn');
    if (loopBtn) {
        loopBtn.addEventListener('click', () => {
            loopMode = !loopMode;
            loopBtn.classList.toggle('active', loopMode);
        });
    }
    
    // Arpeggiator controls
    const arpToggle = document.getElementById('arpToggle');
    if (arpToggle) {
        arpToggle.addEventListener('change', (e) => {
            arpEnabled = e.target.checked;
            resetArp();
            updateArpIndicator();
        });
    }
    
    const arpPatternSelect = document.getElementById('arpPattern');
    if (arpPatternSelect) {
        arpPatternSelect.addEventListener('change', (e) => {
            arpPattern = e.target.value;
            resetArp();
        });
    }
    
    const arpOctavesSelect = document.getElementById('arpOctaves');
    if (arpOctavesSelect) {
        arpOctavesSelect.addEventListener('change', (e) => {
            arpOctaves = parseInt(e.target.value);
            resetArp();
        });
    }
    
    // Double-tap toggle
    const doubleTapToggle = document.getElementById('doubleTapToggle');
    if (doubleTapToggle) {
        doubleTapToggle.addEventListener('change', (e) => {
            doubleTapEnabled = e.target.checked;
            updateDoubleTapIndicator();
        });
    }
}

function updateArpIndicator() {
    const indicator = document.getElementById('arpIndicator');
    if (indicator) {
        indicator.classList.toggle('active', arpEnabled);
        indicator.textContent = arpEnabled ? 'On' : 'Off';
    }
}

function updateDoubleTapIndicator() {
    const indicator = document.getElementById('doubleTapIndicator');
    if (indicator) {
        indicator.classList.toggle('active', doubleTapEnabled);
        indicator.textContent = doubleTapEnabled ? 'On' : 'Off';
    }
}

// =============================================================================
// TYPING BOX
// =============================================================================

function setupTypingBox() {
    const typingBox = document.getElementById('typingBox');
    if (!typingBox) return;
    
    typingBox.addEventListener('click', () => {
        typingBox.focus();
        initAudio();
    });
    
    typingBox.addEventListener('focus', () => {
        typingBoxFocused = true;
    });
    
    typingBox.addEventListener('blur', () => {
        typingBoxFocused = false;
    });
    
    typingBox.addEventListener('keydown', (e) => {
        // Ignore key repeats (held keys) - prevents arp-like behavior with quantize
        if (e.repeat) return;
        
        if (['Escape', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
            e.preventDefault();
        }
        
        modifiers.shift = e.shiftKey;
        modifiers.ctrl = e.ctrlKey;
        modifiers.alt = e.altKey;
        modifiers.cmd = e.metaKey;
        updateModifierDisplay();
        
        let key = e.key.toLowerCase();
        if (e.code === 'Space') key = 'space';
        else if (e.code === 'Enter') key = 'enter';
        else if (e.code === 'Backspace') key = 'backspace';
        else if (e.code === 'Delete') key = 'delete';
        else if (e.code === 'Tab') key = 'tab';
        else if (e.code === 'Escape') key = 'escape';
        else if (e.code === 'ArrowUp') key = 'up';
        else if (e.code === 'ArrowDown') key = 'down';
        else if (e.code === 'ArrowLeft') key = 'left';
        else if (e.code === 'ArrowRight') key = 'right';
        else if (e.code === 'Backquote') key = '`';
        else if (e.code === 'Equal' || e.code === 'NumpadAdd') key = 'plus';
        else if (e.code === 'Minus' || e.code === 'NumpadSubtract') key = 'minus';
        else if (e.code.startsWith('F') && e.code.length <= 3) key = e.code.toLowerCase();
        
        handleKeyDown(key, modifiers, true);
    });
    
    typingBox.addEventListener('keyup', (e) => {
        modifiers.shift = e.shiftKey;
        modifiers.ctrl = e.ctrlKey;
        modifiers.alt = e.altKey;
        modifiers.cmd = e.metaKey;
        updateModifierDisplay();
        
        let key = e.key.toLowerCase();
        if (e.code === 'Space') key = 'space';
        
        handleKeyUp(key);
    });
    
    const clearBtn = document.getElementById('clearTyping');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            typingBox.value = '';
            typingBox.focus();
        });
    }
}

// =============================================================================
// POWER BUTTON
// =============================================================================

function setupPowerButton() {
    const powerBtn = document.getElementById('powerBtn');
    const container = document.querySelector('.container');
    
    if (!powerBtn || !container) return;
    
    powerBtn.addEventListener('click', () => {
        isPoweredOn = !isPoweredOn;
        
        if (isPoweredOn) {
            // Power on
            container.classList.remove('powered-off');
            powerBtn.classList.remove('off');
            powerBtn.title = 'Power Off';
            
            // Resume audio if it exists
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
            
            updateStatus('ready');
        } else {
            // Power off
            container.classList.add('powered-off');
            powerBtn.classList.add('off');
            powerBtn.title = 'Power On';
            
            // Stop any playback
            stopPlayback();
            
            // Suspend audio context
            if (audioContext && audioContext.state === 'running') {
                audioContext.suspend();
            }
            
            // Clear quantize buffer
            quantizeBuffer = [];
            
            updateStatus('off');
        }
    });
}

function updateStatus(state) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (!statusDot || !statusText) return;
    
    if (state === 'off') {
        statusText.textContent = 'OFF';
    } else if (state === 'ready') {
        statusText.textContent = 'Ready';
    } else if (state === 'connected') {
        statusText.textContent = 'Connected';
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    buildPiano();
    setupControls();
    setupTypingBox();
    setupPowerButton();
    connectWebSocket();
    
    applyEffectPreset(settings.effectPreset);
    
    document.body.addEventListener('click', () => {
        if (!audioContext) {
            initAudio();
        } else if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }, { once: true });
});
