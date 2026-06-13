(function (api: ReOmMIDIApi) {
    function resolveTimingLayerOptions(
        comp: CompItem | null,
        options?: TimingLayerOptions
    ): ResolvedTimingLayerOptions {
        var input = options || {};
        return {
            quantizeToFrames: !!input.quantizeToFrames,
            frameDuration: comp && comp.frameDuration ? comp.frameDuration : input.frameDuration
        };
    }

    function quantizeTimingTime(time: number, options: ResolvedTimingLayerOptions): number {
        if (options && options.quantizeToFrames) {
            return api.quantizeTimeToFrame(time, options.frameDuration);
        }
        return time;
    }

    function pushTimingKey(
        series: KeyframeSeries,
        time: number,
        value: number,
        options: ResolvedTimingLayerOptions
    ): void {
        time = quantizeTimingTime(time, options);
        if (series.times.length && time === series.times[series.times.length - 1]) {
            series.values[series.values.length - 1] = value;
            return;
        }
        if (!options.quantizeToFrames && series.times.length && time <= series.times[series.times.length - 1]) {
            time = series.times[series.times.length - 1] + api.KEYFRAME_EPSILON;
        }
        series.times.push(time);
        series.values.push(value);
    }

    function normalizeTimeSignatures(midi: MidiFileData | null | undefined): TimeSignatureEvent[] {
        var signatures: TimeSignatureEvent[] = [];
        var i: number;
        if (!midi || !midi.timeSignatures) {
            return [{ ticks: 0, numerator: 4, denominator: 4 }];
        }
        for (i = 0; i < midi.timeSignatures.length; i += 1) {
            signatures.push(midi.timeSignatures[i]);
        }
        signatures.sort(function (a, b) {
            return a.ticks - b.ticks;
        });
        if (!signatures.length) {
            signatures.push({ ticks: 0, numerator: 4, denominator: 4 });
        }
        return signatures;
    }

    function maxMidiEndTick(midi: MidiFileData | null | undefined): number {
        var maxTick = 0;
        var i: number;
        var note: MidiNote;
        if (!midi || !midi.notes) {
            return 0;
        }
        for (i = 0; i < midi.notes.length; i += 1) {
            note = midi.notes[i];
            if (note.ticks > maxTick) {
                maxTick = note.ticks;
            }
            if (typeof note.offTicks === "number" && note.offTicks > maxTick) {
                maxTick = note.offTicks;
            }
        }
        return maxTick;
    }

    function ticksPerBeatForSignature(midi: MidiFileData, signature: TimeSignatureEvent): number {
        if (!midi.ticksPerBeat || !signature || !signature.denominator) {
            return midi.ticksPerBeat || 480;
        }
        return (midi.ticksPerBeat * 4) / signature.denominator;
    }

    function buildBpmSeries(
        midi: MidiFileData | null | undefined,
        options: ResolvedTimingLayerOptions
    ): KeyframeSeries {
        var bpmSeries: KeyframeSeries = { times: [], values: [] };
        var tempoEvents: TempoEvent[] = [];
        var i: number;
        var event: TempoEvent;
        var changeTime: number;

        if (!midi || !midi.isMidi) {
            return bpmSeries;
        }

        for (i = 0; i < midi.tempoEvents.length; i += 1) {
            tempoEvents.push(midi.tempoEvents[i]);
        }
        tempoEvents.sort(function (a, b) {
            return a.ticks - b.ticks;
        });
        if (!tempoEvents.length) {
            tempoEvents.push({ ticks: 0, microsecondsPerQuarter: 500000 });
        }

        for (i = 0; i < tempoEvents.length; i += 1) {
            event = tempoEvents[i];
            changeTime = midi.secondsAtTick(event.ticks);
            pushTimingKey(bpmSeries, changeTime, api.tempoToBpm(event.microsecondsPerQuarter), options);
        }

        return bpmSeries;
    }

    api.buildMetronomeSignatureSeries = function (
        midi: MidiFileData,
        options?: TimingLayerOptions
    ): MetronomeSignatureSeries {
        var signatures = normalizeTimeSignatures(midi);
        var xSeries: KeyframeSeries = { times: [], values: [] };
        var ySeries: KeyframeSeries = { times: [], values: [] };
        var i: number;
        var signature: TimeSignatureEvent;
        var changeTime: number;
        var resolved: ResolvedTimingLayerOptions;

        if (!midi || !midi.isMidi) {
            return { x: xSeries, y: ySeries };
        }

        resolved = resolveTimingLayerOptions(null, options);
        for (i = 0; i < signatures.length; i += 1) {
            signature = signatures[i];
            changeTime = midi.secondsAtTick(signature.ticks);
            pushTimingKey(xSeries, changeTime, signature.numerator, resolved);
            pushTimingKey(ySeries, changeTime, signature.denominator, resolved);
        }

        return { x: xSeries, y: ySeries };
    };

    api.buildMetronomeSeries = function (midi: MidiFileData, options?: TimingLayerOptions): KeyframeSeries {
        return api.buildMetronomeSignatureSeries(midi, options).x;
    };

    api.buildBeatBarSeries = function (midi: MidiFileData, options?: TimingLayerOptions): BeatBarSeries {
        var signatures = normalizeTimeSignatures(midi);
        var endTick = maxMidiEndTick(midi);
        var beatSeries: KeyframeSeries = { times: [], values: [] };
        var barSeries: KeyframeSeries = { times: [], values: [] };
        var barIndex = 1;
        var beatInBar = 0;
        var s: number;
        var sig: TimeSignatureEvent;
        var nextSigTick: number;
        var segmentEnd: number;
        var tick: number;
        var ticksPerBeat: number;
        var beatTime: number;
        var resolved: ResolvedTimingLayerOptions;

        if (!midi || !midi.isMidi) {
            return {
                beat: beatSeries,
                bar: barSeries,
                bpm: buildBpmSeries(midi, resolveTimingLayerOptions(null, options))
            };
        }

        resolved = resolveTimingLayerOptions(null, options);
        for (s = 0; s < signatures.length; s += 1) {
            sig = signatures[s];
            if (s > 0) {
                barIndex += 1;
                beatInBar = 1;
            }
            nextSigTick = s + 1 < signatures.length ? signatures[s + 1].ticks : endTick + 1;
            segmentEnd = Math.min(nextSigTick, endTick + 1);
            ticksPerBeat = ticksPerBeatForSignature(midi, sig);
            if (ticksPerBeat <= 0) {
                continue;
            }
            tick = sig.ticks;
            while (tick < segmentEnd) {
                beatTime = midi.secondsAtTick(tick);
                if (beatTime > midi.durationSeconds + 0.0001) {
                    break;
                }
                if (beatInBar === 0) {
                    beatInBar = 1;
                } else if (tick > sig.ticks) {
                    beatInBar += 1;
                    if (beatInBar > sig.numerator) {
                        beatInBar = 1;
                        barIndex += 1;
                    }
                }
                pushTimingKey(beatSeries, beatTime, beatInBar, resolved);
                if (beatInBar === 1) {
                    pushTimingKey(barSeries, beatTime, barIndex, resolved);
                }
                tick += ticksPerBeat;
            }
        }

        return { beat: beatSeries, bar: barSeries, bpm: buildBpmSeries(midi, resolved) };
    };

    function applySliderSeries(layer: Layer, sliderName: string, series: KeyframeSeries): boolean {
        var property: Property;
        if (!series.times.length) {
            return false;
        }
        property = api.addSliderControl(layer, api.limitEffectName(sliderName));
        property.setValuesAtTimes(series.times, series.values);
        api.setHoldInterpolation(property);
        return true;
    }

    api.createMetronomeLayer = function (
        comp: CompItem,
        midi: MidiFileData,
        options?: TimingLayerOptions
    ): MetronomeLayerResult {
        var resolved: ResolvedTimingLayerOptions;
        var signatureSeries: MetronomeSignatureSeries;
        var layer: Layer;

        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before creating a metronome layer.");
        }
        if (!midi || !midi.isMidi) {
            throw new Error("The selected file is not a Standard MIDI file.");
        }

        resolved = resolveTimingLayerOptions(comp, options);
        signatureSeries = api.buildMetronomeSignatureSeries(midi, resolved);
        if (!signatureSeries.x.times.length || !signatureSeries.y.times.length) {
            throw new Error("No time signature data was found in the MIDI file.");
        }

        layer = comp.layers.addNull(Math.max(midi.durationSeconds + 1, comp.duration || 1));
        layer.name = api.limitEffectName("MIDI Metronome");
        layer.comment =
            "Time signature as X/Y sliders from MIDI\nFile: " +
            (midi.filePath || "") +
            "\nX = numerator, Y = denominator" +
            "\nTime signature changes: " +
            signatureSeries.x.times.length +
            "\nTiming: " +
            (resolved.quantizeToFrames ? "quantized to comp frames" : "exact MIDI times");

        if (!applySliderSeries(layer, "X", signatureSeries.x)) {
            throw new Error("Could not bake time signature numerator (X) slider keyframes.");
        }
        if (!applySliderSeries(layer, "Y", signatureSeries.y)) {
            throw new Error("Could not bake time signature denominator (Y) slider keyframes.");
        }

        return {
            layerName: layer.name,
            signatureChanges: signatureSeries.x.times.length,
            keyframes: signatureSeries.x.times.length
        };
    };

    api.createBpmLayer = function (comp: CompItem, midi: MidiFileData, options?: TimingLayerOptions): BpmLayerResult {
        var resolved: ResolvedTimingLayerOptions;
        var beatBarSeries: BeatBarSeries;
        var layer: Layer;

        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before creating a BPM layer.");
        }
        if (!midi || !midi.isMidi) {
            throw new Error("The selected file is not a Standard MIDI file.");
        }

        resolved = resolveTimingLayerOptions(comp, options);
        beatBarSeries = api.buildBeatBarSeries(midi, resolved);
        if (!beatBarSeries.beat.times.length || !beatBarSeries.bar.times.length || !beatBarSeries.bpm.times.length) {
            throw new Error("No beat timing could be derived from the MIDI file.");
        }

        layer = comp.layers.addNull(Math.max(midi.durationSeconds + 1, comp.duration || 1));
        layer.name = api.limitEffectName("MIDI BPM");
        layer.comment =
            "Beat, bar, and tempo sliders from MIDI timing\nFile: " +
            (midi.filePath || "") +
            "\nBeat = beat index in bar, Bar = bar index, BPM = tempo in beats per minute" +
            "\nBeat keyframes: " +
            beatBarSeries.beat.times.length +
            "\nTempo changes: " +
            beatBarSeries.bpm.times.length +
            "\nTiming: " +
            (resolved.quantizeToFrames ? "quantized to comp frames" : "exact MIDI beat times");

        if (!applySliderSeries(layer, "Beat", beatBarSeries.beat)) {
            throw new Error("Could not bake Beat slider keyframes.");
        }
        if (!applySliderSeries(layer, "Bar", beatBarSeries.bar)) {
            throw new Error("Could not bake Bar slider keyframes.");
        }
        if (!applySliderSeries(layer, "BPM", beatBarSeries.bpm)) {
            throw new Error("Could not bake BPM slider keyframes.");
        }

        return {
            layerName: layer.name,
            beats: beatBarSeries.beat.times.length,
            tempoChanges: beatBarSeries.bpm.times.length,
            keyframes: beatBarSeries.beat.times.length
        };
    };
})(ReOmMIDI);
