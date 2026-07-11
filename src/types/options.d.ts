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
    forceDrumChannels?: number[];
}

/** Options for timing-layer builders (metronome, BPM). */
interface TimingLayerOptions extends QuantizeOptions {}

/** ImportOptions after normalizeOptions fills defaults. */
interface ResolvedImportOptions extends ImportOptions {
    layerMode: LayerMode;
    layerNamePrefix: string;
    importNamedDrumSliders: boolean;
    forceDrumChannels: number[];
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

/** Import tab runner: file path plus ImportOptions fields. */
interface UiImportRunOptions extends MidiFileRunnerOptions, ImportOptions {}

/** Screen flip runner options (axis plus MIDI action fields). */
interface ScreenFlipRunOptions extends MidiActionOptionsInput {
    axis?: "horizontal" | "vertical";
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

/** Drum slider descriptor used by the MIDI action for per-slider trigger collection. */
interface DrumSliderDescriptor {
    effectName: string;
    pitch: number;
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
    drumSliders?: DrumSliderDescriptor[];
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

/** Label mode for MIDI map and drum sequencer pitch labels. */
type MidiMapLabelMode = "notes" | "drums";

/** Options for MIDI map expression generation. */
interface MidiMapOptions extends MidiActionOptionsInput {
    labelMode?: MidiMapLabelMode;
    defaultLabel?: string;
    existingExpression?: string;
}

/** Options passed to buildMidiMapExpression. */
interface MidiMapExpressionOptions {
    sourceLayerName?: string;
    pitchSliderName?: string;
    noteLabels?: NoteLabelPair[];
    defaultLabel?: string;
}

/** Tone layer generation options. */
interface ToneLayerOptionsInput extends QuantizeOptions, WorkAreaOptions {
    waveform?: ToneWaveform | string;
    level?: number | string;
    useDrumLanes?: boolean;
}

/** Tone layer generation options after resolveToneLayerOptions. */
interface ToneLayerOptionsResolved extends QuantizeOptions, WorkAreaOptions {
    waveform: ToneWaveform | string;
    level: number;
    quantizeToFrames: boolean;
    useWorkArea: boolean;
    useDrumLanes: boolean;
    frameDuration?: number;
    timeStart?: number;
    timeEnd?: number;
}

/** Drum machine shape / grid generation options. */
interface DrumMachineOptionsInput extends WorkAreaOptions {
    maxNotes?: number | string;
    squareSize?: number | string;
    noteHeight?: number | string;
    gridGap?: number | string;
    gridMargin?: number | string;
    limitNotes?: boolean;
    pitchFilter?: string | number[];
    animateScale?: boolean;
    animateOpacity?: boolean;
    animateRotation?: boolean;
    falloff?: FalloffMode | string;
    duration?: number | string;
    amountScale?: number | string;
    amountOpacity?: number | string;
    amountRotation?: number | string;
    baseScale?: number | string;
    baseOpacity?: number | string;
    baseRotation?: number | string;
    useExpression?: boolean;
    sourceLayerName?: string;
    pitchSliderName?: string;
    controllerName?: string;
    baseValue?: number | string;
    base?: number | string;
    amount?: number | string;
    amountValue?: number | string;
}

/** Drum machine options after resolveDrumMachineOptions. */
interface DrumMachineOptionsResolved extends DrumMachineOptionsInput {
    squareSize: number | string;
    useWorkArea: boolean;
    limitNotes: boolean;
    pitchFilter: number[];
    animateScale: boolean;
    animateOpacity: boolean;
    animateRotation: boolean;
    falloff: FalloffMode | string;
    duration: number | string;
    amountScale: number | string;
    amountOpacity: number | string;
    amountRotation: number | string;
    baseScale: number | string;
    baseOpacity: number | string;
    baseRotation: number | string;
    useExpression: boolean;
    timeStart?: number;
    timeEnd?: number;
}

/** Drum sequencer expression generation options. */
interface DrumSequencerOptions extends MidiActionOptionsInput {
    labelMode?: MidiMapLabelMode;
    existingExpression?: string;
    totalFrames?: number | string;
    previousTotalFrames?: number | string;
    preserveFrameMap?: StringKeyedMap<{ startFrame: number; endFrame: number }>;
}

/** Options passed to buildDrumSequencerExpression. */
interface DrumSequencerExpressionOptions {
    sourceLayerName?: string;
    pitchSliderName?: string;
    durationSliderName?: string;
    frameEntries?: DrumSequencerFrameEntry[];
    useNamedDrumSliders?: boolean;
}

/** Options for drum machine pad / hit expression builders. */
interface DrumMachinePadExpressionOptions {
    sourceLayerName?: string;
    drumEffectName?: string;
    baseValue?: number | string;
    base?: number | string;
    amount?: number | string;
    amountValue?: number | string;
    duration?: number | string;
    falloff?: FalloffMode | string;
    label?: string;
    hitTime?: number | string;
    pitchFilter?: number[];
    sourceRefs?: DrumMachineSourceRef[];
}

/** Drum machine pad action options including multi-source pump wiring. */
interface DrumMachineActionOptions extends DrumMachinePadExpressionOptions, MidiActionOptionsInput {
    multiSource?: boolean;
}

/** Options accepted by createMidiActionOutputNull. */
interface MidiActionOutputNullOptions extends MidiActionOptionsResolved {
    outputLayerName?: string;
    addOutputSliders?: boolean;
}
