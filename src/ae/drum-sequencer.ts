(function (api: ReOmMIDIApi) {
    var MAP_BEGIN = "// --- frame map (edit below) ---";
    var MAP_END = "// --- end frame map ---";
    var LIST_BEGIN = "// --- drum frame list (edit order below) ---";
    var LIST_END = "// --- end drum frame list ---";

    function quote(value: string | number | null | undefined): string {
        value = String(value || "");
        value = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        value = value.replace(/\r/g, "\\r").replace(/\n/g, "\\n");
        return '"' + value + '"';
    }

    function joinLines(lines: string[]): string {
        return lines.join("\n");
    }

    var DEFAULT_FRAME_BLOCK_START = 11;
    var DEFAULT_FRAME_BLOCK_SIZE = 20;
    var DEFAULT_FRAME_BLOCK_GAP = 2;

    function defaultFrameRangeForIndex(index: number): DrumSequencerFrameRange {
        var startFrame = DEFAULT_FRAME_BLOCK_START + index * (DEFAULT_FRAME_BLOCK_SIZE + DEFAULT_FRAME_BLOCK_GAP);
        return {
            startFrame: startFrame,
            endFrame: startFrame + DEFAULT_FRAME_BLOCK_SIZE - 1
        };
    }

    function parseTotalFramesOption(value: number | string | null | undefined): number {
        var parsed = parseInt(String(value || "0"), 10);
        if (isNaN(parsed) || parsed < 0) {
            return 0;
        }
        return parsed;
    }

    function frameRangeForPadIndex(
        index: number,
        padCount: number,
        totalFrames: number | string
    ): DrumSequencerFrameRange {
        var baseSize: number;
        var remainder: number;
        var start: number;
        var size: number;
        var j: number;

        totalFrames = parseTotalFramesOption(totalFrames);
        if (totalFrames <= 0) {
            return defaultFrameRangeForIndex(index);
        }
        padCount = Math.max(1, Math.round(padCount || 1));
        index = Math.max(0, Math.round(index || 0));
        baseSize = Math.floor(totalFrames / padCount);
        remainder = totalFrames % padCount;
        start = 0;
        for (j = 0; j < index; j += 1) {
            start += baseSize + (j < remainder ? 1 : 0);
        }
        size = baseSize + (index < remainder ? 1 : 0);
        if (size < 1) {
            size = 1;
        }
        return {
            startFrame: start,
            endFrame: start + size - 1
        };
    }

    api.frameRangeForPadIndex = frameRangeForPadIndex;
    api.parseDrumSequencerTotalFrames = parseTotalFramesOption;

    function defaultFrameLabel(pitch: number, labelMode: MidiMapLabelMode | string): string {
        if (labelMode === "drums" && api.GM_DRUM_NAMES && api.GM_DRUM_NAMES[pitch]) {
            return api.GM_DRUM_NAMES[pitch];
        }
        if (typeof api.noteNameForPitch === "function") {
            return api.noteNameForPitch(pitch);
        }
        return String(pitch);
    }

    interface DrumSequencerFrameOptions {
        totalFrames?: number | string;
    }

    function buildDefaultFrameEntries(
        pitches: number[],
        labelMode: MidiMapLabelMode | string,
        existingByPitch: StringKeyedMap<{ startFrame: number; endFrame: number }>,
        frameOptions?: DrumSequencerFrameOptions
    ): DrumSequencerFrameEntry[] {
        var entries: DrumSequencerFrameEntry[] = [];
        var i: number;
        var pitch: number;
        var existing: { startFrame: number; endFrame: number } | undefined;
        var label: string;
        var frameRange: DrumSequencerFrameRange;
        frameOptions = frameOptions || {};
        existingByPitch = existingByPitch || {};
        for (i = 0; i < pitches.length; i += 1) {
            pitch = Math.round(pitches[i]);
            existing = existingByPitch[pitch];
            label = defaultFrameLabel(pitch, labelMode || "drums");
            if (existing) {
                entries.push({
                    pitch: pitch,
                    effectName: "",
                    startFrame: existing.startFrame,
                    endFrame: existing.endFrame,
                    label: label
                });
            } else {
                frameRange = frameRangeForPadIndex(i, pitches.length, frameOptions.totalFrames || 0);
                entries.push({
                    pitch: pitch,
                    effectName: "",
                    startFrame: frameRange.startFrame,
                    endFrame: frameRange.endFrame,
                    label: label
                });
            }
        }
        return entries;
    }

    function buildNamedFrameEntries(
        padGroups: NamedDrumPadGroup[],
        labelMode: MidiMapLabelMode | string,
        existingEntries: DrumSequencerFrameEntry[],
        frameOptions?: DrumSequencerFrameOptions
    ): DrumSequencerFrameEntry[] {
        var entries: DrumSequencerFrameEntry[] = [];
        var used: StringKeyedMap<boolean> = {};
        var byEffect: StringKeyedMap<DrumSequencerFrameEntry> = {};
        var byPitch: StringKeyedMap<DrumSequencerFrameEntry> = {};
        var i: number;
        var j: number;
        var group: NamedDrumPadGroup;
        var existing: DrumSequencerFrameEntry;
        var label: string;
        var ordered: DrumSequencerFrameEntry[] = [];
        var frameRange: DrumSequencerFrameRange;

        frameOptions = frameOptions || {};
        existingEntries = existingEntries || [];
        for (i = 0; i < existingEntries.length; i += 1) {
            existing = existingEntries[i];
            if (existing.effectName) {
                byEffect[existing.effectName] = existing;
            }
            byPitch[Math.round(existing.pitch)] = existing;
        }

        for (i = 0; i < existingEntries.length; i += 1) {
            existing = existingEntries[i];
            if (!existing.effectName) {
                continue;
            }
            for (j = 0; j < padGroups.length; j += 1) {
                if (padGroups[j].effectName === existing.effectName) {
                    group = padGroups[j];
                    used[group.effectName] = true;
                    ordered.push({
                        pitch: group.pitch,
                        effectName: group.effectName,
                        label: group.label || defaultFrameLabel(group.pitch, labelMode || "drums"),
                        startFrame: existing.startFrame,
                        endFrame: existing.endFrame
                    });
                    break;
                }
            }
        }

        for (i = 0; i < padGroups.length; i += 1) {
            group = padGroups[i];
            if (used[group.effectName]) {
                continue;
            }
            existing = byEffect[group.effectName] || byPitch[group.pitch];
            label = group.label || defaultFrameLabel(group.pitch, labelMode || "drums");
            if (existing) {
                ordered.push({
                    pitch: group.pitch,
                    effectName: group.effectName,
                    label: label,
                    startFrame: existing.startFrame,
                    endFrame: existing.endFrame
                });
            } else {
                frameRange = frameRangeForPadIndex(ordered.length, padGroups.length, frameOptions.totalFrames || 0);
                ordered.push({
                    pitch: group.pitch,
                    effectName: group.effectName,
                    label: label,
                    startFrame: frameRange.startFrame,
                    endFrame: frameRange.endFrame
                });
            }
        }

        return ordered;
    }

    function shouldPreserveDrumSequencerFrames(options: DrumSequencerOptions): boolean {
        var totalFrames = parseTotalFramesOption(options.totalFrames);
        var previousTotalFrames = parseTotalFramesOption(options.previousTotalFrames);
        if (totalFrames <= 0) {
            return true;
        }
        return totalFrames === previousTotalFrames;
    }

    function frameEntriesToMapObject(entries: DrumSequencerFrameEntry[]): StringKeyedMap<{ startFrame: number; endFrame: number }> {
        var map: StringKeyedMap<{ startFrame: number; endFrame: number }> = {};
        var i: number;
        for (i = 0; i < entries.length; i += 1) {
            map[entries[i].pitch] = {
                startFrame: entries[i].startFrame,
                endFrame: entries[i].endFrame
            };
        }
        return map;
    }

    function formatFrameMapBlock(frameEntries: DrumSequencerFrameEntry[]): string[] {
        var lines = [MAP_BEGIN, "var pitchMap = {"];
        var i: number;
        var entry: DrumSequencerFrameEntry;
        var comment: string;
        for (i = 0; i < frameEntries.length; i += 1) {
            entry = frameEntries[i];
            comment = entry.label ? " // " + entry.label : "";
            lines.push(
                "    " +
                    entry.pitch +
                    ": { startFrame: " +
                    entry.startFrame +
                    ", endFrame: " +
                    entry.endFrame +
                    " }" +
                    (i < frameEntries.length - 1 ? "," : "") +
                    comment
            );
        }
        lines.push("};");
        lines.push(MAP_END);
        return lines;
    }

    function formatDrumFrameListBlock(frameEntries: DrumSequencerFrameEntry[]): string[] {
        var lines = [LIST_BEGIN, "var drumFrameList = ["];
        var i: number;
        var entry: DrumSequencerFrameEntry;
        var comment: string;
        for (i = 0; i < frameEntries.length; i += 1) {
            entry = frameEntries[i];
            comment = " // pitch " + entry.pitch;
            if (entry.label) {
                comment += " " + entry.label;
            }
            lines.push(
                "    { effect: " +
                    quote(entry.effectName) +
                    ", startFrame: " +
                    entry.startFrame +
                    ", endFrame: " +
                    entry.endFrame +
                    " }" +
                    (i < frameEntries.length - 1 ? "," : "") +
                    comment
            );
        }
        lines.push("];");
        lines.push(LIST_END);
        return lines;
    }

    api.formatDrumSequencerFrameMapBlock = formatFrameMapBlock;
    api.formatDrumSequencerFrameListBlock = formatDrumFrameListBlock;

    function namedDrumSequencerRuntime(): string[] {
        return [
            "function sliderByName(effectName) {",
            '    try { return midiLayer.effect(effectName)("Slider"); } catch (e) { return null; }',
            "}",
            "function lastKeyAtOrBefore(prop, t) {",
            "    if (!prop || prop.numKeys < 1) { return 0; }",
            "    var n = prop.nearestKey(t).index;",
            "    if (prop.key(n).time > t) { n--; }",
            "    return n;",
            "}",
            "function noteDurationForKey(prop, n) {",
            "    var keyTime = prop.key(n).time;",
            "    var noteDuration = 0.05;",
            "    if (n < prop.numKeys) {",
            "        noteDuration = prop.key(n + 1).time - keyTime;",
            "    }",
            "    if (noteDuration <= 0) { noteDuration = 0.05; }",
            "    return noteDuration;",
            "}",
            "try {",
            "    var i;",
            "    var entry;",
            "    var s;",
            "    var n;",
            "    var keyTime;",
            "    var keyVal;",
            "    var noteDuration;",
            "    var bestTime = -1;",
            "    var bestIndex = -1;",
            "    var bestEntry = null;",
            "    var bestSlider = null;",
            "    var bestKey = 0;",
            "    for (i = 0; i < drumFrameList.length; i++) {",
            "        entry = drumFrameList[i];",
            "        s = sliderByName(entry.effect);",
            "        if (!s || s.numKeys < 1) { continue; }",
            "        n = lastKeyAtOrBefore(s, time);",
            "        if (n < 1) { continue; }",
            "        keyTime = s.key(n).time;",
            "        keyVal = s.key(n).value;",
            "        if (keyVal <= 0) { continue; }",
            "        noteDuration = noteDurationForKey(s, n);",
            "        if (time > keyTime + noteDuration) { continue; }",
            "        if (keyTime > bestTime || (keyTime === bestTime && i > bestIndex)) {",
            "            bestTime = keyTime;",
            "            bestIndex = i;",
            "            bestEntry = entry;",
            "            bestSlider = s;",
            "            bestKey = n;",
            "        }",
            "    }",
            "    if (bestEntry && bestSlider) {",
            "        keyTime = bestSlider.key(bestKey).time;",
            "        noteDuration = noteDurationForKey(bestSlider, bestKey);",
            "        var progress = (time - keyTime) / noteDuration;",
            "        var frameToPlay = linear(progress, 0, 1, bestEntry.startFrame, bestEntry.endFrame);",
            "        framesToTime(frameToPlay);",
            "    } else {",
            "        value;",
            "    }",
            "} catch (e) {",
            "    value;",
            "}"
        ];
    }

    function legacyDrumSequencerRuntime(): string[] {
        return [
            "function sliderByName(effectName) {",
            '    try { return midiLayer.effect(effectName)("Slider"); } catch (e) { return null; }',
            "}",
            "function lastKeyAtOrBefore(prop, t) {",
            "    if (!prop || prop.numKeys < 1) { return 0; }",
            "    var n = prop.nearestKey(t).index;",
            "    if (prop.key(n).time > t) { n--; }",
            "    return n;",
            "}",
            "try {",
            "    var pitchSlider = sliderByName(pitchSliderName);",
            "    var durSlider = sliderByName(durSliderName);",
            "    if (pitchSlider && pitchSlider.numKeys > 0) {",
            "        var n = lastKeyAtOrBefore(pitchSlider, time);",
            "        if (n > 0) {",
            "            var keyTime = pitchSlider.key(n).time;",
            "            var currentPitch = Math.round(pitchSlider.key(n).value);",
            "            if (pitchMap.hasOwnProperty(currentPitch)) {",
            "                var noteData = pitchMap[currentPitch];",
            "                var noteDuration = durSlider ? durSlider.valueAtTime(keyTime) : 0.05;",
            "                if (noteDuration <= 0) { noteDuration = 0.05; }",
            "                var progress = (time - keyTime) / noteDuration;",
            "                var frameToPlay = linear(progress, 0, 1, noteData.startFrame, noteData.endFrame);",
            "                framesToTime(frameToPlay);",
            "            } else {",
            "                value;",
            "            }",
            "        } else {",
            "            framesToTime(0);",
            "        }",
            "    } else {",
            "        framesToTime(0);",
            "    }",
            "} catch (e) {",
            "    framesToTime(0);",
            "}"
        ];
    }

    api.buildDrumSequencerExpression = function (options?: DrumSequencerExpressionOptions): string {
        var input = options || {};
        var frameEntries = input.frameEntries || [];
        var header: string[];
        var mapBlock: string[];
        var runtime: string[];

        if (input.useNamedDrumSliders) {
            mapBlock = formatDrumFrameListBlock(frameEntries);
            header = [
                "// Generated by ReOm MIDI Drum Sequencer",
                "// Map each named drum slider to a frame range in your footage precomp.",
                "// List order sets hit priority when multiple drums overlap (most recent active hit wins).",
                "// Zone reference: Kick ~11-30, Snare ~33-52, Hats ~86-128 (edit startFrame/endFrame below).",
                "var midiLayer = thisComp.layer(" + quote(input.sourceLayerName || "MIDI") + ");",
                ""
            ];
            runtime = namedDrumSequencerRuntime();
        } else {
            mapBlock = formatFrameMapBlock(frameEntries);
            header = [
                "// Generated by ReOm MIDI Drum Sequencer",
                "// Map each drum pitch to a frame range in your footage precomp.",
                "// Zone reference: Kick ~11-30, Snare ~33-52, Hats ~86-128 (edit startFrame/endFrame below).",
                "var midiLayer = thisComp.layer(" + quote(input.sourceLayerName || "MIDI") + ");",
                "var pitchSliderName = " + quote(input.pitchSliderName || "T01 Ch10 pitch") + ";",
                "var durSliderName = " + quote(input.durationSliderName || "T01 Ch10 duration") + ";",
                ""
            ];
            runtime = legacyDrumSequencerRuntime();
        }

        return joinLines(header.concat(mapBlock).concat([""]).concat(runtime));
    };

    function parseDrumFrameListBlock(block: string): DrumSequencerFrameEntry[] | null {
        var entries: DrumSequencerFrameEntry[] = [];
        var re =
            /\{\s*effect\s*:\s*"((?:\\.|[^"\\])*)"\s*,\s*startFrame\s*:\s*(-?\d+)\s*,\s*endFrame\s*:\s*(-?\d+)\s*\}(?:\s*\/\/\s*pitch\s*(\d+)(?:\s+(.*))?)?/g;
        var match: RegExpExecArray | null;
        var label: string;
        while ((match = re.exec(block))) {
            label = match[5] ? String(match[5]).replace(/^\s+|\s+$/g, "") : "";
            entries.push({
                effectName: match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
                startFrame: parseInt(match[2], 10),
                endFrame: parseInt(match[3], 10),
                pitch: match[4] ? parseInt(match[4], 10) : 0,
                label: label
            });
        }
        return entries.length ? entries : null;
    }

    function parsePitchMapBlock(block: string): DrumSequencerFrameEntry[] | null {
        var entries: DrumSequencerFrameEntry[] = [];
        var re = /(\d+)\s*:\s*\{\s*startFrame\s*:\s*(-?\d+)\s*,\s*endFrame\s*:\s*(-?\d+)\s*\}(?:\s*\/\/\s*(.*))?/g;
        var match: RegExpExecArray | null;
        var label: string;
        while ((match = re.exec(block))) {
            label = match[4] ? String(match[4]).replace(/^\s+|\s+$/g, "") : "";
            entries.push({
                pitch: parseInt(match[1], 10),
                startFrame: parseInt(match[2], 10),
                endFrame: parseInt(match[3], 10),
                effectName: "",
                label: label
            });
        }
        return entries.length ? entries : null;
    }

    api.parseDrumSequencerFrameMapFromExpression = function (expression: string): DrumSequencerFrameEntry[] | null {
        var text = String(expression || "");
        var listBegin = text.indexOf(LIST_BEGIN);
        var listEnd = text.indexOf(LIST_END);
        var mapBegin = text.indexOf(MAP_BEGIN);
        var mapEnd = text.indexOf(MAP_END);
        var parsed: DrumSequencerFrameEntry[] | null;

        if (listBegin >= 0 && listEnd > listBegin) {
            parsed = parseDrumFrameListBlock(text.substring(listBegin, listEnd));
            if (parsed) {
                return parsed;
            }
        }
        if (mapBegin >= 0 && mapEnd > mapBegin) {
            parsed = parsePitchMapBlock(text.substring(mapBegin, mapEnd));
            if (parsed) {
                return parsed;
            }
        }
        return null;
    };

    function existingMapFromExpression(expression: string): StringKeyedMap<{ startFrame: number; endFrame: number }> {
        var parsed = api.parseDrumSequencerFrameMapFromExpression(expression);
        var byPitch: StringKeyedMap<{ startFrame: number; endFrame: number }> = {};
        var i: number;
        if (!parsed) {
            return byPitch;
        }
        for (i = 0; i < parsed.length; i += 1) {
            byPitch[parsed[i].pitch] = {
                startFrame: parsed[i].startFrame,
                endFrame: parsed[i].endFrame
            };
        }
        return byPitch;
    }

    function existingEntriesFromExpression(expression: string): DrumSequencerFrameEntry[] {
        return api.parseDrumSequencerFrameMapFromExpression(expression) || [];
    }

    function findExistingFrameValues(
        existingEntries: DrumSequencerFrameEntry[],
        entry: DrumSequencerFrameEntry
    ): DrumSequencerFrameEntry | null {
        var i: number;
        var existing: DrumSequencerFrameEntry;
        for (i = 0; i < existingEntries.length; i += 1) {
            existing = existingEntries[i];
            if (entry.effectName && existing.effectName === entry.effectName) {
                return existing;
            }
        }
        for (i = 0; i < existingEntries.length; i += 1) {
            existing = existingEntries[i];
            if (Math.round(existing.pitch) === Math.round(entry.pitch)) {
                return existing;
            }
        }
        return null;
    }

    api.prepareDrumSequencerExpression = function (
        comp: CompItem,
        sourceLayer: Layer,
        options?: DrumSequencerOptions
    ): DrumSequencerPrepared {
        var range: PitchValuesFromLayerResult;
        var frameEntries: DrumSequencerFrameEntry[];
        var expression: string;
        var state: DrumSequencerState;
        var pitchSliderName: string;
        var durationSliderName: string;
        var padGroups: NamedDrumPadGroup[];
        var existingEntries: DrumSequencerFrameEntry[];
        var labelMode: MidiMapLabelMode;
        var useNamedDrumSliders: boolean;

        options = options || {};
        if (!sourceLayer) {
            throw new Error("Select an imported drum MIDI layer before generating a Drum Sequencer expression.");
        }

        labelMode = options.labelMode || "drums";
        existingEntries = existingEntriesFromExpression(options.existingExpression || "");
        useNamedDrumSliders = api.layerHasNamedDrumSliders(sourceLayer);
        options.totalFrames = parseTotalFramesOption(options.totalFrames);

        if (useNamedDrumSliders) {
            padGroups = api.collectNamedDrumPadGroupsFromLayer(sourceLayer, options);
            if (!padGroups.length) {
                throw new Error(
                    'No named drum slider hits were found on layer "' +
                        sourceLayer.name +
                        '". Import with named drum sliders enabled, or use a layer with drum hits.'
                );
            }
            frameEntries = buildNamedFrameEntries(
                padGroups,
                labelMode,
                shouldPreserveDrumSequencerFrames(options) ? existingEntries : [],
                { totalFrames: options.totalFrames }
            );
            expression = api.buildDrumSequencerExpression({
                sourceLayerName: sourceLayer.name,
                frameEntries: frameEntries,
                useNamedDrumSliders: true
            });
            state = {
                useNamedDrumSliders: true,
                pitches: frameEntries.map(function (entry) {
                    return entry.pitch;
                }),
                pitchSliderName: "",
                durationSliderName: "",
                sourceLayerName: sourceLayer.name,
                labelMode: labelMode,
                totalFrames: options.totalFrames,
                frameEntries: frameEntries
            };
            return {
                expression: expression,
                frameEntries: frameEntries,
                range: {
                    pitches: state.pitches,
                    min: state.pitches[0],
                    max: state.pitches[state.pitches.length - 1]
                },
                state: state,
                summary:
                    frameEntries.length +
                    " named drum slider" +
                    (frameEntries.length === 1 ? "" : "s") +
                    " from " +
                    sourceLayer.name +
                    ". Reorder the list to set overlap priority; edit startFrame/endFrame in the expression below."
            };
        }

        range = api.collectPitchValuesFromLayer(sourceLayer, options);
        if (!range.pitches.length) {
            throw new Error(
                'No pitch values were found on layer "' +
                    sourceLayer.name +
                    '".' +
                    (range.pitchSliderName ? ' Pitch slider: "' + range.pitchSliderName + '".' : "")
            );
        }
        pitchSliderName = range.pitchSliderName || api.resolvePitchSliderName(sourceLayer, options);
        durationSliderName = api.resolveDurationSliderName(sourceLayer, options);
        frameEntries = buildDefaultFrameEntries(
            range.pitches,
            labelMode,
            shouldPreserveDrumSequencerFrames(options)
                ? options.preserveFrameMap || existingMapFromExpression(options.existingExpression || "")
                : {},
            { totalFrames: options.totalFrames }
        );
        expression = api.buildDrumSequencerExpression({
            sourceLayerName: sourceLayer.name,
            pitchSliderName: pitchSliderName,
            durationSliderName: durationSliderName,
            frameEntries: frameEntries,
            useNamedDrumSliders: false
        });
        state = {
            useNamedDrumSliders: false,
            pitches: range.pitches,
            pitchSliderName: pitchSliderName,
            durationSliderName: durationSliderName,
            sourceLayerName: sourceLayer.name,
            labelMode: labelMode,
            totalFrames: options.totalFrames,
            frameEntries: frameEntries
        };
        return {
            expression: expression,
            frameEntries: frameEntries,
            range: range,
            state: state,
            summary:
                range.pitches.length +
                " drum pitch" +
                (range.pitches.length === 1 ? "" : "es") +
                " (" +
                range.min +
                "\u2013" +
                range.max +
                ") from " +
                sourceLayer.name +
                ". Edit startFrame/endFrame in the map below."
        };
    };

    api.regenerateDrumSequencerExpression = function (state: DrumSequencerState, expression: string): string {
        var existingEntries = existingEntriesFromExpression(expression);
        var frameEntries: DrumSequencerFrameEntry[] = [];
        var i: number;
        var entry: DrumSequencerFrameEntry;
        var match: DrumSequencerFrameEntry | null;
        var existing: DrumSequencerFrameEntry;

        if (!state || !state.frameEntries || !state.frameEntries.length) {
            throw new Error("Generate a Drum Sequencer map from the selected layer first.");
        }

        for (i = 0; i < state.frameEntries.length; i += 1) {
            entry = state.frameEntries[i];
            match = findExistingFrameValues(existingEntries, entry);
            existing = match || entry;
            frameEntries.push({
                pitch: entry.pitch,
                effectName: entry.effectName || "",
                label: entry.label,
                startFrame: existing.startFrame,
                endFrame: existing.endFrame
            });
        }
        state.frameEntries = frameEntries;
        return api.buildDrumSequencerExpression({
            sourceLayerName: state.sourceLayerName,
            pitchSliderName: state.pitchSliderName,
            durationSliderName: state.durationSliderName,
            frameEntries: frameEntries,
            useNamedDrumSliders: !!state.useNamedDrumSliders
        });
    };

    function setPropExpression(prop: Property | null, expression: string): boolean {
        if (!prop) {
            return false;
        }
        try {
            if (prop.canSetExpression === false) {
                return false;
            }
            prop.expression = expression;
            if (typeof prop.expressionEnabled !== "undefined") {
                prop.expressionEnabled = true;
            }
            return true;
        } catch (exprErr) {}
        return false;
    }

    api.resolveTargetFootageLayer = function (comp: CompItem): Layer {
        var layer: Layer;
        var timeRemap: Property | null;

        if (!comp || !comp.selectedLayers || comp.selectedLayers.length < 1) {
            throw new Error("Select a footage or precomp layer to receive the Time Remap expression.");
        }
        layer = comp.selectedLayers[0];
        if (!layer) {
            throw new Error("Select a footage or precomp layer to receive the Time Remap expression.");
        }
        if (layer.nullLayer) {
            throw new Error(
                'Layer "' +
                    layer.name +
                    '" is a null layer. Select a footage or precomp layer with frame-based samples.'
            );
        }
        try {
            timeRemap = layer.property("ADBE Time Remapping") as Property;
            if (!timeRemap) {
                throw new Error("Time Remap property not found.");
            }
        } catch (propErr) {
            throw new Error(
                'Layer "' + layer.name + '" does not support Time Remap. Select a footage or precomp layer.'
            );
        }
        return layer;
    };

    api.applyDrumSequencerToLayer = function (
        comp: CompItem,
        targetLayer: Layer,
        expression: string
    ): DrumSequencerApplyResult {
        var timeRemap: Property | null;

        if (!targetLayer) {
            throw new Error("Select a footage or precomp layer to receive the Time Remap expression.");
        }
        if (!expression) {
            throw new Error("The Drum Sequencer expression is empty.");
        }
        try {
            (targetLayer as AVLayer).timeRemapEnabled = true;
        } catch (enableErr) {
            throw new Error('Could not enable Time Remap on layer "' + targetLayer.name + '".');
        }
        timeRemap = targetLayer.property("Time Remap") as Property;
        if (!timeRemap || timeRemap.canSetExpression === false) {
            throw new Error('The Time Remap property on "' + targetLayer.name + '" cannot receive expressions.');
        }
        if (!setPropExpression(timeRemap, expression)) {
            throw new Error(
                'Could not apply the Drum Sequencer expression to Time Remap on "' + targetLayer.name + '".'
            );
        }
        return {
            layerName: targetLayer.name,
            expression: expression
        };
    };
})(ReOmMIDI);
