/** Layer creation strategy when importing MIDI to a composition. */
type LayerMode = "per-channel" | "combined";

/** MIDI action expression preset identifiers. */
type MidiActionPreset = "pump" | "toggle" | "interpolate" | "accumulator";

/** Envelope / segment curve applied after a MIDI trigger. */
type FalloffMode = "linear" | "instant" | "ease" | "exponential";

/** How MIDI action triggers are collected from source data. */
type TriggerMode = "pitch" | "drums";

/** Tone effect waveform labels supported by ReOm MIDI. */
type ToneWaveform = "Sine" | "Triangle" | "Saw" | "Square" | "White Noise";

/** Import progress callback; return false to cancel. */
type ProgressCallback = (message: string, fraction: number) => boolean | void;

/** Generic string-keyed dictionary used across ReOm MIDI modules. */
interface StringKeyedMap<T> {
    [key: string]: T;
}

/** Numeric dictionary keyed by MIDI controller number. */
interface ControllerMap {
    [controller: number]: MidiControllerEvent[];
}
