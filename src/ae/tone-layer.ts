(function (api: ReOmMIDIApi) {
    api.TONE_WAVEFORM_OPTIONS = ["Sine", "Triangle", "Saw", "Square", "White Noise"];

    var TONE_FREQUENCY_PROPERTY_NAMES = ["Frequency 1", "Frequency 2", "Frequency 3", "Frequency 4", "Frequency 5"];

    function numeric(value: string | number | null | undefined, fallback: number): number {
        var parsed = parseFloat(String(value === null || typeof value === "undefined" ? "" : value));
        return isNaN(parsed) ? fallback : parsed;
    }

    function clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    function toneEffectProperty(effect: PropContainerLike | null, names: string | string[]): PropContainerLike | null {
        var i: number;
        var prop: PropContainerLike | null;
        var nameList: string[];
        if (!effect) {
            return null;
        }
        if (typeof names === "string") {
            nameList = [names];
        } else {
            nameList = names;
        }
        for (i = 0; i < nameList.length; i += 1) {
            prop = api.safeProperty(effect, nameList[i]);
            if (prop) {
                return prop;
            }
        }
        return null;
    }

    function toneWaveformValue(label: ToneWaveform | string): number {
        var i: number;
        for (i = 0; i < api.TONE_WAVEFORM_OPTIONS.length; i += 1) {
            if (api.TONE_WAVEFORM_OPTIONS[i] === label) {
                return i + 1;
            }
        }
        return 1;
    }

    api.resolveToneLayerOptions = function (
        comp: CompItem | null,
        options?: ToneLayerOptionsInput
    ): ToneLayerOptionsResolved {
        var resolved: ToneLayerOptionsResolved;
        var input = options || {};
        resolved = {
            waveform: input.waveform || "Sine",
            level: clamp(numeric(input.level, 20), 0, 100),
            quantizeToFrames: !!input.quantizeToFrames,
            useWorkArea: !!input.useWorkArea,
            useDrumLanes: typeof input.useDrumLanes === "undefined" ? true : !!input.useDrumLanes,
            frameDuration: comp && comp.frameDuration ? comp.frameDuration : input.frameDuration
        };
        if (resolved.useWorkArea && comp && typeof comp.workAreaStart !== "undefined") {
            resolved.timeStart = comp.workAreaStart;
            resolved.timeEnd = comp.workAreaStart + comp.workAreaDuration;
        } else if (typeof input.timeStart !== "undefined") {
            resolved.timeStart = input.timeStart;
        }
        if (!resolved.useWorkArea && typeof input.timeEnd !== "undefined") {
            resolved.timeEnd = input.timeEnd;
        }
        return resolved;
    };

    function quantizeToneTime(time: number, options: ToneLayerOptionsResolved): number {
        if (options && options.quantizeToFrames) {
            return api.quantizeTimeToFrame(time, options.frameDuration);
        }
        return time;
    }

    function pushToneSeriesPoint(
        series: KeyframeSeries,
        time: number,
        value: number,
        options: ToneLayerOptionsResolved
    ): void {
        time = quantizeToneTime(time, options);
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

    function activePitchFromMap(activeNotes: StringKeyedMap<boolean>): number | null {
        var pitch: string;
        var bestPitch: number | null = null;
        for (pitch in activeNotes) {
            if (!activeNotes.hasOwnProperty(pitch)) {
                continue;
            }
            if (bestPitch === null || Number(pitch) > bestPitch) {
                bestPitch = Number(pitch);
            }
        }
        return bestPitch;
    }

    interface ToneEvent {
        time: number;
        type: "on" | "off";
        pitch: number;
    }

    function compareToneEvents(a: ToneEvent, b: ToneEvent): number {
        if (a.time !== b.time) {
            return a.time - b.time;
        }
        if (a.type === b.type) {
            return a.pitch - b.pitch;
        }
        return a.type === "off" ? -1 : 1;
    }

    api.buildToneLayerKeyframePlan = function (
        notes: PianoRollNote[],
        options?: ToneLayerOptionsResolved
    ): ToneKeyframePlan {
        var events: ToneEvent[] = [];
        var activeNotes: StringKeyedMap<boolean> = {};
        var frequency: KeyframeSeries = { times: [0], values: [0] };
        var level: KeyframeSeries = { times: [0], values: [0] };
        var levelScale = clamp(numeric(options && options.level, 20), 0, 100);
        var i: number;
        var note: PianoRollNote;
        var event: ToneEvent;
        var active: number | null;
        var freqValue: number;
        var levelValue: number;
        var resolved = options || ({} as ToneLayerOptionsResolved);

        notes = notes || [];

        for (i = 0; i < notes.length; i += 1) {
            note = notes[i];
            if (!note || note.velocity <= 0) {
                continue;
            }
            events.push({
                time: note.time,
                type: "on",
                pitch: Math.round(note.pitch)
            });
            events.push({
                time: note.time + (note.duration > 0 ? note.duration : 0.05),
                type: "off",
                pitch: Math.round(note.pitch)
            });
        }

        events.sort(compareToneEvents);

        for (i = 0; i < events.length; i += 1) {
            event = events[i];
            if (event.type === "on") {
                activeNotes[String(event.pitch)] = true;
            } else {
                delete activeNotes[String(event.pitch)];
            }
            active = activePitchFromMap(activeNotes);
            if (active !== null) {
                freqValue = api.frequencyForPitch(active);
                levelValue = levelScale;
            } else {
                freqValue = frequency.values[frequency.values.length - 1] || 0;
                levelValue = 0;
            }
            pushToneSeriesPoint(frequency, event.time, freqValue, resolved);
            pushToneSeriesPoint(level, event.time, levelValue, resolved);
        }

        return {
            frequency: frequency,
            level: level
        };
    };

    function applyToneSeries(property: PropContainerLike | null, series: KeyframeSeries): boolean {
        var prop = property as Property | null;
        if (!prop || !series || !series.times.length) {
            return false;
        }
        prop.setValuesAtTimes(series.times, series.values);
        api.setHoldInterpolation(prop);
        return true;
    }

    function addToneEffect(layer: Layer): PropContainerLike | null {
        var effect: PropContainerLike | null;
        var added: PropContainerLike | PropertyGroup | null;
        var effectsLayer: LayerWithEffects | null;
        effectsLayer = api.asLayerWithEffects(layer);
        if (!effectsLayer || !effectsLayer.Effects || !effectsLayer.Effects.addProperty) {
            return null;
        }
        try {
            added = effectsLayer.Effects.addProperty("ADBE Aud Tone");
            effect = api.isPropContainerLike(added) ? added : null;
        } catch (e) {
            try {
                added = effectsLayer.Effects.addProperty("Tone");
                effect = api.isPropContainerLike(added) ? added : null;
            } catch (e2) {
                return null;
            }
        }
        if (effect) {
            effect.name = "Tone";
        }
        return effect;
    }

    function toneLayerName(sourceLayer: Layer | null): string {
        var suffix = sourceLayer && sourceLayer.name ? " " + sourceLayer.name : "";
        return api.limitEffectName("MIDI Tone" + suffix);
    }

    function applyToneKeyframePlan(
        effect: PropContainerLike | null,
        plan: ToneKeyframePlan,
        options: ToneLayerOptionsResolved
    ): boolean {
        var waveformProp: PropContainerLike | null;
        var levelProp: PropContainerLike | null;
        var i: number;
        var freqProp: PropContainerLike | null;
        if (!effect || !plan) {
            return false;
        }
        waveformProp = toneEffectProperty(effect, ["Waveform options", "Waveform Options"]);
        if (waveformProp && waveformProp.setValue) {
            waveformProp.setValue(toneWaveformValue(options.waveform));
        }
        for (i = 0; i < TONE_FREQUENCY_PROPERTY_NAMES.length; i += 1) {
            freqProp = toneEffectProperty(effect, TONE_FREQUENCY_PROPERTY_NAMES[i]);
            applyToneSeries(freqProp, plan.frequency);
        }
        levelProp = toneEffectProperty(effect, "Level");
        applyToneSeries(levelProp, plan.level);
        return true;
    }

    api.createToneLayer = function (
        comp: CompItem,
        sourceLayer: Layer,
        options?: ToneLayerOptionsInput
    ): ToneLayerResult {
        var resolved: ToneLayerOptionsResolved;
        var notes: PianoRollNote[];
        var plan: ToneKeyframePlan;
        var layer: LayerWithEffects | null;
        var effect: PropContainerLike | null;
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before creating a tone layer.");
        }
        if (!sourceLayer) {
            throw new Error("Select an imported MIDI layer before creating a tone layer.");
        }
        resolved = api.resolveToneLayerOptions(comp, options || {});
        notes = api.collectPianoRollNotesFromLayer(sourceLayer, {
            maxNotes: -1,
            useDrumLanes: resolved.useDrumLanes,
            useWorkArea: resolved.useWorkArea,
            timeStart: resolved.timeStart,
            timeEnd: resolved.timeEnd
        });
        if (!notes.length) {
            throw new Error(
                'No note keyframes were found on layer "' +
                    sourceLayer.name +
                    '". Select the null layer created by Import MIDI.'
            );
        }
        plan = api.buildToneLayerKeyframePlan(notes, resolved);
        if (!comp.layers || !comp.layers.addNull) {
            throw new Error("Could not create a null layer in the active composition.");
        }
        layer = api.asLayerWithEffects(
            comp.layers.addNull(
                Math.max(
                    comp.duration || 1,
                    plan.frequency.times.length ? plan.frequency.times[plan.frequency.times.length - 1] + 1 : 1
                )
            )
        );
        if (!layer) {
            throw new Error("Could not create a null layer in the active composition.");
        }
        layer.name = toneLayerName(sourceLayer);
        layer.comment = "MIDI tone playback\nTone effect driven by note pitch from " + sourceLayer.name + ".";
        effect = addToneEffect(layer);
        if (!effect) {
            throw new Error("Could not add the Tone audio effect to the new null layer.");
        }
        if (!applyToneKeyframePlan(effect, plan, resolved)) {
            throw new Error("Could not bake Tone effect keyframes.");
        }
        return {
            layerName: layer.name,
            notes: notes.length,
            keyframes: plan.level.times.length
        };
    };
})(ReOmMIDI);
