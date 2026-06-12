/* global ReOmMIDI */
(function (api) {
    api.quantizeTimeToFrame = function (time, frameDuration) {
        if (!frameDuration || frameDuration <= 0) {
            return time;
        }
        return Math.round(time / frameDuration) * frameDuration;
    };

    function normalizeOptions(comp, options) {
        options = options || {};
        if (!options.layerMode) {
            options.layerMode = "per-channel";
        }
        if (!options.layerNamePrefix) {
            options.layerNamePrefix = "MIDI";
        }
        if (typeof options.importNamedDrumSliders === "undefined") {
            options.importNamedDrumSliders = true;
        }
        options.frameDuration = comp && comp.frameDuration ? comp.frameDuration : options.frameDuration;
        return options;
    }

    function pushKey(series, time, value, options) {
        if (options.quantizeToFrames) {
            time = api.quantizeTimeToFrame(time, options.frameDuration);
        }

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

    function applySeries(layer, sliderName, series) {
        var property;
        if (!series.times.length) {
            return;
        }
        property = api.addSliderControl(layer, api.limitEffectName(sliderName));
        property.setValuesAtTimes(series.times, series.values);
        api.setHoldInterpolation(property);
    }

    function channelHasEvents(channel, includeControllers, includePitchBends) {
        var controller;
        if (channel.noteEvents.length || channel.notes.length) {
            return true;
        }
        if (includePitchBends && channel.pitchBends.length) {
            return true;
        }
        if (includeControllers) {
            for (controller in channel.controllers) {
                if (channel.controllers.hasOwnProperty(controller) && channel.controllers[controller].length) {
                    return true;
                }
            }
        }
        return false;
    }

    function collectChannels(midi, options) {
        var channels = [];
        var i;
        for (i = 0; i < midi.channels.length; i += 1) {
            if (
                midi.channels[i] &&
                channelHasEvents(midi.channels[i], options.includeControllers, options.includePitchBends)
            ) {
                channels.push(midi.channels[i]);
            }
        }
        return channels;
    }

    function applyNamedDrumSliders(channel, layer, options) {
        var byPitch = {};
        var pitchOrder = [];
        var i;
        var note;
        var pitchKey;
        var series;

        if (!options.importNamedDrumSliders || !api.isDrumChannel(channel.midiChannel)) {
            return;
        }

        for (i = 0; i < channel.notes.length; i += 1) {
            note = channel.notes[i];
            pitchKey = String(note.pitch);
            if (!byPitch[pitchKey]) {
                byPitch[pitchKey] = {
                    pitch: note.pitch,
                    drumName: note.drumName || api.getDrumName(note.pitch),
                    times: [],
                    values: []
                };
                pitchOrder.push(note.pitch);
            }
            series = byPitch[pitchKey];
            pushKey(series, note.time, note.velocity, options);
            if (typeof note.offTime !== "undefined") {
                pushKey(series, note.offTime, 0, options);
            }
        }

        pitchOrder.sort(function (a, b) {
            return a - b;
        });

        for (i = 0; i < pitchOrder.length; i += 1) {
            series = byPitch[String(pitchOrder[i])];
            applySeries(layer, api.formatDrumEffectName(channel, series.pitch, series.drumName), series);
        }
    }

    function applyChannelToLayer(channel, layer, options) {
        var pitch = { times: [], values: [] };
        var velocity = { times: [0], values: [0] };
        var duration = { times: [], values: [] };
        var i;
        var note;
        var controller;
        var cc;
        var bend = { times: [], values: [] };

        for (i = 0; i < channel.noteEvents.length; i += 1) {
            note = channel.noteEvents[i];
            if (note.velocity <= 0) {
                continue;
            }
            pushKey(pitch, note.time, note.pitch, options);
            pushKey(velocity, note.time, note.velocity, options);
        }

        for (i = 0; i < channel.notes.length; i += 1) {
            note = channel.notes[i];
            if (typeof note.duration !== "undefined") {
                pushKey(duration, note.time, note.duration, options);
            }
        }

        applySeries(layer, api.formatStandardEffectName(channel, "pitch"), pitch);
        applySeries(layer, api.formatStandardEffectName(channel, "velocity"), velocity);
        applySeries(layer, api.formatStandardEffectName(channel, "duration"), duration);
        applyNamedDrumSliders(channel, layer, options);

        if (options.includeControllers) {
            for (controller in channel.controllers) {
                if (channel.controllers.hasOwnProperty(controller)) {
                    cc = { times: [], values: [] };
                    for (i = 0; i < channel.controllers[controller].length; i += 1) {
                        pushKey(
                            cc,
                            channel.controllers[controller][i].time,
                            channel.controllers[controller][i].value,
                            options
                        );
                    }
                    applySeries(layer, api.formatStandardEffectName(channel, "CC " + controller), cc);
                }
            }
        }

        if (options.includePitchBends) {
            for (i = 0; i < channel.pitchBends.length; i += 1) {
                pushKey(bend, channel.pitchBends[i].time, channel.pitchBends[i].value, options);
            }
            applySeries(layer, api.formatStandardEffectName(channel, "pitch bend"), bend);
        }
    }

    function createLayer(comp, midi, channel, options) {
        var layer = comp.layers.addNull(Math.max(midi.durationSeconds + 1, comp.duration || 1));
        var name = channel ? api.formatChannelName(channel) : "ReOm MIDI";
        layer.name = api.sanitizeName(options.layerNamePrefix + " " + name);
        layer.comment =
            "Imported by ReOm MIDI " +
            api.VERSION +
            "\nFile: " +
            midi.filePath +
            "\nNotes: " +
            midi.notes.length +
            "\nDuration: " +
            midi.durationSeconds.toFixed(3) +
            "s" +
            "\nTiming: " +
            (options.quantizeToFrames ? "quantized to comp frames" : "exact MIDI event times");
        return layer;
    }

    api.importMidiToComp = function (comp, midi, options, progress) {
        options = normalizeOptions(comp, options);
        var channels = collectChannels(midi, options);
        var layer;
        var i;
        var cancelled = false;
        var imported = 0;

        if (options.layerMode === "combined") {
            layer = createLayer(comp, midi, null, options);
            for (i = 0; i < channels.length; i += 1) {
                if (
                    progress &&
                    !progress("Importing channel " + (i + 1) + " of " + channels.length, i / channels.length)
                ) {
                    cancelled = true;
                    break;
                }
                applyChannelToLayer(channels[i], layer, options);
                imported += 1;
            }
        } else {
            for (i = 0; i < channels.length; i += 1) {
                if (
                    progress &&
                    !progress("Importing channel " + (i + 1) + " of " + channels.length, i / channels.length)
                ) {
                    cancelled = true;
                    break;
                }
                layer = createLayer(comp, midi, channels[i], options);
                applyChannelToLayer(channels[i], layer, options);
                imported += 1;
            }
        }

        if (progress) {
            if (cancelled) {
                progress("Cancelled", imported / Math.max(channels.length, 1));
            } else {
                progress("Done", 1);
            }
        }
        if (cancelled) {
            return { cancelled: true, imported: imported };
        }
        return channels.length;
    };
})(ReOmMIDI);
