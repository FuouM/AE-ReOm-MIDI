/** ExtendScript / Node host globals used by ReOm MIDI core modules. */

interface ReOmGlobalState {
    actionSourceLayerName?: string;
    pitchSliderCache?: LayerSliderNameCache;
    previewProgressHook?: PreviewProgressHook | null;
    [key: string]: unknown;
}

interface ReOmDollar {
    global: ReOmGlobalState;
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
    exports: unknown;
}

declare var module: NodeModule | undefined;
