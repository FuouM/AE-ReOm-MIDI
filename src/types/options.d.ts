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
    durationSliderName?: string;
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
    outputLayerName?: string;
    addOutputSliders?: boolean;
    midiDuration?: number;
    screenFlipAxis?: "horizontal" | "vertical";
    screenFlipDimensions?: number;
    __previewSliderCaches?: PreviewSliderCaches;
    __previewProgressHook?: PreviewProgressHook;
}

/** MidiActionOptionsInput after resolveMidiActionOptions fills defaults. */
interface MidiActionOptionsResolved extends MidiActionOptionsInput {
    triggerMode: TriggerMode;
    preset: MidiActionPreset;
    pitchSliderName: string;
    drumMap: string;
    pitchMap: string;
    falloff: FalloffMode;
    useWorkArea: boolean;
    limitTriggers: boolean;
    pitchFilter: number[];
    timeStart?: number;
    timeEnd?: number;
}

/** Layer with an effect parade used by piano-roll controller builders. */
interface LayerWithEffects extends Layer {
    Effects?: PropertyGroup & {
        addProperty(matchName: string): PropertyGroup;
    };
}

/** Minimal property container accepted by piano-roll shape helpers. */
interface PropContainerLike {
    property?(nameOrIndex: string | number): unknown;
    setValue?(value: unknown): void;
    addProperty?(matchName: string): unknown;
    numProperties?: number;
    name?: string;
}
/** Minimal comp-like object accepted by piano-roll layout helpers. */
interface PianoRollCompLike {
    width?: number;
    height?: number;
    duration?: number;
    frameDuration?: number;
    workAreaStart?: number;
    workAreaDuration?: number;
}

interface PianoRollMapOptions extends WorkAreaOptions {
    notes?: PianoRollNote[];
    maxNotes?: number | string;
    noteHeight?: number | string;
    xMin?: number | string;
    xMax?: number | string;
    yMin?: number | string;
    yMax?: number | string;
    pitchRangeMin?: number | string;
    pitchRangeMax?: number | string;
    pitchRangePadding?: number | string;
    useDrumLanes?: boolean;
    limitTriggers?: boolean;
    color?: string;
    pitchFilter?: string | number[];
    previewWidth?: number;
    previewHeight?: number;
    sourceLabel?: string;
    fillColor?: number[];
    fillOpacity?: number;
    strokeColor?: number[];
    strokeOpacity?: number;
    strokeWidth?: number;
    masterOpacity?: number;
    controllerName?: string;
    includeFillControls?: boolean;
    __previewProgressHook?: PreviewProgressHook;
}

/** PianoRollMapOptions after resolvePianoRollMapOptions. */
interface ResolvedPianoRollMapOptions extends PianoRollMapOptions {
    useWorkArea: boolean;
}

/** Tone layer generation options. */
interface ToneLayerOptionsInput extends QuantizeOptions, WorkAreaOptions {
    waveform?: ToneWaveform | string;
    level?: number | string;
    useDrumLanes?: boolean;
}

/** Options accepted by createMidiActionOutputNull. */
interface MidiActionOutputNullOptions extends MidiActionOptionsResolved {
    outputLayerName?: string;
    addOutputSliders?: boolean;
}
