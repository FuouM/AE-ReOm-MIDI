/** Normalized note used by piano-roll collectors and rect builders. */
interface PianoRollNote {
    index?: number;
    time: number;
    duration: number;
    pitch: number;
    velocity: number;
    label?: string;
    isDrum?: boolean;
    midiChannel?: number;
    trackIndex?: number;
}

/** Axis-aligned piano-roll bar mapped to comp coordinates. */
interface PianoRollRect {
    index?: number;
    x: number;
    y: number;
    left: number;
    right: number;
    width: number;
    height: number;
    opacity: number;
    label?: string;
    pitch: number;
    time: number;
    duration: number;
    velocity: number;
    isDrum?: boolean;
    pitchRangeMin?: number;
    pitchRangeMax?: number;
    laneHeight?: number;
}

/** Single MIDI trigger point consumed by action expressions / bakes. */
interface MidiActionTrigger {
    time: number;
    label: string;
    amount: number;
    source: string;
    pitch?: number;
}

/** Result of importMidiToComp when the user cancels mid-import. */
interface ImportCancelledResult {
    cancelled: true;
    imported: number;
}

/** Successful metronome layer creation summary. */
interface MetronomeLayerResult {
    layerName: string;
    signatureChanges: number;
    keyframes: number;
}

/** Successful BPM layer creation summary. */
interface BpmLayerResult {
    layerName: string;
    beats: number;
    tempoChanges: number;
    keyframes: number;
}

/** importMidiToComp returns channel count or a cancellation object. */
type ImportResult = number | ImportCancelledResult;
