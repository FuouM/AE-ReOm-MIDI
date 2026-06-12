/* global ReOmMIDI, CompItem, KeyframeInterpolationType */
(function (api) {
    function numeric(value, fallback) {
        var parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
    }

    function quote(text) {
        return JSON.stringify(String(text || ""));
    }

    function parseMaxNotes(value, fallback) {
        var parsed = numeric(value, fallback);
        if (parsed < 0) {
            return -1;
        }
        return Math.max(1, Math.floor(parsed));
    }

    function parsePitchFilter(value) {
        var parts;
        var result = [];
        var i;
        var n;
        if (value === null || typeof value === "undefined") {
            return [];
        }
        if (typeof value === "number") {
            return [Math.round(value)];
        }
        if (typeof value === "object" && value.length !== undefined) {
            for (i = 0; i < value.length; i += 1) {
                n = parseInt(value[i], 10);
                if (!isNaN(n)) {
                    result.push(n);
                }
            }
            return result;
        }
        parts = String(value || "")
            .replace(/^\s+|\s+$/g, "")
            .split(/[,\s]+/);
        for (i = 0; i < parts.length; i += 1) {
            if (!parts[i]) {
                continue;
            }
            n = parseInt(parts[i], 10);
            if (!isNaN(n)) {
                result.push(n);
            }
        }
        return result;
    }

    function pitchMatchesFilter(pitch, filter) {
        var i;
        if (!filter || !filter.length) {
            return true;
        }
        pitch = Math.round(pitch);
        for (i = 0; i < filter.length; i += 1) {
            if (filter[i] === pitch) {
                return true;
            }
        }
        return false;
    }

    function midiChannelFromLayer(layer) {
        var prefix = api.channelPrefixFromLayer(layer);
        var match;
        if (prefix) {
            match = String(prefix).match(/Ch(\d{2})/i);
            if (match) {
                return parseInt(match[1], 10) - 1;
            }
        }
        match = String((layer && layer.name) || "").match(/Ch(\d{1,2})/i);
        if (match) {
            return parseInt(match[1], 10) - 1;
        }
        return -1;
    }

    function layerHasDrumNotes(layer) {
        var notes;
        var i;
        notes = api.collectPianoRollNotesFromLayer(layer, { maxNotes: 1, useDrumLanes: true });
        for (i = 0; i < notes.length; i += 1) {
            if (notes[i].isDrum) {
                return true;
            }
        }
        return false;
    }

    function layerIsDrumMidiLayer(layer) {
        var channel;
        var name;

        if (!layer) {
            return false;
        }
        channel = midiChannelFromLayer(layer);
        name = String(layer.name || "");
        if (api.isDrumChannel(channel) || /Drums/i.test(name) || /Ch10/i.test(name)) {
            return true;
        }
        return layerHasDrumNotes(layer);
    }

    api.resolveDrumSourceLayer = function (comp, options) {
        var layer;

        layer = api.resolveMidiSourceLayer(comp, options || {});
        if (layerIsDrumMidiLayer(layer)) {
            return layer;
        }

        throw new Error(
            'Selected layer "' +
                layer.name +
                '" is not a drum MIDI layer. Select an imported MIDI channel 10 (Drums) null layer.'
        );
    };

    function normalizeDrumMachineSourceLayers(sourceLayerOrLayers) {
        var layers = sourceLayerOrLayers;
        if (!layers) {
            return [];
        }
        if (layers.length !== undefined && layers[0] && layers[0].name) {
            return layers;
        }
        return [layers];
    }

    api.resolveDrumMachineSourceLayers = function (comp, options) {
        var selected = api.getCompSelectedLayers(comp);
        var imported = [];
        var i;
        var layer;

        options = options || {};
        for (i = 0; i < selected.length; i += 1) {
            if (api.isMidiImportSourceLayer(selected[i])) {
                imported.push(selected[i]);
            }
        }

        if (imported.length > 1) {
            for (i = 0; i < imported.length; i += 1) {
                if (api.layerHasNamedDrumSliders(imported[i])) {
                    throw new Error(
                        "Select one drum layer with named sliders, or select multiple non-drum MIDI layers for per-layer drum machine."
                    );
                }
            }
            return imported;
        }

        if (imported.length === 1) {
            api.rememberMidiActionSourceLayer(imported[0]);
            return imported;
        }

        layer = api.resolveMidiSourceLayer(comp, options);
        return [layer];
    };

    api.resolveDrumMachineSourceLayer = function (comp, options) {
        return api.resolveDrumMachineSourceLayers(comp, options || {})[0];
    };

    api.drumMachineColorForPitch = function (pitch) {
        var hue = ((Math.round(pitch) * 47) % 360) / 360;
        var sat = 0.72;
        var val = 0.88;
        var i = Math.floor(hue * 6);
        var f = hue * 6 - i;
        var p = val * (1 - sat);
        var q = val * (1 - f * sat);
        var t = val * (1 - (1 - f) * sat);
        var r;
        var g;
        var b;

        switch (i % 6) {
            case 0:
                r = val;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = val;
                b = p;
                break;
            case 2:
                r = p;
                g = val;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = val;
                break;
            case 4:
                r = t;
                g = p;
                b = val;
                break;
            default:
                r = val;
                g = p;
                b = q;
                break;
        }
        return [r, g, b];
    };

    api.buildDrumMachineColorMap = function (pitches) {
        var map = {};
        var i;
        var pitch;
        pitches = pitches || [];
        for (i = 0; i < pitches.length; i += 1) {
            pitch = Math.round(pitches[i]);
            if (!map[pitch]) {
                map[pitch] = api.drumMachineColorForPitch(pitch);
            }
        }
        return map;
    };

    api.resolveDrumMachineOptions = function (comp, options, sourceLayer) {
        var resolved = {};
        options = options || {};
        resolved.maxNotes = options.maxNotes;
        resolved.squareSize = options.squareSize || options.noteHeight || 20;
        resolved.useWorkArea = !!options.useWorkArea;
        resolved.limitNotes = options.limitNotes !== false;
        resolved.pitchFilter = parsePitchFilter(options.pitchFilter);
        resolved.animateScale = options.animateScale !== false;
        resolved.animateOpacity = options.animateOpacity !== false;
        resolved.animateRotation = !!options.animateRotation;
        resolved.falloff = options.falloff || "linear";
        resolved.duration = options.duration || "0.2";
        resolved.amountScale = typeof options.amountScale !== "undefined" ? options.amountScale : "100";
        resolved.amountOpacity = typeof options.amountOpacity !== "undefined" ? options.amountOpacity : "100";
        resolved.amountRotation = typeof options.amountRotation !== "undefined" ? options.amountRotation : "90";
        resolved.baseScale = typeof options.baseScale !== "undefined" ? options.baseScale : "0";
        resolved.baseOpacity = typeof options.baseOpacity !== "undefined" ? options.baseOpacity : "0";
        resolved.baseRotation = typeof options.baseRotation !== "undefined" ? options.baseRotation : "0";
        resolved.useExpression = options.useExpression !== false;
        resolved.sourceLayerName = sourceLayer ? sourceLayer.name : options.sourceLayerName;
        if (resolved.useWorkArea && comp && typeof comp.workAreaStart !== "undefined") {
            resolved.timeStart = comp.workAreaStart;
            resolved.timeEnd = comp.workAreaStart + comp.workAreaDuration;
        }
        return resolved;
    };

    function drumMachineCollectOptions(sourceLayer, options, discoverAllTypes) {
        var collectOptions = {};
        var key;

        options = options || {};
        for (key in options) {
            if (options.hasOwnProperty(key)) {
                collectOptions[key] = options[key];
            }
        }
        collectOptions.useDrumLanes = true;
        if (discoverAllTypes) {
            collectOptions.maxNotes = -1;
            collectOptions.limitNotes = false;
        } else {
            collectOptions.maxNotes = options.limitNotes === false ? -1 : parseMaxNotes(options.maxNotes, -1);
        }
        return collectOptions;
    }

    function collectDrumMachinePitchModeNotes(sourceLayer, options) {
        var notes;
        var filtered = [];
        var i;
        var note;

        if (layerIsDrumMidiLayer(sourceLayer)) {
            return api.collectDrumHitNotesFromLayer(sourceLayer, options);
        }

        notes = api.collectPianoRollNotesFromLayer(sourceLayer, options);
        for (i = 0; i < notes.length; i += 1) {
            note = notes[i];
            if (note.velocity > 0 && Math.round(note.pitch) > 0) {
                filtered.push(note);
            }
        }
        return filtered;
    }

    api.collectDrumMachineNotes = function (sourceLayer, options) {
        var notes;
        var drumNotes = [];
        var maxNotes;
        var i;
        var note;

        options = drumMachineCollectOptions(sourceLayer, options, false);
        notes = collectDrumMachinePitchModeNotes(sourceLayer, options);
        maxNotes = options.limitNotes === false ? -1 : parseMaxNotes(options.maxNotes, -1);

        for (i = 0; i < notes.length; i += 1) {
            note = notes[i];
            if (!pitchMatchesFilter(note.pitch, options.pitchFilter)) {
                continue;
            }
            if (options.useWorkArea && typeof options.timeStart !== "undefined") {
                if (note.time < options.timeStart || note.time >= options.timeEnd) {
                    continue;
                }
            }
            drumNotes.push(note);
            if (maxNotes >= 0 && drumNotes.length >= maxNotes) {
                break;
            }
        }

        for (i = 0; i < drumNotes.length; i += 1) {
            drumNotes[i].index = i + 1;
        }
        return drumNotes;
    };

    api.collectDrumMachinePitchGroups = function (sourceLayer, options) {
        var notes;
        var groups = {};
        var order = [];
        var result = [];
        var collectOptions;
        var i;
        var note;
        var pitch;
        var group;

        options = options || {};

        if (api.layerHasNamedDrumSliders(sourceLayer)) {
            return api.collectNamedDrumPadGroupsFromLayer(sourceLayer, options);
        }

        collectOptions = drumMachineCollectOptions(sourceLayer, options, true);
        notes = collectDrumMachinePitchModeNotes(sourceLayer, collectOptions);
        for (i = 0; i < notes.length; i += 1) {
            note = notes[i];
            if (!pitchMatchesFilter(note.pitch, options && options.pitchFilter)) {
                continue;
            }
            if (
                options &&
                options.useWorkArea &&
                typeof options.timeStart !== "undefined" &&
                (note.time < options.timeStart || note.time >= options.timeEnd)
            ) {
                continue;
            }
            pitch = Math.round(note.pitch);
            if (!groups[pitch]) {
                groups[pitch] = {
                    pitch: pitch,
                    label: note.label || api.getDrumName(pitch),
                    effectName: "",
                    hits: []
                };
                order.push(pitch);
            }
            groups[pitch].hits.push({
                time: note.time,
                duration: note.duration,
                velocity: note.velocity
            });
        }
        order.sort(function (a, b) {
            return a - b;
        });
        for (i = 0; i < order.length; i += 1) {
            group = groups[order[i]];
            if (group.hits.length > 0) {
                result.push(group);
            }
        }
        return result;
    };

    function collectDrumMachineLayerInstrumentGroups(layers, options) {
        var result = [];
        var collectOptions;
        var notes;
        var hits;
        var i;
        var j;
        var layer;
        var note;

        options = options || {};
        for (i = 0; i < layers.length; i += 1) {
            layer = layers[i];
            collectOptions = drumMachineCollectOptions(layer, options, true);
            notes = collectDrumMachinePitchModeNotes(layer, collectOptions);
            hits = [];
            for (j = 0; j < notes.length; j += 1) {
                note = notes[j];
                if (
                    options.useWorkArea &&
                    typeof options.timeStart !== "undefined" &&
                    (note.time < options.timeStart || note.time >= options.timeEnd)
                ) {
                    continue;
                }
                hits.push({
                    time: note.time,
                    duration: note.duration,
                    velocity: note.velocity
                });
            }
            hits.sort(function (a, b) {
                return a.time - b.time;
            });
            if (hits.length > 0) {
                result.push({
                    pitch: i + 1,
                    layerIndex: i,
                    label: layer.name,
                    effectName: "",
                    hits: hits,
                    layerInstrument: true,
                    sourceRefs: [
                        {
                            sourceLayerName: layer.name,
                            pitchSliderName: api.resolvePitchSliderName(layer, options)
                        }
                    ]
                });
            }
        }
        return result;
    }

    api.collectDrumMachinePitchGroupsFromLayers = function (sourceLayers, options) {
        var layers = normalizeDrumMachineSourceLayers(sourceLayers);

        if (!layers.length) {
            return [];
        }
        if (layers.length === 1) {
            return api.collectDrumMachinePitchGroups(layers[0], options);
        }

        return collectDrumMachineLayerInstrumentGroups(layers, options);
    };

    api.buildDrumMachineGridRects = function (pitchGroups, comp, options) {
        var rects = [];
        var squareSize;
        var gap;
        var margin;
        var cols;
        var i;
        var group;
        var col;
        var row;
        var cell;

        pitchGroups = pitchGroups || [];
        if (!pitchGroups.length) {
            return rects;
        }

        squareSize = numeric(options.squareSize, 20);
        gap = numeric(options.gridGap, 12);
        margin = numeric(options.gridMargin, 80);
        cols = Math.max(1, Math.ceil(Math.sqrt(pitchGroups.length)));

        for (i = 0; i < pitchGroups.length; i += 1) {
            group = pitchGroups[i];
            col = i % cols;
            row = Math.floor(i / cols);
            cell = squareSize + gap;
            rects.push({
                index: rects.length + 1,
                pitch: group.pitch,
                label: group.label,
                effectName: group.effectName || "",
                hits: group.hits,
                hitCount: group.hits.length,
                sourceRefs: group.sourceRefs || [],
                x: margin + col * cell + squareSize / 2,
                y: margin + row * cell + squareSize / 2,
                width: squareSize,
                height: squareSize,
                color: api.drumMachineColorForPitch(
                    typeof group.layerIndex !== "undefined" ? group.layerIndex : group.pitch
                ),
                layerInstrument: !!group.layerInstrument,
                time: 0,
                duration: 0,
                velocity: 100,
                isDrum: true
            });
        }
        return rects;
    };

    function computeDrumMachineGridCenter(rects) {
        var minX = Infinity;
        var maxX = -Infinity;
        var minY = Infinity;
        var maxY = -Infinity;
        var i;
        var rect;
        var halfW;
        var halfH;

        rects = rects || [];
        if (!rects.length) {
            return { x: 0, y: 0 };
        }
        for (i = 0; i < rects.length; i += 1) {
            rect = rects[i];
            halfW = (rect.width || 0) / 2;
            halfH = (rect.height || 0) / 2;
            minX = Math.min(minX, rect.x - halfW);
            maxX = Math.max(maxX, rect.x + halfW);
            minY = Math.min(minY, rect.y - halfH);
            maxY = Math.max(maxY, rect.y + halfH);
        }
        return {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2
        };
    }

    api.computeDrumMachineGridCenter = computeDrumMachineGridCenter;

    api.buildDrumMachineRects = function (sourceLayerOrLayers, comp, options) {
        var sourceLayers = normalizeDrumMachineSourceLayers(sourceLayerOrLayers);
        var pitchGroups;

        if (!sourceLayers.length) {
            return [];
        }
        options = api.resolveDrumMachineOptions(comp, options || {}, sourceLayers[0]);
        pitchGroups = api.collectDrumMachinePitchGroupsFromLayers(sourceLayers, options);
        return api.buildDrumMachineGridRects(pitchGroups, comp, options);
    };

    function drumMachineFalloffRuntime() {
        return [
            "function falloffFactor(t, hitTime, duration, mode) {",
            '    if (mode === "instant") { return (t < hitTime + thisComp.frameDuration ? 1 : 0); }',
            '    if (mode === "exponential") {',
            "        return Math.pow(1 - Math.min(Math.max((t - hitTime) / duration, 0), 1), 3);",
            "    }",
            '    if (mode === "ease") { return ease(t, hitTime, hitTime + duration, 1, 0); }',
            "    return linear(t, hitTime, hitTime + duration, 1, 0);",
            "}",
            "function fitPropertyValue(result) {",
            "    var dims = 1;",
            "    var out = [];",
            "    var i;",
            "    try {",
            '        if (value && value.length !== undefined && typeof value !== "string") {',
            "            dims = value.length;",
            "        }",
            "    } catch (e) {}",
            "    if (dims <= 1) {",
            '        if (result && result.length !== undefined && typeof result !== "string") {',
            "            return result.length ? result[0] : 0;",
            "        }",
            "        return result;",
            "    }",
            '    if (typeof result === "number" && !isNaN(result)) {',
            "        for (i = 0; i < dims; i++) { out[i] = result; }",
            "        return out;",
            "    }",
            '    if (result && result.length !== undefined && typeof result !== "string") {',
            "        for (i = 0; i < dims; i++) {",
            "            out[i] = i < result.length ? result[i] : result[result.length - 1];",
            "        }",
            "        return out;",
            "    }",
            "    return result;",
            "}"
        ].join("\n");
    }

    function drumMachineExpressionLiteral(value, fallback) {
        return String(numeric(value, fallback));
    }

    function resolveDrumMachinePadBaseLiteral(options, fallback) {
        var value;
        options = options || {};
        if (typeof options.baseValue !== "undefined") {
            value = options.baseValue;
        } else if (typeof options.base !== "undefined") {
            value = options.base;
        } else {
            return drumMachineExpressionLiteral(fallback, fallback);
        }
        return drumMachineExpressionLiteral(value, fallback);
    }

    function resolveDrumMachinePadAmountLiteral(options, fallback) {
        var value;
        options = options || {};
        if (typeof options.amount !== "undefined") {
            value = options.amount;
        } else if (typeof options.amountValue !== "undefined") {
            value = options.amountValue;
        } else {
            return drumMachineExpressionLiteral(fallback, fallback);
        }
        return drumMachineExpressionLiteral(value, fallback);
    }

    api.buildDrumMachinePadExpression = function (options) {
        options = options || {};
        var duration = numeric(options.duration, 0.2);
        var base = resolveDrumMachinePadBaseLiteral(options, 0);
        var amount = resolveDrumMachinePadAmountLiteral(options, 100);
        var falloff = options.falloff || "linear";
        var label = options.label || options.drumEffectName || "Drum pad";

        return [
            "// Generated by ReOm MIDI Drum Machine",
            "// " + label,
            "var midiLayer = thisComp.layer(" + quote(options.sourceLayerName || "MIDI") + ");",
            "var drumEffectName = " + quote(options.drumEffectName || "") + ";",
            drumMachineFalloffRuntime(),
            "function drumSlider() {",
            '    try { return midiLayer.effect(drumEffectName)("Slider"); } catch (e) { return null; }',
            "}",
            "function lastKeyAtOrBefore(prop, t) {",
            "    if (!prop || prop.numKeys < 1) { return 0; }",
            "    var n = prop.nearestKey(t).index;",
            "    if (prop.key(n).time > t) { n--; }",
            "    return n;",
            "}",
            "function latestDrumHit(t) {",
            "    var s = drumSlider();",
            "    var n;",
            "    if (!s) { return null; }",
            "    n = lastKeyAtOrBefore(s, t);",
            "    while (n >= 1) {",
            "        if (s.key(n).value > 0) {",
            "            return { time: s.key(n).time, amount: s.key(n).value / 100 };",
            "        }",
            "        n--;",
            "    }",
            "    return null;",
            "}",
            "function addDelta(base, delta) {",
            '    if (base && base.length !== undefined && typeof base !== "string") {',
            "        var out = [];",
            "        var i;",
            "        for (i = 0; i < base.length; i++) { out[i] = base[i] + delta; }",
            "        return out;",
            "    }",
            "    return base + delta;",
            "}",
            "try {",
            "    var duration = " + duration + ";",
            "    var hit = latestDrumHit(time);",
            "    var base = " + base + ";",
            "    var amount = " + amount + ";",
            "    var result = base;",
            "    if (hit && time <= hit.time + duration) {",
            "        result = addDelta(base, amount * falloffFactor(time, hit.time, duration, " +
                quote(falloff) +
                "));",
            "    }",
            "    fitPropertyValue(result);",
            "} catch (e) { value; }"
        ].join("\n");
    };

    api.buildDrumMachineHitExpression = function (options) {
        options = options || {};
        var hitTime = numeric(options.hitTime, 0);
        var duration = numeric(options.duration, 0.2);
        var base = resolveDrumMachinePadBaseLiteral(options, 0);
        var amount = resolveDrumMachinePadAmountLiteral(options, 100);
        var falloff = options.falloff || "linear";
        var label = options.label || "Drum hit";

        return [
            "// Generated by ReOm MIDI Drum Machine",
            "// " + label + " at " + hitTime.toFixed(4) + "s",
            drumMachineFalloffRuntime(),
            "try {",
            "    var hitTime = " + hitTime + ";",
            "    var duration = " + duration + ";",
            "    var base = " + base + ";",
            "    var amount = " + amount + ";",
            "    var result = base;",
            "    if (time >= hitTime && time <= hitTime + duration) {",
            "        result = base + amount * falloffFactor(time, hitTime, duration, " + quote(falloff) + ");",
            "    }",
            "    fitPropertyValue(result);",
            "} catch (e) { value; }"
        ].join("\n");
    };

    api.buildDrumMachineExpression = function (options) {
        return api.buildDrumMachineHitExpression(options || {});
    };

    api.buildDrumMachineMultiSourcePumpExpression = function (options) {
        var sourceRefs = options.sourceRefs || [];
        var pitchFilter = options.pitchFilter || [];
        var targetPitch = pitchFilter.length ? Math.round(pitchFilter[0]) : 0;
        var falloff = options.falloff || "linear";
        var base = resolveDrumMachinePadBaseLiteral(options, 0);
        var amount = resolveDrumMachinePadAmountLiteral(options, 100);
        var duration = numeric(options.duration, 0.2);
        var lines = [];
        var i;
        var ref;

        lines.push("// Generated by ReOm MIDI Drum Machine");
        lines.push("// Multi-source pitch pad for MIDI note " + targetPitch);
        for (i = 0; i < sourceRefs.length; i += 1) {
            ref = sourceRefs[i];
            lines.push("var midiLayer" + i + " = thisComp.layer(" + quote(ref.sourceLayerName || "MIDI") + ");");
            lines.push("var pitchSliderName" + i + " = " + quote(ref.pitchSliderName || "pitch") + ";");
        }
        lines.push(drumMachineFalloffRuntime());
        lines.push("function lastKeyAtOrBefore(prop, t) {");
        lines.push("    if (!prop || prop.numKeys < 1) { return 0; }");
        lines.push("    var n = prop.nearestKey(t).index;");
        lines.push("    if (prop.key(n).time > t) { n--; }");
        lines.push("    return n;");
        lines.push("}");
        lines.push("function latestPitchHitForLayer(layer, sliderName, t, pitch) {");
        lines.push('    try { var s = layer.effect(sliderName)("Slider"); } catch (e) { return null; }');
        lines.push("    var n = lastKeyAtOrBefore(s, t);");
        lines.push("    var value;");
        lines.push("    while (n >= 1) {");
        lines.push("        value = Math.round(s.key(n).value);");
        lines.push("        if (value === pitch) {");
        lines.push("            return { time: s.key(n).time, amount: 1 };");
        lines.push("        }");
        lines.push("        n--;");
        lines.push("    }");
        lines.push("    return null;");
        lines.push("}");
        lines.push("function latestHit(t) {");
        lines.push("    var best = null;");
        lines.push("    var hit;");
        for (i = 0; i < sourceRefs.length; i += 1) {
            lines.push(
                "    hit = latestPitchHitForLayer(midiLayer" +
                    i +
                    ", pitchSliderName" +
                    i +
                    ", t, " +
                    targetPitch +
                    ");"
            );
            lines.push("    if (hit && (!best || hit.time > best.time)) { best = hit; }");
        }
        lines.push("    return best;");
        lines.push("}");
        lines.push("try {");
        lines.push("    var duration = " + duration + ";");
        lines.push("    var hit = latestHit(time);");
        lines.push("    var base = " + base + ";");
        lines.push("    var result = base;");
        lines.push("    if (hit && time <= hit.time + duration) {");
        lines.push(
            "        result = base + " + amount + " * falloffFactor(time, hit.time, duration, " + quote(falloff) + ");"
        );
        lines.push("    }");
        lines.push("    fitPropertyValue(result);");
        lines.push("} catch (e) { value; }");
        return lines.join("\n");
    };

    function drumMachineControllerName(sourceLayerOrLayers) {
        var layers = normalizeDrumMachineSourceLayers(sourceLayerOrLayers);
        if (!layers.length) {
            return api.sanitizeName("MIDI Drum Machine MIDI");
        }
        if (layers.length === 1) {
            return api.sanitizeName("MIDI Drum Machine " + layers[0].name);
        }
        return api.sanitizeName("MIDI Drum Machine " + layers.length + " layers");
    }

    function safeProperty(group, nameOrIndex) {
        if (!group || !group.property) {
            return null;
        }
        try {
            return group.property(nameOrIndex);
        } catch (e) {
            return null;
        }
    }

    function findLayerTransformProp(layer, matchName) {
        var transform = safeProperty(layer, "ADBE Transform Group");
        return safeProperty(transform, matchName);
    }

    function setLayerExpression(prop, expression) {
        if (!prop || !prop.canSetExpression) {
            return false;
        }
        prop.expression = expression;
        prop.expressionEnabled = true;
        return true;
    }

    function applyBakePlan(property, plan) {
        var i;
        if (!property) {
            return false;
        }
        if (property.setValuesAtTimes) {
            property.setValuesAtTimes(plan.times, plan.values);
        } else if (property.setValueAtTime) {
            for (i = 0; i < plan.times.length; i += 1) {
                property.setValueAtTime(plan.times[i], plan.values[i]);
            }
        } else {
            return false;
        }
        if (property.canSetExpression) {
            property.expressionEnabled = false;
        }
        return true;
    }

    function drumMachineTriggersFromRect(rect) {
        var triggers = [];
        var hits = rect.hits || [];
        var i;
        for (i = 0; i < hits.length; i += 1) {
            triggers.push({
                time: hits[i].time,
                amount: 1
            });
        }
        return triggers;
    }

    function drumMachineActionOptions(rect, options, baseValue, amountValue) {
        var baseLiteral = drumMachineExpressionLiteral(baseValue, 0);
        var amountLiteral = drumMachineExpressionLiteral(amountValue, 100);
        var sourceRefs = rect.sourceRefs || [];
        var sourceLayerName = options.sourceLayerName;
        var pitchSliderName = options.pitchSliderName;
        if (rect.effectName) {
            return {
                sourceLayerName: options.sourceLayerName,
                drumEffectName: rect.effectName,
                baseValue: baseLiteral,
                amount: amountLiteral,
                duration: String(options.duration || "0.2"),
                falloff: options.falloff || "linear",
                label: rect.label || rect.effectName
            };
        }
        if (sourceRefs.length === 1) {
            sourceLayerName = sourceRefs[0].sourceLayerName;
            pitchSliderName = sourceRefs[0].pitchSliderName;
        }
        if (rect.layerInstrument) {
            return {
                sourceLayerName: sourceLayerName,
                pitchSliderName: pitchSliderName,
                pitchFilter: [],
                preset: "pump",
                baseValue: baseLiteral,
                amount: amountLiteral,
                duration: String(options.duration || "0.2"),
                falloff: options.falloff || "linear",
                label: rect.label || sourceLayerName
            };
        }
        return {
            sourceLayerName: sourceLayerName,
            pitchSliderName: pitchSliderName,
            pitchFilter: [rect.pitch],
            preset: "pump",
            baseValue: baseLiteral,
            amount: amountLiteral,
            duration: String(options.duration || "0.2"),
            falloff: options.falloff || "linear",
            multiSource: sourceRefs.length > 1,
            sourceRefs: sourceRefs
        };
    }

    function setDrumMachinePropertyExpression(prop, actionOptions) {
        if (actionOptions.drumEffectName) {
            return setLayerExpression(prop, api.buildDrumMachinePadExpression(actionOptions));
        }
        if (actionOptions.multiSource && actionOptions.sourceRefs && actionOptions.sourceRefs.length > 1) {
            return setLayerExpression(prop, api.buildDrumMachineMultiSourcePumpExpression(actionOptions));
        }
        return setLayerExpression(prop, api.buildPumpExpression(actionOptions));
    }

    function bakeDrumTypeProperty(property, comp, rect, options, baseValue, amountValue) {
        var plan;
        var triggers = drumMachineTriggersFromRect(rect);
        var bakeOptions;

        if (!triggers.length) {
            return false;
        }
        bakeOptions = {
            preset: "pump",
            baseValue: drumMachineExpressionLiteral(baseValue, 0),
            amount: drumMachineExpressionLiteral(amountValue, 100),
            duration: String(options.duration || "0.2"),
            falloff: options.falloff || "linear",
            frameDuration: comp && comp.frameDuration ? comp.frameDuration : 1 / 24
        };
        plan = api.buildMidiActionBakePlan(triggers, property, comp, bakeOptions);
        return applyBakePlan(property, plan);
    }

    function applyDrumMachineAnimation(layer, comp, rect, options) {
        var scaleProp;
        var opacityProp;
        var rotationProp;
        var actionOptions;
        var applied = 0;

        if (options.animateScale) {
            scaleProp = findLayerTransformProp(layer, "ADBE Scale");
            if (scaleProp) {
                if (options.useExpression) {
                    actionOptions = drumMachineActionOptions(rect, options, options.baseScale, options.amountScale);
                    if (setDrumMachinePropertyExpression(scaleProp, actionOptions)) {
                        applied += 1;
                    }
                } else if (
                    bakeDrumTypeProperty(scaleProp, comp, rect, options, options.baseScale, options.amountScale)
                ) {
                    applied += 1;
                }
            }
        }

        if (options.animateOpacity) {
            opacityProp = findLayerTransformProp(layer, "ADBE Opacity");
            if (opacityProp) {
                if (options.useExpression) {
                    actionOptions = drumMachineActionOptions(rect, options, options.baseOpacity, options.amountOpacity);
                    if (setDrumMachinePropertyExpression(opacityProp, actionOptions)) {
                        applied += 1;
                    }
                } else if (
                    bakeDrumTypeProperty(opacityProp, comp, rect, options, options.baseOpacity, options.amountOpacity)
                ) {
                    applied += 1;
                }
            }
        }

        if (options.animateRotation) {
            rotationProp = findLayerTransformProp(layer, "ADBE Rotate Z");
            if (rotationProp) {
                if (options.useExpression) {
                    actionOptions = drumMachineActionOptions(
                        rect,
                        options,
                        options.baseRotation,
                        options.amountRotation
                    );
                    if (setDrumMachinePropertyExpression(rotationProp, actionOptions)) {
                        applied += 1;
                    }
                } else if (
                    bakeDrumTypeProperty(
                        rotationProp,
                        comp,
                        rect,
                        options,
                        options.baseRotation,
                        options.amountRotation
                    )
                ) {
                    applied += 1;
                }
            }
        }

        return applied;
    }

    function setDrumMachineLayerTransformValue(layer, matchName, value) {
        var prop = findLayerTransformProp(layer, matchName);
        if (prop && prop.setValue) {
            prop.setValue(value);
            return true;
        }
        return false;
    }

    function positionDrumMachineControllerNull(layer, center) {
        if (!layer || !center) {
            return false;
        }
        setDrumMachineLayerTransformValue(layer, "ADBE Anchor Point", [0, 0]);
        return setDrumMachineLayerTransformValue(layer, "ADBE Position", [center.x, center.y]);
    }

    function createDrumMachineControllerNull(comp, sourceLayer, options, sourceLabel, gridCenter) {
        var controllerInfo;
        var controllerOptions;
        var label;
        var key;
        if (!api.createPianoRollControllerNull) {
            return null;
        }
        controllerOptions = { includeFillControls: false };
        options = options || {};
        for (key in options) {
            if (options.hasOwnProperty(key)) {
                controllerOptions[key] = options[key];
            }
        }
        controllerInfo = api.createPianoRollControllerNull(comp, sourceLayer, controllerOptions);
        if (controllerInfo && controllerInfo.layer) {
            label = sourceLabel || (sourceLayer && sourceLayer.name ? sourceLayer.name : "MIDI");
            controllerInfo.layer.comment =
                "Drum machine controller\nParent for generated drum pads.\nAdjust stroke and master opacity for all pads.\nSource: " +
                label;
            if (gridCenter) {
                positionDrumMachineControllerNull(controllerInfo.layer, gridCenter);
            }
        }
        return controllerInfo;
    }

    api.createDrumMachineShapes = function (comp, sourceLayerOrLayers, options) {
        var sourceLayers = normalizeDrumMachineSourceLayers(sourceLayerOrLayers);
        var primaryLayer = sourceLayers[0];
        var resolved;
        var rects;
        var controllerInfo;
        var controllerLayer;
        var created = 0;
        var animated = 0;
        var totalHits = 0;
        var sourceLabel;
        var i;
        var noteStyle;

        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before creating drum machine shapes.");
        }
        if (!primaryLayer) {
            throw new Error("Select an imported MIDI layer before creating drum machine shapes.");
        }

        resolved = api.resolveDrumMachineOptions(comp, options || {}, primaryLayer);
        if (sourceLayers.length === 1 && !api.layerHasNamedDrumSliders(primaryLayer)) {
            resolved.pitchSliderName = api.resolvePitchSliderName(primaryLayer, options || {});
        }
        rects = api.buildDrumMachineRects(sourceLayers, comp, resolved);
        sourceLabel =
            sourceLayers.length === 1
                ? primaryLayer.name
                : sourceLayers
                      .map(function (layer) {
                          return layer.name;
                      })
                      .join(", ");
        if (!rects.length) {
            throw new Error(
                "No drum hits were found on " +
                    (sourceLayers.length === 1 ? 'layer "' + sourceLabel + '"' : "selected layers") +
                    "." +
                    (resolved.useWorkArea ? " Try disabling work area limit." : "") +
                    (resolved.pitchFilter && resolved.pitchFilter.length ? " Check the drum pitch filter." : "")
            );
        }

        resolved.controllerName = drumMachineControllerName(sourceLayers);
        controllerInfo = createDrumMachineControllerNull(
            comp,
            primaryLayer,
            resolved,
            sourceLabel,
            computeDrumMachineGridCenter(rects)
        );
        controllerLayer = controllerInfo && controllerInfo.layer ? controllerInfo.layer : null;

        for (i = 0; i < rects.length; i += 1) {
            noteStyle = api.createShapeRectLayer(comp, rects[i]);
            if (noteStyle && noteStyle.layer) {
                created += 1;
                noteStyle.layer.name =
                    "Drum " +
                    api.pad2(rects[i].index) +
                    " " +
                    api.sanitizeName(rects[i].label) +
                    (rects[i].layerInstrument ? "" : " (" + rects[i].pitch + ")");
                noteStyle.layer.comment =
                    "Drum machine pad" +
                    (rects[i].layerInstrument ? "\nlayer instrument" : "\npitch: " + rects[i].pitch) +
                    "\nlabel: " +
                    rects[i].label +
                    (rects[i].effectName ? "\neffect: " + rects[i].effectName : "") +
                    "\nhits: " +
                    rects[i].hitCount;
                if (controllerLayer) {
                    try {
                        noteStyle.layer.parent = controllerLayer;
                    } catch (parentErr) {}
                }
                if (controllerInfo && controllerInfo.effects) {
                    if (api.wireShapeStrokeFromController) {
                        api.wireShapeStrokeFromController(noteStyle.layer, controllerInfo.effects);
                    }
                    if (api.wireShapeMasterOpacityFromController) {
                        api.wireShapeMasterOpacityFromController(noteStyle.layer, controllerInfo.effects);
                    }
                }
                animated += applyDrumMachineAnimation(noteStyle.layer, comp, rects[i], resolved);
                totalHits += rects[i].hitCount || 0;
            }
        }

        return {
            created: created,
            types: rects.length,
            hits: totalHits,
            animated: animated,
            controller: controllerInfo && controllerInfo.name ? controllerInfo.name : "",
            mode: resolved.useExpression ? "expression" : "bake"
        };
    };

    api.createDrumMachineShapesWithExpression = function (comp, sourceLayer, options) {
        options = options || {};
        options.useExpression = true;
        return api.createDrumMachineShapes(comp, sourceLayer, options);
    };

    api.createDrumMachineShapesWithBake = function (comp, sourceLayer, options) {
        options = options || {};
        options.useExpression = false;
        return api.createDrumMachineShapes(comp, sourceLayer, options);
    };
})(ReOmMIDI);
