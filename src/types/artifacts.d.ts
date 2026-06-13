/** Axis-aligned bounds for a piano-roll preview chart. */
interface PianoRollPreviewBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/** Layout payload for piano-roll preview UI. */
interface PianoRollPreviewLayout {
    rects: PianoRollRect[];
    noteCount: number;
    bounds: PianoRollPreviewBounds;
    sourceLabel: string;
    description: string;
}

/** HTML export payload for piano-roll preview. */
interface PianoRollPreviewHtml extends PianoRollPreviewLayout {
    html: string;
}

/** Result of previewPianoRollMap. */
interface PianoRollMapPreviewResult {
    notes: number;
    rects: PianoRollRect[];
    layout: PianoRollPreviewLayout;
}

/** Result of createPianoRollMapLayers. */
interface PianoRollMapResult {
    created: number;
    rects: PianoRollRect[];
    notes: number;
    controller: string;
}

/** Effect names wired on a piano-roll controller null. */
interface PianoRollControllerEffects {
    fillColor?: string;
    fillOpacity?: string;
    strokeColor: string;
    strokeOpacity: string;
    strokeWidth: string;
    masterOpacity: string;
}

/** Null layer + slider effects created for piano-roll map styling. */
interface PianoRollControllerNullResult {
    layer: Layer;
    name: string;
    effects: PianoRollControllerEffects;
}

/** Time span resolved for piano-roll rect mapping. */
interface PianoRollTimeRange {
    timeStart: number;
    timeEnd: number;
}

/** Inclusive MIDI pitch span for piano-roll lane layout. */
interface PianoRollPitchRange {
    min: number;
    max: number;
}

/** Lane metrics derived from pitch range and roll height. */
interface PianoRollLaneMetrics {
    pitchRange: PianoRollPitchRange;
    laneHeight: number;
    rollBottom: number;
}

/** Partial note pushed by piano-roll collectors. */
interface PianoRollNoteDraft {
    time?: number;
    duration?: number;
    pitch: number;
    velocity?: number;
    label?: string;
    isDrum?: boolean;
    midiChannel?: number;
    trackIndex?: number;
}

/** Single drum-pad hit collected from a named slider effect. */
interface NamedDrumPadHit {
    time: number;
    duration: number;
    velocity: number;
}

/** Named drum slider plus its keyed hits for drum-machine builders. */
interface NamedDrumPadGroup {
    pitch: number;
    label: string;
    effectName: string;
    hits: NamedDrumPadHit[];
}

/** Shape layer created for one piano-roll note bar. */
interface ShapeRectLayerResult {
    layer: Layer | null;
    rect: PianoRollRect;
}

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
    color?: number[];
}

/** Single MIDI trigger point consumed by action expressions / bakes. */
interface MidiActionTrigger {
    time: number;
    label: string;
    amount: number;
    source: string;
    pitch?: number;
    value?: number;
}

/** Cached slider keyframe times and values for preview / trigger collection. */
interface SliderKeyCache {
    times: number[];
    values: number[];
}

/** Pitch and velocity slider caches built for action preview. */
interface PreviewSliderCaches {
    pitch: SliderKeyCache;
    velocity: SliderKeyCache | null;
}

/** Resolved effect slider lookup from a MIDI import layer. */
interface EffectSliderResolution {
    effectName: string | null;
    slider: Property | null;
}

/** AE property value used by bake plans and simulation. */
type MidiActionPropertyValue = number | number[] | string;

/** One sampled point on a MIDI action simulation curve. */
interface MidiActionSimulationPoint {
    time: number;
    value: number;
}

/** Result of simulateMidiAction / simulateMidiActionFromLayer. */
interface MidiActionSimulation {
    triggers: MidiActionTrigger[];
    points: MidiActionSimulationPoint[];
}

/** Time span used when sampling a MIDI action preview curve. */
interface MidiActionPreviewRange {
    step: number;
    startTime: number;
    endTime: number;
}

/** Axis-aligned bounds for a MIDI action preview chart. */
interface MidiActionPreviewBounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

/** Layout payload for MIDI action preview UI. */
interface MidiActionPreviewLayout {
    points: MidiActionSimulationPoint[];
    triggers: MidiActionTrigger[];
    triggerCount: number;
    bounds: MidiActionPreviewBounds;
    sourceLabel: string;
    description: string;
    preset: MidiActionPreset;
}

/** Keyframe bake plan produced by buildMidiActionBakePlan. */
interface MidiActionBakePlan {
    times: number[];
    values: MidiActionPropertyValue[];
    hold: boolean;
}

/** Summary returned by bakeMidiActionToSelectedProperties. */
interface BakeSelectedPropertiesResult {
    applied: number;
    skipped: number;
    triggers: number;
}

/** Summary returned by applyExpressionToSelectedProperties. */
interface ApplyExpressionResult {
    applied: number;
    skipped: number;
}

/** Prepared expression plus resolved options from prepareMidiActionExpression. */
interface PrepareMidiActionExpressionResult {
    resolved: MidiActionOptionsResolved;
    expression: string;
}

/** Summary returned by createMidiActionNullWithExpression. */
interface CreateMidiActionNullResult {
    layerName: string;
    expression: string;
}

/** Summary returned by createMidiActionNullWithBake. */
interface CreateMidiActionNullBakeResult {
    layerName: string;
    triggers: number;
}

/** Summary returned by bakeMidiActionToProperty. */
interface BakePropertyResult {
    triggers: number;
}

/** Unique pitch values collected from an imported MIDI layer. */
interface PitchValuesFromLayerResult {
    pitches: number[];
    min: number | null;
    max: number | null;
    pitchSliderName: string | null;
}

/** Null layer + slider created for a MIDI action output. */
interface MidiActionOutputNull {
    layer: Layer;
    property: Property;
    effect: null;
}

/** Parsed bracket pair from interpolate preset literals. */
interface BracketPair {
    left: string;
    right: string;
}

/** Slider effect index built from a layer's effect parade. */
interface LayerEffectSliderIndex {
    byName: { [effectName: string]: Property };
    names: string[];
}

/** Parsed drum effect name components. */
interface ParsedDrumEffectName {
    prefix: string;
    pitch: number;
    label: string;
}

/** Parsed Txx Chxx channel prefix. */
interface ParsedChannelPrefix {
    trackIndex: number;
    midiChannel: number;
}

/** Amount/duration expression fragments for pump preset. */
interface AmountDurationExpressions {
    amount: string;
    duration: string;
}

/** Optional preview progress hook supplied by the UI module. */
interface PreviewProgressHook {
    stageId?: string;
    stageLabel?: string;
    percent?: number;
    setStage(stageId: string, detail?: string): void;
    step(done: number, total: number, detail?: string): void;
    report(percent: number, detail?: string): void;
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
