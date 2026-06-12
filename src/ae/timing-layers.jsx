/* global ReOmMIDI, CompItem */
(function (api) {
    function resolveTimingLayerOptions(comp, options) {
        options = options || {};
        return {
            quantizeToFrames: !!options.quantizeToFrames,
            frameDuration: comp && comp.frameDuration ? comp.frameDuration : options.frameDuration
        };
    }

    function quantizeTimingTime(time, options) {
        if (options && options.quantizeToFrames) {
            return api.quantizeTimeToFrame(time, options.frameDuration);
        }
        return time;
    }

    function pushTimingKey(series, time, value, options) {
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

    function normalizeTimeSignatures(midi) {
        var signatures = [];
        var i;
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

    function maxMidiEndTick(midi) {
        var maxTick = 0;
        var i;
        var note;
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

    function ticksPerBeatForSignature(midi, signature) {
        if (!midi.ticksPerBeat || !signature || !signature.denominator) {
            return midi.ticksPerBeat || 480;
        }
        return (midi.ticksPerBeat * 4) / signature.denominator;
    }

    function buildBpmSeries(midi, options) {
        var bpmSeries = { times: [], values: [] };
        var tempoEvents = [];
        var i;
        var event;
        var changeTime;

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

    api.buildMetronomeSignatureSeries = function (midi, options) {
        var signatures = normalizeTimeSignatures(midi);
        var xSeries = { times: [], values: [] };
        var ySeries = { times: [], values: [] };
        var i;
        var signature;
        var changeTime;

        if (!midi || !midi.isMidi) {
            return { x: xSeries, y: ySeries };
        }

        options = resolveTimingLayerOptions(null, options);
        for (i = 0; i < signatures.length; i += 1) {
            signature = signatures[i];
            changeTime = midi.secondsAtTick(signature.ticks);
            pushTimingKey(xSeries, changeTime, signature.numerator, options);
            pushTimingKey(ySeries, changeTime, signature.denominator, options);
        }

        return { x: xSeries, y: ySeries };
    };

    api.buildMetronomeSeries = function (midi, options) {
        return api.buildMetronomeSignatureSeries(midi, options).x;
    };

    api.buildBeatBarSeries = function (midi, options) {
        var signatures = normalizeTimeSignatures(midi);
        var endTick = maxMidiEndTick(midi);
        var beatSeries = { times: [], values: [] };
        var barSeries = { times: [], values: [] };
        var barIndex = 1;
        var beatInBar = 0;
        var s;
        var sig;
        var nextSigTick;
        var segmentEnd;
        var tick;
        var ticksPerBeat;
        var beatTime;

        if (!midi || !midi.isMidi) {
            return { beat: beatSeries, bar: barSeries, bpm: buildBpmSeries(midi, options) };
        }

        options = resolveTimingLayerOptions(null, options);
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
                pushTimingKey(beatSeries, beatTime, beatInBar, options);
                if (beatInBar === 1) {
                    pushTimingKey(barSeries, beatTime, barIndex, options);
                }
                tick += ticksPerBeat;
            }
        }

        return { beat: beatSeries, bar: barSeries, bpm: buildBpmSeries(midi, options) };
    };

    function applySliderSeries(layer, sliderName, series) {
        var property;
        if (!series.times.length) {
            return false;
        }
        property = api.addSliderControl(layer, api.limitEffectName(sliderName));
        property.setValuesAtTimes(series.times, series.values);
        api.setHoldInterpolation(property);
        return true;
    }

    api.createMetronomeLayer = function (comp, midi, options) {
        var resolved;
        var signatureSeries;
        var layer;

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

    api.createBpmLayer = function (comp, midi, options) {
        var resolved;
        var beatBarSeries;
        var layer;

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
