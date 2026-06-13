/** Frame-quantization flags shared by import and timing modules. */
interface QuantizeOptions {
    quantizeToFrames?: boolean;
    frameDuration?: number;
}

/** Work-area time window copied from a composition or supplied manually. */
interface WorkAreaOptions {
    useWorkArea?: boolean;
    timeStart?: number;
    timeEnd?: number;
}

/** Options for importing MIDI into After Effects slider layers. */
interface ImportOptions extends QuantizeOptions {
    layerMode?: LayerMode;
    layerNamePrefix?: string;
    importNamedDrumSliders?: boolean;
    includeControllers?: boolean;
    includePitchBends?: boolean;
}

/** Options for timing-layer builders (metronome, BPM). */
interface TimingLayerOptions extends QuantizeOptions {}

/** ImportOptions after normalizeOptions fills defaults. */
interface ResolvedImportOptions extends ImportOptions {
    layerMode: LayerMode;
    layerNamePrefix: string;
    importNamedDrumSliders: boolean;
}

/** TimingLayerOptions after resolveTimingLayerOptions. */
interface ResolvedTimingLayerOptions {
    quantizeToFrames: boolean;
    frameDuration?: number;
}

/** User-facing MIDI file selection options from the UI / main runner. */
interface MidiFileRunnerOptions {
    midiFileName?: string;
    quantizeToFrames?: boolean;
}

/** Raw MIDI action options before resolveMidiActionOptions normalizes them. */
interface MidiActionOptionsInput extends WorkAreaOptions, QuantizeOptions {
    preset?: MidiActionPreset;
    triggerMode?: TriggerMode;
    pitchSliderName?: string;
    drumMap?: string;
    pitchMap?: string;
    baseValue?: number | string;
    activeValue?: number | string;
    amount?: number | string;
    duration?: number | string;
    falloff?: FalloffMode;
    maxNotes?: number | string;
    limitTriggers?: boolean;
    useOutputSliders?: boolean;
    pitchFilter?: string | number[];
    previewStep?: number;
    previewEndTime?: number;
    previewBaseValue?: number;
    previewActiveValue?: number;
    sourceLayerName?: string;
    frameDuration?: number;
}

/** Piano roll map / preview layout options. */
interface PianoRollMapOptions extends WorkAreaOptions {
    notes?: PianoRollNote[];
    maxNotes?: number | string;
    noteHeight?: number | string;
    xMin?: number | string;
    xMax?: number | string;
    yMin?: number | string;
    yMax?: number | string;
    useDrumLanes?: boolean;
    limitTriggers?: boolean;
    __previewProgressHook?: unknown;
}

/** Tone layer generation options. */
interface ToneLayerOptionsInput extends QuantizeOptions, WorkAreaOptions {
    waveform?: ToneWaveform | string;
    level?: number | string;
    useDrumLanes?: boolean;
}
