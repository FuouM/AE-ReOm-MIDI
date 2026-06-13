function reomScriptRoot(): ReOmRootObject {
    try {
        if (typeof $ !== "undefined" && $.global) {
            return $.global as unknown as ReOmRootObject;
        }
    } catch (e) {}
    if (typeof global !== "undefined") {
        return global;
    }
    return {} as ReOmRootObject;
}

var reomRoot = reomScriptRoot();
if (!reomRoot.ReOmMIDI) {
    reomRoot.ReOmMIDI = {} as Partial<ReOmMIDIApi> as ReOmMIDIApi;
}
var ReOmMIDI = reomRoot.ReOmMIDI;

(function (api: ReOmMIDIApi) {
    api.VERSION = "__REOM_MIDI_VERSION__";

    api.getGlobalState = function () {
        try {
            if (typeof $ === "undefined" || !$.global) {
                return null;
            }
            if (!$.global.__reomMidiState) {
                $.global.__reomMidiState = {};
            }
            return $.global.__reomMidiState;
        } catch (e) {}
        return null;
    };

    api.resetGlobalState = function () {
        var key;
        var globalBag: Record<string, unknown>;
        try {
            if (typeof $ === "undefined" || !$.global) {
                return;
            }
            globalBag = $.global as Record<string, unknown>;
            for (key in globalBag) {
                if (globalBag.hasOwnProperty(key) && key.indexOf("__reomMidi") === 0) {
                    delete globalBag[key];
                }
            }
            $.global.__reomMidiState = {};
        } catch (e) {}
    };

    api.extend = function (target, source) {
        var key;
        for (key in source) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        }
        return target;
    };

    api.pad2 = function (value) {
        value = String(value);
        return value.length < 2 ? "0" + value : value;
    };

    api.AE_EFFECT_NAME_MAX_BYTES = 39;

    // Small time offset so consecutive MIDI keyframes stay ordered when not frame-quantized.
    api.KEYFRAME_EPSILON = 0.0005;

    api.sanitizeName = function (value) {
        value = String(value || "unnamed");
        value = value.replace(/[\\\/:\*\?"<>\|]/g, "_");
        value = value.replace(/\s+/g, " ");
        return value;
    };

    function byteLength(value: string | number | null | undefined): number {
        return encodeURIComponent(String(value || "")).replace(/%[A-F0-9]{2}/g, "x").length;
    }

    api.truncateNameBytes = function (value, maxBytes) {
        var slice;
        var i;
        value = String(value || "");
        if (byteLength(value) <= maxBytes) {
            return value;
        }
        for (i = value.length; i > 0; i--) {
            slice = value.substring(0, i);
            if (byteLength(slice) <= maxBytes) {
                return slice;
            }
        }
        return "";
    };

    api.limitEffectName = function (value) {
        return api.truncateNameBytes(api.sanitizeName(value), api.AE_EFFECT_NAME_MAX_BYTES);
    };

    api.formatChannelEffectPrefix = function (channel) {
        return "T" + api.pad2(channel.trackIndex + 1) + " Ch" + api.pad2(channel.midiChannel + 1);
    };

    api.formatStandardEffectName = function (channel, suffix) {
        return api.limitEffectName(api.formatChannelEffectPrefix(channel) + " " + suffix);
    };

    api.formatDrumEffectName = function (channel, pitch, drumName) {
        var base = api.limitEffectName(api.formatChannelEffectPrefix(channel) + " d" + pitch);
        var remaining;
        if (byteLength(base) >= api.AE_EFFECT_NAME_MAX_BYTES) {
            return base;
        }
        drumName = api.sanitizeName(drumName || api.getDrumName(pitch));
        remaining = api.AE_EFFECT_NAME_MAX_BYTES - byteLength(base) - 1;
        if (remaining > 0 && drumName) {
            return base + " " + api.truncateNameBytes(drumName, remaining);
        }
        return base;
    };

    api.GM_DRUM_NAMES = {
        35: "Acoustic Bass Drum",
        36: "Bass Drum 1",
        37: "Side Stick",
        38: "Acoustic Snare",
        39: "Hand Clap",
        40: "Electric Snare",
        41: "Low Floor Tom",
        42: "Closed Hi-Hat",
        43: "High Floor Tom",
        44: "Pedal Hi-Hat",
        45: "Low Tom",
        46: "Open Hi-Hat",
        47: "Low-Mid Tom",
        48: "Hi-Mid Tom",
        49: "Crash Cymbal 1",
        50: "High Tom",
        51: "Ride Cymbal 1",
        52: "Chinese Cymbal",
        53: "Ride Bell",
        54: "Tambourine",
        55: "Splash Cymbal",
        56: "Cowbell",
        57: "Crash Cymbal 2",
        58: "Vibraslap",
        59: "Ride Cymbal 2",
        60: "Hi Bongo",
        61: "Low Bongo",
        62: "Mute Hi Conga",
        63: "Open Hi Conga",
        64: "Low Conga",
        65: "High Timbale",
        66: "Low Timbale",
        67: "High Agogo",
        68: "Low Agogo",
        69: "Cabasa",
        70: "Maracas",
        71: "Short Whistle",
        72: "Long Whistle",
        73: "Short Guiro",
        74: "Long Guiro",
        75: "Claves",
        76: "Hi Wood Block",
        77: "Low Wood Block",
        78: "Mute Cuica",
        79: "Open Cuica",
        80: "Mute Triangle",
        81: "Open Triangle"
    };

    // https://github.com/stoyan/midi-note-freq
    api.MIDI_NOTE_NAMES = {
        21: "A0",
        22: "A#0/Bb0",
        23: "B0",
        24: "C1",
        25: "C#1/Db1",
        26: "D1",
        27: "D#1/Eb1",
        28: "E1",
        29: "F1",
        30: "F#1/Gb1",
        31: "G1",
        32: "G#1/Ab1",
        33: "A1",
        34: "A#1/Bb1",
        35: "B1",
        36: "C2",
        37: "C#2/Db2",
        38: "D2",
        39: "D#2/Eb2",
        40: "E2",
        41: "F2",
        42: "F#2/Gb2",
        43: "G2",
        44: "G#2/Ab2",
        45: "A2",
        46: "A#2/Bb2",
        47: "B2",
        48: "C3",
        49: "C#3/Db3",
        50: "D3",
        51: "D#3/Eb3",
        52: "E3",
        53: "F3",
        54: "F#3/Gb3",
        55: "G3",
        56: "G#3/Ab3",
        57: "A3",
        58: "A#3/Bb3",
        59: "B3",
        60: "C4",
        61: "C#4/Db4",
        62: "D4",
        63: "D#4/Eb4",
        64: "E4",
        65: "F4",
        66: "F#4/Gb4",
        67: "G4",
        68: "G#4/Ab4",
        69: "A4",
        70: "A#4/Bb4",
        71: "B4",
        72: "C5",
        73: "C#5/Db5",
        74: "D5",
        75: "D#5/Eb5",
        76: "E5",
        77: "F5",
        78: "F#5/Gb5",
        79: "G5",
        80: "G#5/Ab5",
        81: "A5",
        82: "A#5/Bb5",
        83: "B5",
        84: "C6",
        85: "C#6/Db6",
        86: "D6",
        87: "D#6/Eb6",
        88: "E6",
        89: "F6",
        90: "F#6/Gb6",
        91: "G6",
        92: "G#6/Ab6",
        93: "A6",
        94: "A#6/Bb6",
        95: "B6",
        96: "C7",
        97: "C#7/Db7",
        98: "D7",
        99: "D#7/Eb7",
        100: "E7",
        101: "F7",
        102: "F#7/Gb7",
        103: "G7",
        104: "G#7/Ab7",
        105: "A7",
        106: "A#7/Bb7",
        107: "B7",
        108: "C8",
        109: "C#8/Db8",
        110: "D8",
        111: "D#8/Eb8",
        112: "E8",
        113: "F8",
        114: "F#8/Gb8",
        115: "G8",
        116: "G#8/Ab8",
        117: "A8",
        118: "A#8/Bb8",
        119: "B8",
        120: "C9",
        121: "C#9/Db9",
        122: "D9",
        123: "D#9/Eb9",
        124: "E9",
        125: "F9",
        126: "F#9/Gb9",
        127: "G9",
        128: "G#9/Ab9"
    };

    // https://github.com/stoyan/midi-note-freq
    api.MIDI_NOTE_FREQ = {
        0: 8.18,
        1: 8.66,
        2: 9.18,
        3: 9.72,
        4: 10.3,
        5: 10.91,
        6: 11.56,
        7: 12.25,
        8: 12.98,
        9: 13.75,
        10: 14.57,
        11: 15.43,
        12: 16.35,
        13: 17.32,
        14: 18.35,
        15: 19.45,
        16: 20.6,
        17: 21.83,
        18: 23.12,
        19: 24.5,
        20: 25.96,
        21: 27.5,
        22: 29.14,
        23: 30.87,
        24: 32.7,
        25: 34.65,
        26: 36.71,
        27: 38.89,
        28: 41.2,
        29: 43.65,
        30: 46.25,
        31: 49.0,
        32: 51.91,
        33: 55.0,
        34: 58.27,
        35: 61.74,
        36: 65.41,
        37: 69.3,
        38: 73.42,
        39: 77.78,
        40: 82.41,
        41: 87.31,
        42: 92.5,
        43: 98.0,
        44: 103.83,
        45: 110.0,
        46: 116.54,
        47: 123.47,
        48: 130.81,
        49: 138.59,
        50: 146.83,
        51: 155.56,
        52: 164.81,
        53: 174.61,
        54: 185.0,
        55: 196.0,
        56: 207.65,
        57: 220.0,
        58: 233.08,
        59: 246.94,
        60: 261.63,
        61: 277.18,
        62: 293.66,
        63: 311.13,
        64: 329.63,
        65: 349.23,
        66: 369.99,
        67: 392.0,
        68: 415.3,
        69: 440.0,
        70: 466.16,
        71: 493.88,
        72: 523.25,
        73: 554.37,
        74: 587.33,
        75: 622.25,
        76: 659.26,
        77: 698.46,
        78: 739.99,
        79: 783.99,
        80: 830.61,
        81: 880.0,
        82: 932.33,
        83: 987.77,
        84: 1046.5,
        85: 1108.73,
        86: 1174.66,
        87: 1244.51,
        88: 1318.51,
        89: 1396.91,
        90: 1479.98,
        91: 1567.98,
        92: 1661.22,
        93: 1760.0,
        94: 1864.66,
        95: 1975.53,
        96: 2093.0,
        97: 2217.46,
        98: 2349.32,
        99: 2489.02,
        100: 2637.02,
        101: 2793.83,
        102: 2959.96,
        103: 3135.96,
        104: 3322.44,
        105: 3520.0,
        106: 3729.31,
        107: 3951.07,
        108: 4186.01,
        109: 4434.92,
        110: 4698.64,
        111: 4978.03,
        112: 5274.04,
        113: 5587.65,
        114: 5919.91,
        115: 6271.93,
        116: 6644.88,
        117: 7040.0,
        118: 7458.62,
        119: 7902.13,
        120: 8372.02,
        121: 8869.84,
        122: 9397.27,
        123: 9956.06,
        124: 10548.08,
        125: 11175.3,
        126: 11839.82,
        127: 12543.85,
        128: 13289.75
    };

    api.frequencyForPitch = function (pitch) {
        var freq;
        pitch = Math.round(pitch);
        freq = api.MIDI_NOTE_FREQ[pitch];
        if (typeof freq !== "undefined") {
            return freq;
        }
        return 440 * Math.pow(2, (pitch - 69) / 12);
    };

    api.noteNameForPitch = function (pitch) {
        var name;
        pitch = Math.round(pitch);
        name = api.MIDI_NOTE_NAMES[pitch];
        if (name) {
            return name;
        }
        return String(pitch);
    };

    api.isDrumChannel = function (midiChannel) {
        return midiChannel === 9;
    };

    api.getDrumName = function (pitch) {
        return api.GM_DRUM_NAMES[pitch] || "Drum Note " + pitch;
    };

    api.formatChannelName = function (channel) {
        var trackName = channel.trackName ? channel.trackName + " " : "";
        var name = trackName + "T" + api.pad2(channel.trackIndex + 1) + " Ch" + api.pad2(channel.midiChannel + 1);
        if (api.isDrumChannel(channel.midiChannel)) {
            name += " Drums";
        }
        return name;
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(ReOmMIDI);
