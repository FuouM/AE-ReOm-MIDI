/** Parsed result of a MIDI variable-length quantity read. */
interface VarIntResult {
    value: number;
    consumed: number;
}

/** MIDI tempo meta-event. */
interface TempoEvent {
    ticks: number;
    microsecondsPerQuarter: number;
    time?: number;
}

/** MIDI time-signature meta-event. */
interface TimeSignatureEvent {
    ticks: number;
    numerator: number;
    denominator: number;
    metronome?: number;
    thirtySeconds?: number;
}

/** MIDI control-change event attached to a channel. */
interface MidiControllerEvent {
    ticks: number;
    controller: number;
    value: number;
    time?: number;
}

/** MIDI pitch-bend event attached to a channel. */
interface PitchBendEvent {
    ticks: number;
    value: number;
    time?: number;
}

/** MIDI program-change event attached to a channel. */
interface ProgramChangeEvent {
    ticks: number;
    program: number;
}

/** Note-on event while parsing; may gain note-off fields after pairing. */
interface MidiNote {
    ticks: number;
    trackIndex: number;
    midiChannel: number;
    channelIndex: number;
    pitch: number;
    velocity: number;
    vel?: number;
    drumName?: string;
    offTicks?: number;
    durationTicks?: number;
    time?: number;
    offTime?: number;
    duration?: number;
}

/** Aggregated MIDI channel data within a parsed file. */
interface MidiChannel {
    index: number;
    trackIndex: number;
    midiChannel: number;
    trackName: string;
    instrumentName?: string;
    notes: MidiNote[];
    noteEvents: MidiNote[];
    controllers: ControllerMap;
    pitchBends: PitchBendEvent[];
    programs: ProgramChangeEvent[];
}

/** Parsed MIDI track chunk metadata. */
interface MidiTrack {
    index: number;
    name: string;
    channels: MidiChannel[];
}

/** One segment of the tick-to-seconds conversion map. */
interface TimeSegment {
    startTick: number;
    endTick: number;
    startSeconds: number;
    secPerTick: number;
}

/** Cached tick-to-seconds lookup with segment cursor. */
interface TimeSegmentCollection {
    items: TimeSegment[];
    lastIndex?: number;
}

/** Minimal channel reference used by naming helpers in namespace.ts. */
interface MidiChannelRef {
    trackIndex: number;
    midiChannel: number;
    trackName?: string;
    instrumentName?: string;
}

/** Parsed Standard MIDI File instance produced by the MidiFile parser. */
interface MidiFileData {
    filePath: string;
    data: string;
    isMidi: boolean;
    format: number;
    trackCount: number;
    timeDivision: number;
    ticksPerBeat: number;
    framesPerSecond: number;
    ticksPerFrame: number;
    tracks: MidiTrack[];
    channels: (MidiChannel | undefined)[];
    notes: MidiNote[];
    noteEvents: MidiNote[];
    noteEventCount: number;
    tempoEvents: TempoEvent[];
    timeSignatures: TimeSignatureEvent[];
    warnings: string[];
    durationSeconds: number;
    _timeSegments?: TimeSegmentCollection | null;
    _tempoMap?: TempoEvent[] | null;
    parse(): void;
    getChannel(trackIndex: number, midiChannel: number): MidiChannel;
    parseTrack(trackIndex: number, start: number, end: number): void;
    parseMetaEvent(track: MidiTrack, ticks: number, offset: number, midiChannelPrefix: number): number;
    addNoteEvent(
        trackIndex: number,
        midiChannel: number,
        ticks: number,
        pitch: number,
        velocity: number,
        openNotes: StringKeyedMap<MidiNote[]>
    ): void;
    addController(trackIndex: number, midiChannel: number, ticks: number, controller: number, value: number): void;
    addProgram(trackIndex: number, midiChannel: number, ticks: number, program: number): void;
    addPitchBend(trackIndex: number, midiChannel: number, ticks: number, value: number): void;
    secondsAtTick(ticks: number, tempoMap?: TempoEvent[]): number;
    resolveTimes(): void;
}

/** MidiFile constructor attached to ReOmMIDI.MidiFile (ES3 `new` + static fromFile). */
interface MidiFileConstructor {
    (this: MidiFileData, data?: string, filePath?: string): void;
    new (data?: string, filePath?: string): MidiFileData;
    fromFile(filePath: string): MidiFileData;
}
