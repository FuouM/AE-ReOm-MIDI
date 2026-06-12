/* global ReOmMIDI, CompItem, KeyframeInterpolationType */
(function (api) {
    api.TONE_WAVEFORM_OPTIONS = ["Sine", "Triangle", "Saw", "Square", "White Noise"];

    var TONE_FREQUENCY_PROPERTY_NAMES = ["Frequency 1", "Frequency 2", "Frequency 3", "Frequency 4", "Frequency 5"];

    function numeric(value, fallback) {
        var parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function safeProperty(group, nameOrIndex) {
        var prop;
        if (!group || !group.property) {
            return null;
        }
        try {
            prop = group.property(nameOrIndex);
            return prop || null;
        } catch (e) {
            return null;
        }
    }

    function toneEffectProperty(effect, names) {
        var i;
        var prop;
        if (!effect) {
            return null;
        }
        if (typeof names === "string") {
            names = [names];
        }
        for (i = 0; i < names.length; i += 1) {
            prop = safeProperty(effect, names[i]);
            if (prop) {
                return prop;
            }
        }
        return null;
    }

    function toneWaveformValue(label) {
        var i;
        for (i = 0; i < api.TONE_WAVEFORM_OPTIONS.length; i += 1) {
            if (api.TONE_WAVEFORM_OPTIONS[i] === label) {
                return i + 1;
            }
        }
        return 1;
    }

    api.resolveToneLayerOptions = function (comp, options) {
        var resolved = {};
        options = options || {};
        resolved.waveform = options.waveform || "Sine";
        resolved.level = clamp(numeric(options.level, 20), 0, 100);
        resolved.quantizeToFrames = !!options.quantizeToFrames;
        resolved.useWorkArea = !!options.useWorkArea;
        resolved.useDrumLanes = typeof options.useDrumLanes === "undefined" ? true : !!options.useDrumLanes;
        resolved.frameDuration = comp && comp.frameDuration ? comp.frameDuration : options.frameDuration;
        if (resolved.useWorkArea && comp && typeof comp.workAreaStart !== "undefined") {
            resolved.timeStart = comp.workAreaStart;
            resolved.timeEnd = comp.workAreaStart + comp.workAreaDuration;
        } else if (typeof options.timeStart !== "undefined") {
            resolved.timeStart = options.timeStart;
        }
        if (!resolved.useWorkArea && typeof options.timeEnd !== "undefined") {
            resolved.timeEnd = options.timeEnd;
        }
        return resolved;
    };

    function quantizeToneTime(time, options) {
        if (options && options.quantizeToFrames) {
            return api.quantizeTimeToFrame(time, options.frameDuration);
        }
        return time;
    }

    function pushToneSeriesPoint(series, time, value, options) {
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

    function activePitchFromMap(activeNotes) {
        var pitch;
        var bestPitch = null;
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

    function compareToneEvents(a, b) {
        if (a.time !== b.time) {
            return a.time - b.time;
        }
        if (a.type === b.type) {
            return a.pitch - b.pitch;
        }
        return a.type === "off" ? -1 : 1;
    }

    api.buildToneLayerKeyframePlan = function (notes, options) {
        var events = [];
        var activeNotes = {};
        var frequency = { times: [0], values: [0] };
        var level = { times: [0], values: [0] };
        var levelScale = clamp(numeric(options && options.level, 20), 0, 100);
        var i;
        var note;
        var event;
        var active;
        var freqValue;
        var levelValue;

        notes = notes || [];
        options = options || {};

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
            pushToneSeriesPoint(frequency, event.time, freqValue, options);
            pushToneSeriesPoint(level, event.time, levelValue, options);
        }

        return {
            frequency: frequency,
            level: level
        };
    };

    function applyToneSeries(property, series) {
        if (!property || !series || !series.times.length) {
            return false;
        }
        property.setValuesAtTimes(series.times, series.values);
        api.setHoldInterpolation(property);
        return true;
    }

    function addToneEffect(layer) {
        var effect;
        if (!layer || !layer.Effects || !layer.Effects.addProperty) {
            return null;
        }
        try {
            effect = layer.Effects.addProperty("ADBE Aud Tone");
        } catch (e) {
            try {
                effect = layer.Effects.addProperty("Tone");
            } catch (e2) {
                return null;
            }
        }
        if (effect) {
            effect.name = "Tone";
        }
        return effect;
    }

    function toneLayerName(sourceLayer) {
        var suffix = sourceLayer && sourceLayer.name ? " " + sourceLayer.name : "";
        return api.limitEffectName("MIDI Tone" + suffix);
    }

    function applyToneKeyframePlan(effect, plan, options) {
        var waveformProp;
        var levelProp;
        var i;
        var freqProp;
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

    api.createToneLayer = function (comp, sourceLayer, options) {
        var resolved;
        var notes;
        var plan;
        var layer;
        var effect;
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
        layer = comp.layers.addNull(
            Math.max(
                comp.duration || 1,
                plan.frequency.times.length ? plan.frequency.times[plan.frequency.times.length - 1] + 1 : 1
            )
        );
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
