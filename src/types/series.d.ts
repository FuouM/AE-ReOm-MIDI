/** Parallel time/value arrays used for slider keyframe baking. */
interface KeyframeSeries {
    times: number[];
    values: number[];
}

/** Beat, bar, and tempo slider series derived from MIDI timing. */
interface BeatBarSeries {
    beat: KeyframeSeries;
    bar: KeyframeSeries;
    bpm: KeyframeSeries;
}

/** Metronome time-signature numerator (x) and denominator (y) series. */
interface MetronomeSignatureSeries {
    x: KeyframeSeries;
    y: KeyframeSeries;
}
