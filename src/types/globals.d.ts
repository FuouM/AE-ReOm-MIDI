/** ExtendScript / Node host globals used by ReOm MIDI core modules. */

interface CopyExpressionPayload {
    comp: CompItem;
    sourceLayer: Layer;
    options: MidiActionOptionsInput;
}

interface ActionPreviewPayload {
    comp: CompItem;
    sourceLayer: Layer;
    options: MidiActionOptionsInput;
    uiGeneration: number;
}

interface PianoRollPreviewPayload {
    comp: CompItem;
    sourceLayer: Layer;
    options: PianoRollMapOptions;
    uiGeneration: number;
}

interface ReOmGlobalState {
    actionSourceLayerName?: string;
    pitchSliderCache?: LayerSliderNameCache;
    previewProgressHook?: PreviewProgressHook | null;
    copyExpressionPayload?: CopyExpressionPayload | null;
    actionPreviewPayload?: ActionPreviewPayload | null;
    pianoRollPreviewPayload?: PianoRollPreviewPayload | null;
    mapState?: MidiMapState;
    drumSequencerState?: DrumSequencerState;
    previewUiGeneration?: number;
    previewUiFlushName?: string;
    lastActionExpression?: string;
    previewCanvas?: _Control | null;
    previewCanvasRoot?: _Control | null;
    actionPreviewCanvas?: _Control | null;
    actionPreviewCanvasRoot?: _Control | null;
    pianoRollPreviewLoadingSummary?: _Control | null;
    actionPreviewLoadingSummary?: _Control | null;
    actionPreviewLoading?: boolean;
    actionPreviewLoadingLabel?: string;
    pianoRollPreviewLoading?: boolean;
    pianoRollPreviewLoadingLabel?: string;
}

interface ReOmExtendScriptGlobal {
    __reomMidiState?: ReOmGlobalState;
}

interface ReOmDollar {
    global: ReOmExtendScriptGlobal;
    os?: string;
}

/** Root object passed to the namespace IIFE (global in Node, `this` in ExtendScript). */
interface ReOmRootObject {
    ReOmMIDI?: ReOmMIDIApi;
}

declare var ReOmMIDI: ReOmMIDIApi;
declare var $: ReOmDollar;
declare var global: ReOmRootObject & typeof globalThis;

interface NodeModule {
    exports: ReOmMIDIApi | MidiFileConstructor;
}

declare var module: NodeModule | undefined;
