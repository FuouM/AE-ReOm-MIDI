/** ReOm MIDI public API — extended incrementally as modules attach methods. */
interface ReOmMIDIApi {
    VERSION: string;
    __NO_AUTO_LAUNCH__?: boolean;
    [key: string]: any;
}

declare var ReOmMIDI: ReOmMIDIApi;

interface ReOmGlobalState {
    [key: string]: any;
}

interface ReOmDollar {
    global: ReOmGlobalState;
    os?: string;
}

declare var $: ReOmDollar;

declare var global: any;

interface NodeModule {
    exports: any;
}

declare var module: NodeModule | undefined;
