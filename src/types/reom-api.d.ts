/** ReOm MIDI public API — namespace + midi-file methods typed in the first slice. */
interface ReOmMIDIApi {
    VERSION: string;
    __NO_AUTO_LAUNCH__?: boolean;

    AE_EFFECT_NAME_MAX_BYTES: number;
    KEYFRAME_EPSILON: number;
    GM_DRUM_NAMES: { [pitch: number]: string };
    MIDI_NOTE_NAMES: { [pitch: number]: string };
    MIDI_NOTE_FREQ: { [pitch: number]: number };

    getGlobalState(): ReOmGlobalState | null;
    resetGlobalState(): void;
    extend(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown>;
    pad2(value: number | string): string;
    sanitizeName(value?: string | number | null): string;
    truncateNameBytes(value: string | number | null | undefined, maxBytes: number): string;
    limitEffectName(value?: string | number | null): string;
    formatChannelEffectPrefix(channel: MidiChannelRef): string;
    formatStandardEffectName(channel: MidiChannelRef, suffix: string): string;
    formatDrumEffectName(channel: MidiChannelRef, pitch: number, drumName?: string): string;
    frequencyForPitch(pitch: number): number;
    noteNameForPitch(pitch: number): string;
    isDrumChannel(midiChannel: number): boolean;
    getDrumName(pitch: number): string;
    formatChannelName(channel: MidiChannelRef): string;

    tempoToBpm(microsecondsPerQuarter: number): number;
    buildMidiFileInfoReport(midi: MidiFileData | null | undefined, filePath?: string): string;
    discardMidiFileData(midi: MidiFileData | null | undefined): void;
    MidiFile: MidiFileConstructor;

    addSliderControl(layer: Layer, sliderName: string): Property;
    setHoldInterpolation(property: Property | null | undefined): void;

    quantizeTimeToFrame(time: number, frameDuration?: number): number;
    importMidiToComp(
        comp: CompItem,
        midi: MidiFileData,
        options?: ImportOptions,
        progress?: ProgressCallback
    ): ImportResult;

    buildMetronomeSignatureSeries(midi: MidiFileData, options?: TimingLayerOptions): MetronomeSignatureSeries;
    buildMetronomeSeries(midi: MidiFileData, options?: TimingLayerOptions): KeyframeSeries;
    buildBeatBarSeries(midi: MidiFileData, options?: TimingLayerOptions): BeatBarSeries;
    createMetronomeLayer(comp: CompItem, midi: MidiFileData, options?: TimingLayerOptions): MetronomeLayerResult;
    createBpmLayer(comp: CompItem, midi: MidiFileData, options?: TimingLayerOptions): BpmLayerResult;

    [key: string]: unknown;
}
