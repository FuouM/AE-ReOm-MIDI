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

    midiActionUsesBaseField(preset: MidiActionPreset | string): boolean;
    midiActionUsesActiveField(preset: MidiActionPreset | string): boolean;
    midiActionUsesAmountDurationFields(preset: MidiActionPreset | string): boolean;
    midiActionUsesFalloffField(preset: MidiActionPreset | string): boolean;

    buildToggleExpression(options: MidiActionOptionsInput | MidiActionOptionsResolved): string;
    buildInterpolateExpression(options: MidiActionOptionsInput | MidiActionOptionsResolved): string;
    buildPumpExpression(options: MidiActionOptionsInput | MidiActionOptionsResolved): string;
    buildAccumulatorExpression(options: MidiActionOptionsInput | MidiActionOptionsResolved): string;
    buildMidiActionExpression(options?: MidiActionOptionsInput | MidiActionOptionsResolved): string;
    buildScreenFlipExpression(options?: MidiActionOptionsInput | MidiActionOptionsResolved): string;

    collectMidiActionTriggers(midi: MidiFileData, options?: MidiActionOptionsInput): MidiActionTrigger[];
    collectMidiActionTriggersFromLayer(
        sourceLayer: Layer,
        options?: MidiActionOptionsInput | MidiActionOptionsResolved
    ): MidiActionTrigger[];
    collectPitchValuesFromLayer(
        sourceLayer: Layer,
        options?: MidiActionOptionsInput
    ): PitchValuesFromLayerResult;

    resolveMidiActionOptions(
        comp: CompItem | null | undefined,
        options: MidiActionOptionsInput | null | undefined,
        sourceLayer: Layer | null | undefined
    ): MidiActionOptionsResolved;
    resolveMidiSourceLayer(comp: CompItem, options?: MidiActionOptionsInput): Layer;
    resolvePitchSliderName(layer: Layer, options?: MidiActionOptionsInput): string;
    resolveDurationSliderName(layer: Layer, options?: MidiActionOptionsInput): string;
    detectPitchSliderName(layer: Layer | null | undefined): string | null;
    rememberMidiActionSourceLayer(layer: Layer): void;

    countLayerSliderEffects(layer: Layer): number;
    mapRange(
        value: number,
        inMin: number,
        inMax: number,
        outMin: number,
        outMax: number,
        clamp?: boolean
    ): number;

    buildMidiActionBakePlan(
        triggers: MidiActionTrigger[],
        property: Property,
        comp: CompItem | null | undefined,
        options: MidiActionOptionsInput | MidiActionOptionsResolved
    ): MidiActionBakePlan;
    bakeMidiActionToSelectedProperties(
        comp: CompItem,
        options?: MidiActionOptionsInput
    ): BakeSelectedPropertiesResult;
    bakeMidiActionToProperty(
        property: Property,
        comp: CompItem,
        sourceLayer: Layer,
        options: MidiActionOptionsInput | MidiActionOptionsResolved
    ): BakePropertyResult;

    simulateMidiAction(midi: MidiFileData, options?: MidiActionOptionsInput): MidiActionSimulation;
    simulateMidiActionFromLayer(
        sourceLayer: Layer,
        comp: CompItem | null | undefined,
        options?: MidiActionOptionsInput
    ): MidiActionSimulation;
    buildMidiActionPreviewLayout(
        sourceLayer: Layer,
        comp: CompItem | null | undefined,
        options?: MidiActionOptionsInput | MidiActionOptionsResolved
    ): MidiActionPreviewLayout;
    computeMidiActionPreviewLayout(
        comp: CompItem,
        sourceLayer: Layer,
        options?: MidiActionOptionsInput
    ): MidiActionPreviewLayout;
    previewMidiAction(
        comp: CompItem,
        sourceLayer: Layer,
        options?: MidiActionOptionsInput
    ): MidiActionPreviewLayout;

    prepareMidiActionExpression(
        comp: CompItem | null | undefined,
        sourceLayer: Layer | null | undefined,
        options?: MidiActionOptionsInput
    ): PrepareMidiActionExpressionResult;
    buildMidiActionExpressionFromLayer(
        comp: CompItem | null | undefined,
        sourceLayer: Layer | null | undefined,
        options?: MidiActionOptionsInput
    ): string;
    createMidiActionNullWithExpression(
        comp: CompItem,
        sourceLayer: Layer,
        options?: MidiActionOptionsInput
    ): CreateMidiActionNullResult;
    createMidiActionNullWithBake(
        comp: CompItem,
        sourceLayer: Layer,
        options?: MidiActionOptionsInput
    ): CreateMidiActionNullBakeResult;
    applyExpressionToSelectedProperties(
        comp: CompItem,
        options?: MidiActionOptionsInput | MidiActionOptionsResolved
    ): ApplyExpressionResult;
    applyMidiActionExpressionToProperty(property: Property, expression: string): boolean;
    resolveScreenFlipActionOptions(
        comp: CompItem,
        property: Property,
        axis: string,
        options: MidiActionOptionsInput | null | undefined,
        sourceLayer: Layer
    ): MidiActionOptionsResolved;

    getCompSelectedLayers(comp: CompItem | null | undefined): Layer[];
    isMidiImportSourceLayer(layer: Layer | null | undefined): boolean;

    beginPreviewProgress?(kind: string, sourceLabel?: string): PreviewProgressHook;
    clearPreviewProgress?(): void;
    getActivePreviewProgressHook?(): PreviewProgressHook | null;
    endPreviewProgress?(hook: PreviewProgressHook): void;
    showMidiActionPreviewInPanel?(layout: MidiActionPreviewLayout): void;
    showPianoRollPreviewInPanel?(layout: PianoRollPreviewLayout): void;
    showPianoRollPreviewLoadingInPanel?(sourceLabel: string): void;

    resolvePianoRollMapOptions(
        comp: CompItem | null | undefined,
        options?: PianoRollMapOptions
    ): ResolvedPianoRollMapOptions;
    collectPianoRollNotesFromLayer(layer: Layer, options?: PianoRollMapOptions): PianoRollNote[];
    collectPianoRollNotes(midi: MidiFileData, options?: PianoRollMapOptions): PianoRollNote[];
    collectDrumHitNotesFromLayer(layer: Layer, options?: PianoRollMapOptions): PianoRollNote[];
    collectNamedDrumPadGroupsFromLayer(layer: Layer, options?: PianoRollMapOptions): NamedDrumPadGroup[];
    buildPianoRollRects(
        source: Layer | MidiFileData,
        compLike: CompItem | PianoRollCompLike,
        options?: PianoRollMapOptions
    ): PianoRollRect[];
    buildPianoRollPreviewLayout(
        source: Layer | MidiFileData,
        compLike: CompItem | PianoRollCompLike,
        options?: PianoRollMapOptions
    ): PianoRollPreviewLayout;
    buildPianoRollPreviewHtml(
        source: Layer | MidiFileData,
        compLike: CompItem | PianoRollCompLike,
        options?: PianoRollMapOptions
    ): PianoRollPreviewHtml;
    previewPianoRollMap(
        comp: CompItem,
        sourceLayer: Layer,
        options?: PianoRollMapOptions
    ): PianoRollMapPreviewResult;
    createPianoRollControllerNull(
        comp: CompItem,
        sourceLayer: Layer,
        options?: PianoRollMapOptions
    ): PianoRollControllerNullResult | null;
    wireShapeStrokeFromController(layer: Layer, controllerEffects: PianoRollControllerEffects): void;
    wireShapeMasterOpacityFromController(layer: Layer, controllerEffects: PianoRollControllerEffects): void;
    createShapeRectLayer(comp: CompItem, rect: PianoRollRect): ShapeRectLayerResult;
    createPianoRollMapLayers(
        comp: CompItem,
        sourceLayer: Layer,
        options?: PianoRollMapOptions
    ): PianoRollMapResult;
    channelPrefixFromLayer(layer: Layer | null | undefined): string | null;
    layerHasNamedDrumSliders(layer: Layer): boolean;
    pianoRollYForPitch(pitch: number, rangeMin: number, rollBottom: number, laneHeight: number): number;

    TONE_WAVEFORM_OPTIONS: ToneWaveform[];

    formatMidiMapNoteLabelsBlock(noteLabels: NoteLabelPair[]): string[];
    buildMidiMapDefaultLabels(pitches: number[], labelMode?: MidiMapLabelMode | string): NoteLabelPair[];
    buildMidiMapExpression(options: MidiMapExpressionOptions): string;
    parseMidiMapNoteLabelsFromExpression(expression: string): NoteLabelPair[] | null;
    prepareMidiMapExpression(
        comp: CompItem,
        sourceLayer: Layer,
        options?: MidiMapOptions
    ): MidiMapPrepared;
    regenerateMidiMapExpression(state: MidiMapState, labelMode?: MidiMapLabelMode | string): string;
    createMidiMapTextLayer(
        comp: CompItem,
        sourceLayer: Layer | null,
        expression: string
    ): MidiMapTextLayerResult;

    resolveToneLayerOptions(comp: CompItem | null, options?: ToneLayerOptionsInput): ToneLayerOptionsResolved;
    buildToneLayerKeyframePlan(notes: PianoRollNote[], options?: ToneLayerOptionsResolved): ToneKeyframePlan;
    createToneLayer(comp: CompItem, sourceLayer: Layer, options?: ToneLayerOptionsInput): ToneLayerResult;

    resolveScreenFlipTargetProperty(comp: CompItem, axis: string): Property;
    applyScreenFlip(comp: CompItem, axis: string, options?: MidiActionOptionsInput): ScreenFlipResult;
    bakeScreenFlip(comp: CompItem, axis: string, options?: MidiActionOptionsInput): ScreenFlipResult;

    resolveDrumSourceLayer(comp: CompItem, options?: MidiActionOptionsInput): Layer;
    resolveDrumMachineSourceLayers(comp: CompItem, options?: DrumMachineOptionsInput): Layer[];
    resolveDrumMachineSourceLayer(comp: CompItem, options?: DrumMachineOptionsInput): Layer;
    drumMachineColorForPitch(pitch: number): number[];
    buildDrumMachineColorMap(pitches: number[]): StringKeyedMap<number[]>;
    resolveDrumMachineOptions(
        comp: CompItem | null,
        options: DrumMachineOptionsInput | null | undefined,
        sourceLayer: Layer | null | undefined
    ): DrumMachineOptionsResolved;
    collectDrumMachineNotes(sourceLayer: Layer, options?: DrumMachineOptionsInput): PianoRollNote[];
    collectDrumMachinePitchGroups(sourceLayer: Layer, options?: DrumMachineOptionsInput): DrumPadGroup[];
    collectDrumMachinePitchGroupsFromLayers(
        sourceLayers: Layer | Layer[],
        options?: DrumMachineOptionsInput
    ): DrumPadGroup[];
    buildDrumMachineGridRects(
        pitchGroups: DrumPadGroup[],
        comp: CompItem | null,
        options?: DrumMachineOptionsInput | DrumMachineOptionsResolved
    ): DrumMachineRect[];
    computeDrumMachineGridCenter(rects: DrumMachineRect[]): GridCenter;
    buildDrumMachineRects(
        sourceLayerOrLayers: Layer | Layer[],
        comp: CompItem | null,
        options?: DrumMachineOptionsInput
    ): DrumMachineRect[];
    buildDrumMachinePadExpression(options?: DrumMachinePadExpressionOptions): string;
    buildDrumMachineHitExpression(options?: DrumMachinePadExpressionOptions): string;
    buildDrumMachineExpression(options?: DrumMachinePadExpressionOptions): string;
    buildDrumMachineMultiSourcePumpExpression(options?: DrumMachinePadExpressionOptions): string;
    createDrumMachineShapes(
        comp: CompItem,
        sourceLayerOrLayers: Layer | Layer[],
        options?: DrumMachineOptionsInput
    ): DrumMachineShapesResult;
    createDrumMachineShapesWithExpression(
        comp: CompItem,
        sourceLayer: Layer | Layer[],
        options?: DrumMachineOptionsInput
    ): DrumMachineShapesResult;
    createDrumMachineShapesWithBake(
        comp: CompItem,
        sourceLayer: Layer | Layer[],
        options?: DrumMachineOptionsInput
    ): DrumMachineShapesResult;

    frameRangeForPadIndex(index: number, padCount: number, totalFrames: number | string): DrumSequencerFrameRange;
    parseDrumSequencerTotalFrames(value: number | string): number;
    formatDrumSequencerFrameMapBlock(frameEntries: DrumSequencerFrameEntry[]): string[];
    formatDrumSequencerFrameListBlock(frameEntries: DrumSequencerFrameEntry[]): string[];
    buildDrumSequencerExpression(options?: DrumSequencerExpressionOptions): string;
    parseDrumSequencerFrameMapFromExpression(expression: string): DrumSequencerFrameEntry[] | null;
    prepareDrumSequencerExpression(
        comp: CompItem,
        sourceLayer: Layer,
        options?: DrumSequencerOptions
    ): DrumSequencerPrepared;
    regenerateDrumSequencerExpression(state: DrumSequencerState, expression: string): string;
    resolveTargetFootageLayer(comp: CompItem): Layer;
    applyDrumSequencerToLayer(
        comp: CompItem,
        targetLayer: Layer,
        expression: string
    ): DrumSequencerApplyResult;

    [key: string]: unknown;
}
