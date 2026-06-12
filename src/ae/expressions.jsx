/* global ReOmMIDI, app, CompItem, KeyframeInterpolationType. */
(function (api) {
    function quote(value) {
        value = String(value || "");
        value = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        value = value.replace(/\r/g, "\\r").replace(/\n/g, "\\n");
        return '"' + value + '"';
    }

    function numeric(value, fallback) {
        var parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
    }

    function normalizePitchFilter(value) {
        var parts;
        var out = [];
        var seen = {};
        var i;
        var n;

        if (value === null || typeof value === "undefined") {
            return [];
        }
        if (typeof value === "number") {
            n = Math.round(value);
            return n > 0 && n <= 127 ? [n] : [];
        }
        if (value && value.length !== undefined && typeof value !== "string") {
            for (i = 0; i < value.length; i += 1) {
                n = Math.round(parseFloat(value[i]));
                if (n > 0 && n <= 127 && !seen[n]) {
                    seen[n] = true;
                    out.push(n);
                }
            }
            out.sort(function (a, b) {
                return a - b;
            });
            return out;
        }
        value = String(value || "").replace(/^\s+|\s+$/g, "");
        if (!value) {
            return [];
        }
        parts = value.split(/[,\s]+/);
        for (i = 0; i < parts.length; i += 1) {
            if (!parts[i]) {
                continue;
            }
            n = Math.round(parseFloat(parts[i]));
            if (n > 0 && n <= 127 && !seen[n]) {
                seen[n] = true;
                out.push(n);
            }
        }
        out.sort(function (a, b) {
            return a - b;
        });
        return out;
    }

    function formatPitchFilterLiteral(filter) {
        filter = normalizePitchFilter(filter);
        if (!filter.length) {
            return "[]";
        }
        return "[" + filter.join(", ") + "]";
    }

    function midiActionPitchMatchesFilter(pitch, options) {
        var filter;
        var i;

        pitch = Math.round(pitch);
        filter = options && options.pitchFilter;
        if (!filter || !filter.length) {
            return true;
        }
        for (i = 0; i < filter.length; i += 1) {
            if (filter[i] === pitch) {
                return true;
            }
        }
        return false;
    }

    function previewProgressHook(options) {
        if (options && options.__previewProgressHook) {
            return options.__previewProgressHook;
        }
        if (api.getActivePreviewProgressHook) {
            return api.getActivePreviewProgressHook();
        }
        return null;
    }

    function reportPreviewProgress(options, stageId, done, total, detail) {
        var hook = previewProgressHook(options);
        if (!hook) {
            return;
        }
        if (stageId && hook.stageId !== stageId) {
            hook.setStage(stageId, detail);
        }
        if (typeof done === "number" && typeof total === "number" && total > 0) {
            hook.step(done, total, detail || hook.stageLabel);
        } else if (detail) {
            hook.report(hook.percent, detail);
        }
    }

    function expressionValue(value, fallback) {
        value = String(value || "").replace(/^\s+|\s+$/g, "");
        return value || fallback;
    }

    var MIDI_ACTION_BASE_SLIDER = "Base";
    var MIDI_ACTION_ACTIVE_SLIDER = "Active";
    var MIDI_ACTION_AMOUNT_SLIDER = "Amount";
    var MIDI_ACTION_DURATION_SLIDER = "Duration";

    function midiActionUsesAmountDurationSliders(preset) {
        return preset === "pump" || preset === "accumulator";
    }

    function midiActionUsesActiveSlider(preset) {
        return preset === "toggle" || preset === "interpolate";
    }

    function midiActionUsesBaseSlider(preset) {
        return !!preset;
    }

    function midiActionUsesFalloffField(preset) {
        return preset === "pump" || preset === "interpolate" || preset === "accumulator";
    }

    api.midiActionUsesBaseField = midiActionUsesBaseSlider;
    api.midiActionUsesActiveField = midiActionUsesActiveSlider;
    api.midiActionUsesAmountDurationFields = midiActionUsesAmountDurationSliders;
    api.midiActionUsesFalloffField = midiActionUsesFalloffField;

    function outputSliderExpression(effectName) {
        return "thisLayer.effect(" + quote(api.limitEffectName(effectName)) + ')("Slider")';
    }

    function resolveMidiActionBaseExpression(options, literalFallback) {
        if (options.useOutputSliders && midiActionUsesBaseSlider(options.preset || "pump")) {
            return outputSliderExpression(MIDI_ACTION_BASE_SLIDER);
        }
        return expressionValue(options.baseValue, literalFallback);
    }

    function resolveMidiActionActiveExpression(options, literalFallback) {
        if (options.useOutputSliders && midiActionUsesActiveSlider(options.preset || "pump")) {
            return outputSliderExpression(MIDI_ACTION_ACTIVE_SLIDER);
        }
        return expressionValue(options.activeValue, literalFallback);
    }

    function defaultBaseSliderValue(options) {
        var preset = options.preset || "pump";
        var normalized = {};
        var i;
        for (i in options) {
            if (options.hasOwnProperty(i)) {
                normalized[i] = options[i];
            }
        }
        if (preset === "toggle") {
            normalizeTogglePresetOptions(normalized);
            return numeric(parseValueLiteral(normalized.baseValue, 1), 1);
        }
        if (preset === "interpolate") {
            normalizeInterpolatePresetOptions(normalized);
            return numeric(parseValueLiteral(normalized.baseValue, 25), 25);
        }
        return numeric(parseValueLiteral(normalized.baseValue, 0), 0);
    }

    function defaultActiveSliderValue(options) {
        var normalized = {};
        var i;
        for (i in options) {
            if (options.hasOwnProperty(i)) {
                normalized[i] = options[i];
            }
        }
        normalizeTogglePresetOptions(normalized);
        normalizeInterpolatePresetOptions(normalized);
        if ((options.preset || "pump") === "toggle") {
            return numeric(parseValueLiteral(normalized.activeValue, -1), -1);
        }
        if (options.preset === "interpolate") {
            return numeric(parseValueLiteral(normalized.activeValue, 100), 100);
        }
        return 0;
    }

    function joinExpressionLines(lines) {
        return lines.join("\n");
    }

    function expressionTryCatch(bodyLines, fallbackExpr) {
        var lines = ["try {"];
        var i;
        for (i = 0; i < bodyLines.length; i += 1) {
            lines.push("    " + bodyLines[i]);
        }
        lines.push("} catch (e) {");
        lines.push("    fitPropertyValue(" + fallbackExpr + ");");
        lines.push("}");
        return lines;
    }

    function resolveAmountDurationExpressions(options) {
        if (options.useOutputSliders) {
            return {
                amount: outputSliderExpression(MIDI_ACTION_AMOUNT_SLIDER),
                duration: outputSliderExpression(MIDI_ACTION_DURATION_SLIDER)
            };
        }
        return {
            amount: expressionValue(options.amount, "20"),
            duration: String(numeric(options.duration, 0.2))
        };
    }

    function resolveAccumulatorDurationExpression(options) {
        if (options.useOutputSliders) {
            return outputSliderExpression(MIDI_ACTION_DURATION_SLIDER);
        }
        if (options.falloff === "instant") {
            return "0";
        }
        return String(numeric(options.duration, 0.1));
    }

    function resolveAccumulatorInterpolation(options) {
        if (options.falloff === "instant") {
            return "linear";
        }
        if (options.falloff === "ease") {
            return "ease";
        }
        return "linear";
    }

    var PRESET_FUNCTIONS = {
        toggle: ["pitchHitCountAt", "fitPropertyValue"],
        interpolate: ["pitchEventTimes", "mixValue", "segmentProgress", "fitPropertyValue"],
        pump: ["latestHit", "addDelta", "falloffFactor", "fitPropertyValue"],
        accumulator: ["pitchHitCountAt", "latestHit", "addDelta", "fitPropertyValue"]
    };

    var FUNCTION_DEPS = {
        sliderByName: [],
        pitchSlider: ["sliderByName"],
        lastKeyAtOrBefore: [],
        pitchAllowed: [],
        pitchHitCountAt: ["pitchSlider", "pitchAllowed"],
        pitchEventTimes: ["pitchSlider", "pitchAllowed"],
        latestPitchHit: ["pitchSlider", "pitchAllowed", "lastKeyAtOrBefore"],
        latestHit: ["latestPitchHit"],
        addDelta: [],
        mixValue: [],
        falloffFactor: [],
        segmentProgress: [],
        fitPropertyValue: []
    };

    var RUNTIME_FUNCTION_ORDER = [
        "sliderByName",
        "pitchSlider",
        "lastKeyAtOrBefore",
        "pitchAllowed",
        "pitchHitCountAt",
        "pitchEventTimes",
        "latestPitchHit",
        "latestHit",
        "addDelta",
        "mixValue",
        "falloffFactor",
        "segmentProgress",
        "fitPropertyValue"
    ];

    var RUNTIME_FUNCTION_IMPLS = {
        sliderByName: [
            "// Helper to safely access a slider on the MIDI layer by name",
            "function sliderByName(effectName) {",
            '    try { return midiLayer.effect(effectName)("Slider"); } catch (e) { return null; }',
            "}"
        ],
        pitchSlider: [
            "// Helper to get the MIDI pitch slider reference",
            "function pitchSlider() { return sliderByName(pitchSliderName); }"
        ],
        lastKeyAtOrBefore: [
            "// Finds the index of the last keyframe at or before time t on a property",
            "function lastKeyAtOrBefore(prop, t) {",
            "    if (!prop || prop.numKeys < 1) { return 0; }",
            "    var n = prop.nearestKey(t).index;",
            "    if (prop.key(n).time > t) { n--; }",
            "    return n;",
            "}"
        ],
        pitchAllowed: [
            "// Checks if a MIDI pitch is allowed by the filter config",
            "function pitchAllowed(pitch) {",
            "    var i;",
            "    if (!pitchFilter.length) { return true; }",
            "    pitch = Math.round(pitch);",
            "    for (i = 0; i < pitchFilter.length; i++) {",
            "        if (pitchFilter[i] === pitch) { return true; }",
            "    }",
            "    return false;",
            "}"
        ],
        pitchHitCountAt: [
            "// Counts total valid note triggers that have occurred up to time t",
            "function pitchHitCountAt(t) {",
            "    var ps = pitchSlider();",
            "    var count = 0;",
            "    var pk;",
            "    var pitch;",
            "    if (ps) {",
            "        for (pk = 1; pk <= ps.numKeys; pk++) {",
            "            if (ps.key(pk).time <= t) {",
            "                pitch = Math.round(ps.key(pk).value);",
            "                if (pitch > 0 && pitchAllowed(pitch)) { count++; }",
            "            }",
            "        }",
            "    }",
            "    return count;",
            "}"
        ],
        pitchEventTimes: [
            "// Collects sorted timestamps of all valid note triggers",
            "function pitchEventTimes() {",
            "    var times = [];",
            "    var ps = pitchSlider();",
            "    var pk;",
            "    var pitch;",
            "    if (ps) {",
            "        for (pk = 1; pk <= ps.numKeys; pk++) {",
            "            pitch = Math.round(ps.key(pk).value);",
            "            if (pitch > 0 && pitchAllowed(pitch)) { times[times.length] = ps.key(pk).time; }",
            "        }",
            "    }",
            "    times.sort(function(a, b) { return a - b; });",
            "    return times;",
            "}"
        ],
        latestPitchHit: [
            "// Finds details of the most recent valid pitch event at or before time t",
            "function latestPitchHit(t) {",
            "    var s = pitchSlider();",
            "    var n = lastKeyAtOrBefore(s, t);",
            "    var pitch;",
            "    while (n >= 1) {",
            "        pitch = Math.round(s.key(n).value);",
            "        if (pitch > 0 && pitchAllowed(pitch)) {",
            '            return {time: s.key(n).time, value: pitch, label: String(pitch), amount: 1, source: "pitch"};',
            "        }",
            "        n--;",
            "    }",
            "    return null;",
            "}"
        ],
        latestHit: [
            "// Reference function for the latest trigger event",
            "function latestHit(t) { return latestPitchHit(t); }"
        ],
        addDelta: [
            "// Adds offset value, supporting single numbers or multi-dimensional property arrays",
            "function addDelta(base, delta) {",
            '    if (base && base.length !== undefined && typeof base !== "string") {',
            "        var out = [];",
            "        var i;",
            "        for (i = 0; i < base.length; i++) { out[i] = base[i] + delta; }",
            "        return out;",
            "    }",
            "    return base + delta;",
            "}"
        ],
        mixValue: [
            "// Linear interpolation helper between two values/arrays based on progress p",
            "function mixValue(a, b, p) {",
            "    var out = [];",
            "    var i;",
            "    var len;",
            "    var ai;",
            "    var bi;",
            '    var aIsArray = a && a.length !== undefined && typeof a !== "string";',
            '    var bIsArray = b && b.length !== undefined && typeof b !== "string";',
            "    if (aIsArray || bIsArray) {",
            "        len = bIsArray ? b.length : a.length;",
            "        for (i = 0; i < len; i++) {",
            "            ai = aIsArray ? a[i] : a;",
            "            bi = bIsArray ? b[i] : b;",
            "            out[i] = ai + (bi - ai) * p;",
            "        }",
            "        return out;",
            "    }",
            "    return a + (b - a) * p;",
            "}"
        ],
        falloffFactor: [
            "// Returns a normalized multiplier (1 to 0) based on decay duration and curve type",
            "function falloffFactor(t, hitTime, duration, mode) {",
            '    if (mode === "instant") { return (t < hitTime + thisComp.frameDuration ? 1 : 0); }',
            '    if (mode === "exponential") {',
            "        return Math.pow(1 - Math.min(Math.max((t - hitTime) / duration, 0), 1), 3);",
            "    }",
            '    if (mode === "ease") { return ease(t, hitTime, hitTime + duration, 1, 0); }',
            "    return linear(t, hitTime, hitTime + duration, 1, 0);",
            "}"
        ],
        segmentProgress: [
            "// Returns progress (0 to 1) along a transition segment based on the curve type",
            "function segmentProgress(t, t0, t1, mode) {",
            "    if (t1 <= t0) { return 1; }",
            "    var x = Math.min(Math.max((t - t0) / (t1 - t0), 0), 1);",
            '    if (mode === "instant") { return x >= 1 ? 1 : 0; }',
            '    if (mode === "exponential") { return Math.pow(x, 3); }',
            '    if (mode === "ease") { return x * x * (3 - 2 * x); }',
            "    return x;",
            "}"
        ],
        fitPropertyValue: [
            "// Adapts the calculated output to match target property dimensions (1D/2D/3D/4D)",
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
        ]
    };

    function resolveRequiredFunctions(preset) {
        var roots = PRESET_FUNCTIONS[preset] || PRESET_FUNCTIONS["pump"];
        var required = {};
        var queue = [].concat(roots);
        var name;
        var deps;
        var i;

        while (queue.length > 0) {
            name = queue.shift();
            if (!required[name]) {
                required[name] = true;
                deps = FUNCTION_DEPS[name] || [];
                for (i = 0; i < deps.length; i += 1) {
                    queue.push(deps[i]);
                }
            }
        }

        var sorted = [];
        for (i = 0; i < RUNTIME_FUNCTION_ORDER.length; i += 1) {
            name = RUNTIME_FUNCTION_ORDER[i];
            if (required[name]) {
                sorted.push(name);
            }
        }
        return sorted;
    }

    function midiActionRuntime(preset) {
        var requiredNames = resolveRequiredFunctions(preset);
        var lines = ["", "// ---- Runtime Helpers ----"];
        var i;
        var name;
        for (i = 0; i < requiredNames.length; i += 1) {
            name = requiredNames[i];
            lines = lines.concat(RUNTIME_FUNCTION_IMPLS[name]);
            lines.push("");
        }
        return joinExpressionLines(lines);
    }

    function commonHeader(options) {
        var sourceLayer = options.sourceLayerName || "MIDI";
        var pitchSlider = options.pitchSliderName || "T01 Ch01 pitch";
        var preset = options.preset || "pump";

        return joinExpressionLines([
            "// Generated by ReOm MIDI Actions",
            "var midiLayer = thisComp.layer(" + quote(sourceLayer) + ");",
            "var pitchSliderName = " + quote(pitchSlider) + ";",
            "// pitchFilter: MIDI note numbers 1-127. [] = all notes. Example: [60, 64, 67]",
            "var pitchFilter = " + formatPitchFilterLiteral(options.pitchFilter) + ";",
            midiActionRuntime(preset),
            ""
        ]);
    }

    function coerceScalarPresetLiteral(value, fallback) {
        var pair;
        var parsed;
        var text;

        if (value === "value") {
            return "value";
        }
        pair = splitBracketPair(value);
        if (pair) {
            parsed = parseFloat(pair.right);
            if (!isNaN(parsed)) {
                return String(parsed);
            }
            parsed = parseFloat(pair.left);
            if (!isNaN(parsed)) {
                return String(parsed);
            }
        }
        text = String(value || "").replace(/^\s+|\s+$/g, "");
        return text || fallback;
    }

    function normalizeTogglePresetOptions(options) {
        options = options || {};
        if ((options.preset || "pump") !== "toggle") {
            return options;
        }
        if (options.activeValue) {
            options.activeValue = coerceScalarPresetLiteral(options.activeValue, "-1");
        }
        if (options.baseValue && options.baseValue !== "value") {
            options.baseValue = coerceScalarPresetLiteral(options.baseValue, "1");
        }
        return options;
    }

    api.buildToggleExpression = function (options) {
        options = normalizeTogglePresetOptions(options || {});
        var baseValue = resolveMidiActionBaseExpression(options, "1");
        var activeValue = resolveMidiActionActiveExpression(options, "-1");
        return (
            commonHeader(options) +
            joinExpressionLines(
                expressionTryCatch(
                    [
                        "var count = pitchHitCountAt(time);",
                        "fitPropertyValue((count % 2) ? (" + activeValue + ") : (" + baseValue + "));"
                    ],
                    baseValue
                )
            )
        );
    };

    function splitBracketPair(text) {
        var match = String(text || "")
            .replace(/^\s+|\s+$/g, "")
            .match(/^\[\s*([^,\]]+)\s*,\s*([^\]]+)\s*\]$/);
        if (!match) {
            return null;
        }
        return {
            left: match[1].replace(/^\s+|\s+$/g, ""),
            right: match[2].replace(/^\s+|\s+$/g, "")
        };
    }

    function normalizeInterpolatePresetOptions(options) {
        var pair;
        options = options || {};
        if ((options.preset || "pump") !== "interpolate") {
            return options;
        }
        pair = splitBracketPair(options.activeValue);
        if (pair) {
            if (!options.baseValue || options.baseValue === "value") {
                options.baseValue = pair.left;
            }
            options.activeValue = pair.right;
            return options;
        }
        pair = splitBracketPair(options.baseValue);
        if (pair && !options.activeValue) {
            options.baseValue = pair.left;
            options.activeValue = pair.right;
        }
        return options;
    }

    api.buildInterpolateExpression = function (options) {
        options = normalizeInterpolatePresetOptions(options || {});
        var baseValue = resolveMidiActionBaseExpression(options, "25");
        var activeValue = resolveMidiActionActiveExpression(options, "100");
        var falloff = options.falloff || "linear";
        return (
            commonHeader(options) +
            joinExpressionLines(
                [
                    "function targetForEvent(index) {",
                    "    return (index % 2) ? (" + activeValue + ") : (" + baseValue + ");",
                    "}"
                ].concat(
                    expressionTryCatch(
                        [
                            "var times = pitchEventTimes();",
                            "var result = (" + baseValue + ");",
                            "var n;",
                            "if (times.length > 0 && time >= times[0]) {",
                            "    n = 0;",
                            "    while (n < times.length - 1 && times[n + 1] <= time) { n++; }",
                            "    if (n >= times.length - 1) {",
                            "        result = targetForEvent(n);",
                            "    } else {",
                            "        result = mixValue(",
                            "            targetForEvent(n),",
                            "            targetForEvent(n + 1),",
                            "            segmentProgress(time, times[n], times[n + 1], " + quote(falloff) + ")",
                            "        );",
                            "    }",
                            "}",
                            "fitPropertyValue(result);"
                        ],
                        baseValue
                    )
                )
            )
        );
    };

    api.buildPumpExpression = function (options) {
        var baseValue = resolveMidiActionBaseExpression(options, "0");
        var falloff = options.falloff || "linear";
        var amountDuration = resolveAmountDurationExpressions(options || {});
        return (
            commonHeader(options) +
            joinExpressionLines(
                expressionTryCatch(
                    [
                        "var duration = " + amountDuration.duration + ";",
                        "var hit = latestHit(time);",
                        "var base = (" + baseValue + ");",
                        "var result = base;",
                        "if (hit && time <= hit.time + duration) {",
                        "    result = addDelta(base, (" +
                            amountDuration.amount +
                            ") * falloffFactor(time, hit.time, duration, " +
                            quote(falloff) +
                            "));",
                        "}",
                        "fitPropertyValue(result);"
                    ],
                    baseValue
                )
            )
        );
    };

    api.buildAccumulatorExpression = function (options) {
        var baseValue = resolveMidiActionBaseExpression(options, "0");
        var durationExpr = resolveAccumulatorDurationExpression(options || {});
        var interpolation = resolveAccumulatorInterpolation(options || {});
        return (
            commonHeader(options) +
            joinExpressionLines(
                [
                    "function accumulatedValue(t) {",
                    "    return addDelta((" + baseValue + "), pitchHitCountAt(t));",
                    "}"
                ].concat(
                    expressionTryCatch(
                        [
                            "var duration = " + durationExpr + ";",
                            "var hit = latestHit(time);",
                            "var result = (" + baseValue + ");",
                            "if (hit) {",
                            "    result = " + interpolation + "(",
                            "        time,",
                            "        hit.time,",
                            "        hit.time + duration,",
                            "        accumulatedValue(hit.time - thisComp.frameDuration / 2),",
                            "        accumulatedValue(hit.time)",
                            "    );",
                            "}",
                            "fitPropertyValue(result);"
                        ],
                        baseValue
                    )
                )
            )
        );
    };

    api.buildMidiActionExpression = function (options) {
        options = options || {};
        if (options.preset === "toggle") {
            return api.buildToggleExpression(options);
        }
        if (options.preset === "interpolate") {
            return api.buildInterpolateExpression(options);
        }
        if (options.preset === "accumulator") {
            return api.buildAccumulatorExpression(options);
        }
        return api.buildPumpExpression(options);
    };

    api.collectMidiActionTriggers = function (midi, options) {
        var triggers = [];
        var noteEvents = midi.notes || [];
        var i;
        var note;

        for (i = 0; i < noteEvents.length; i += 1) {
            note = noteEvents[i];
            if (note.velocity > 0 && midiActionPitchMatchesFilter(note.pitch, options)) {
                triggers.push({
                    time: note.time,
                    label: String(note.pitch),
                    amount: 1,
                    source: "pitch",
                    pitch: note.pitch
                });
            }
        }

        return filterMidiActionTriggers(
            triggers.sort(function (a, b) {
                return a.time - b.time;
            }),
            options
        );
    };

    function falloffValue(t, start, duration, falloff, step) {
        var x;
        if (falloff === "instant") {
            return t >= start && t < start + (step || 0.0001) ? 1 : 0;
        }
        if (duration <= 0) {
            return 0;
        }
        x = (t - start) / duration;
        if (x < 0) {
            x = 0;
        }
        if (x > 1) {
            x = 1;
        }
        if (falloff === "linear") {
            return 1 - x;
        }
        if (falloff === "exponential") {
            return Math.pow(1 - x, 3);
        }
        if (falloff === "ease") {
            return 1 - x * x * (3 - 2 * x);
        }
        return 1 - x;
    }

    function midiActionUsesTriggerLimits(options) {
        return !!(options && options.limitTriggers);
    }

    function midiActionTriggerInTimeRange(trigger, options) {
        var start;
        var end;
        if (!midiActionUsesTriggerLimits(options) || !options.useWorkArea) {
            return true;
        }
        start = numeric(options.timeStart, 0);
        end = numeric(options.timeEnd, 999999);
        return trigger.time >= start && trigger.time < end;
    }

    function limitMidiActionTriggers(triggers, maxNotes) {
        if (maxNotes < 0 || triggers.length <= maxNotes) {
            return triggers;
        }
        return triggers.slice(0, maxNotes);
    }

    function filterMidiActionTriggers(triggers, options) {
        var filtered = [];
        var i;
        var maxNotes;
        if (!midiActionUsesTriggerLimits(options)) {
            return triggers;
        }
        maxNotes = parsePianoRollMaxNotes(options.maxNotes, 10);
        for (i = 0; i < triggers.length; i += 1) {
            if (midiActionTriggerInTimeRange(triggers[i], options)) {
                filtered.push(triggers[i]);
            }
        }
        return limitMidiActionTriggers(filtered, maxNotes);
    }

    api.resolveMidiActionOptions = function (comp, options, sourceLayer) {
        var resolved = {};
        options = options || {};
        resolved.triggerMode = "pitch";
        resolved.preset = options.preset || "pump";
        resolved.pitchSliderName = options.pitchSliderName || "T01 Ch01 pitch";
        resolved.drumMap = "";
        resolved.pitchMap = "";
        if (sourceLayer) {
            resolved.pitchSliderName = api.resolvePitchSliderName(sourceLayer, options);
        }
        resolved.baseValue = options.baseValue;
        resolved.activeValue = options.activeValue;
        resolved.amount = options.amount;
        resolved.duration = options.duration;
        resolved.falloff = options.falloff || "linear";
        resolved.maxNotes = options.maxNotes;
        resolved.useWorkArea = !!options.useWorkArea;
        resolved.limitTriggers = !!options.limitTriggers;
        resolved.previewStep = options.previewStep;
        resolved.previewEndTime = options.previewEndTime;
        resolved.previewBaseValue = options.previewBaseValue;
        resolved.previewActiveValue = options.previewActiveValue;
        resolved.sourceLayerName = options.sourceLayerName;
        resolved.pitchFilter = normalizePitchFilter(options.pitchFilter);
        if (resolved.preset === "interpolate") {
            normalizeInterpolatePresetOptions(resolved);
        }
        if (resolved.preset === "toggle") {
            normalizeTogglePresetOptions(resolved);
        }
        if (resolved.useWorkArea && comp && typeof comp.workAreaStart !== "undefined") {
            resolved.timeStart = comp.workAreaStart;
            resolved.timeEnd = comp.workAreaStart + comp.workAreaDuration;
        }
        return resolved;
    };

    function latestTriggerIndex(triggers, time) {
        var i;
        var result = -1;
        for (i = 0; i < triggers.length; i += 1) {
            if (triggers[i].time <= time) {
                result = i;
            } else {
                break;
            }
        }
        return result;
    }

    function sortTriggers(triggers) {
        return triggers.sort(function (a, b) {
            return a.time - b.time;
        });
    }

    function layerSlider(layer, effectName) {
        var slider;
        var parade;
        var i;
        var effect;
        if (!layer || !effectName) {
            return null;
        }
        slider = sliderFromLayerEffectByName(layer, effectName);
        if (slider) {
            return slider;
        }
        try {
            parade = getLayerEffectParade(layer);
            if (parade) {
                effect = parade.property(effectName);
                slider = sliderFromEffectGroup(effect);
                if (sliderHasKeys(slider)) {
                    return slider;
                }
                for (i = 1; i <= parade.numProperties; i += 1) {
                    effect = parade.property(i);
                    if (String(effect.name) === effectName) {
                        slider = sliderFromEffectGroup(effect);
                        if (sliderHasKeys(slider)) {
                            return slider;
                        }
                    }
                }
            }
        } catch (paradeErr) {}
        try {
            slider = layer.effect(effectName)("Slider");
            if (sliderHasKeys(slider)) {
                return slider;
            }
        } catch (effectErr) {}
        try {
            slider = layer.Effects.property(effectName).property(1);
            if (sliderHasKeys(slider)) {
                return slider;
            }
        } catch (propertyErr) {}
        return null;
    }

    function sliderKeyCount(slider) {
        if (!slider) {
            return 0;
        }
        try {
            if (slider.numKeys) {
                return slider.numKeys;
            }
        } catch (e) {}
        return 0;
    }

    function sliderHasKeys(slider) {
        return sliderKeyCount(slider) > 0;
    }

    function readSliderKey(slider, index) {
        var time;
        var value;
        if (!slider || index < 1 || index > sliderKeyCount(slider)) {
            return null;
        }
        try {
            if (typeof slider.key === "function") {
                return slider.key(index);
            }
        } catch (e) {}
        try {
            time = slider.keyTime(index);
            value = slider.keyValue(index);
            return {
                time: time,
                value: value
            };
        } catch (e2) {}
        return null;
    }

    function buildSliderKeyCache(slider, options) {
        var cache = {
            times: [],
            values: []
        };
        var i;
        var key;
        var keyCount;
        if (!slider) {
            return cache;
        }
        keyCount = sliderKeyCount(slider);
        for (i = 1; i <= keyCount; i += 1) {
            key = readSliderKey(slider, i);
            if (key) {
                cache.times.push(key.time);
                cache.values.push(key.value);
            }
            if (keyCount > 0 && (i % 24 === 0 || i === keyCount)) {
                reportPreviewProgress(options, null, i, keyCount, "Reading keyframes");
            }
        }
        return cache;
    }

    function exactValueAtCachedTime(cache, time, fallback) {
        var i;
        if (!cache || !cache.times.length) {
            return fallback;
        }
        for (i = 0; i < cache.times.length; i += 1) {
            if (Math.abs(cache.times[i] - time) < 0.0001) {
                return cache.values[i];
            }
        }
        return fallback;
    }

    function durationFromKeyCache(cache, keyIndex) {
        var startTime;
        var i;
        if (!cache || keyIndex < 0 || keyIndex >= cache.times.length) {
            return 0.05;
        }
        startTime = cache.times[keyIndex];
        if (cache.values[keyIndex] <= 0) {
            return 0.05;
        }
        for (i = keyIndex + 1; i < cache.times.length; i += 1) {
            if (cache.values[i] === 0) {
                return Math.max(cache.times[i] - startTime, 0.01);
            }
        }
        return 0.05;
    }

    function buildLayerEffectSliderIndex(layer) {
        var byName = {};
        var names = [];
        forEachLayerEffect(layer, function (effect) {
            var name = String(effect.name || "");
            var slider = sliderFromEffectGroup(effect);
            if (!name || !sliderHasKeys(slider)) {
                return;
            }
            byName[name] = slider;
            names.push(name);
        });
        return {
            byName: byName,
            names: names
        };
    }

    function sliderFromEffectIndex(sliderIndex, effectName) {
        if (!sliderIndex || !effectName) {
            return null;
        }
        return sliderIndex.byName[effectName] || null;
    }

    function sliderValueAtTime(slider, time, fallback) {
        var i;
        var key;
        var value = fallback;
        if (!slider) {
            return fallback;
        }
        try {
            return slider.valueAtTime(time, true);
        } catch (valueErr) {}
        try {
            return slider.valueAtTime(time, false);
        } catch (strictValueErr) {}
        for (i = 1; i <= sliderKeyCount(slider); i += 1) {
            key = readSliderKey(slider, i);
            if (key && key.time <= time) {
                value = key.value;
            }
        }
        return value;
    }

    function layerHasEffects(layer) {
        var parade = getLayerEffectParade(layer);
        return parade && parade.numProperties > 0;
    }

    function layersShareIndex(a, b) {
        return a && b && a.index === b.index;
    }

    function dedupeLayers(layers) {
        var out = [];
        var i;
        var j;
        for (i = 0; i < layers.length; i += 1) {
            for (j = 0; j < out.length; j += 1) {
                if (layersShareIndex(layers[i], out[j])) {
                    break;
                }
            }
            if (j === out.length) {
                out.push(layers[i]);
            }
        }
        return out;
    }

    function getLayerFromSelectedProperties(comp) {
        var props;
        var prop;
        var depth;
        if (!comp || !comp.selectedProperties || !comp.selectedProperties.length) {
            return null;
        }
        prop = comp.selectedProperties[0];
        try {
            depth = prop.propertyDepth;
            while (depth > 0) {
                prop = prop.propertyGroup(1);
                depth -= 1;
            }
            if (prop && (prop.Effects || (prop.property && prop.property("ADBE Effect Parade")))) {
                return prop;
            }
        } catch (e) {}
        return null;
    }

    function getCompSelectedLayers(comp) {
        var layers = [];
        var selected;
        var fromProps;
        var i;
        if (!comp) {
            return layers;
        }
        selected = comp.selectedLayers;
        if (selected && selected.length) {
            for (i = 0; i < selected.length; i += 1) {
                layers.push(selected[i]);
            }
        }
        if (!layers.length && comp.numLayers) {
            for (i = 1; i <= comp.numLayers; i += 1) {
                if (comp.layer(i).selected) {
                    layers.push(comp.layer(i));
                }
            }
        }
        fromProps = getLayerFromSelectedProperties(comp);
        if (fromProps) {
            layers.push(fromProps);
        }
        return dedupeLayers(layers);
    }

    api.resolveMidiSourceLayer = function (comp, options) {
        var selected = getCompSelectedLayers(comp);
        var imported = [];
        var remembered;
        var i;
        var layer;

        for (i = 0; i < selected.length; i += 1) {
            if (isMidiImportSourceLayer(selected[i])) {
                imported.push(selected[i]);
            }
        }
        if (imported.length === 1) {
            rememberMidiActionSourceLayer(imported[0]);
            return imported[0];
        }
        if (imported.length > 1) {
            throw new Error("Select exactly one imported MIDI layer in the composition timeline.");
        }

        remembered = resolveRememberedMidiActionSourceLayer(comp, options);
        if (remembered) {
            return remembered;
        }

        if (selected.length === 1 && isGeneratedMidiActionLayer(selected[0])) {
            throw new Error("Select the imported MIDI source layer, not the generated MIDI Action null.");
        }
        if (selected.length === 1) {
            throw new Error("Select an imported MIDI null layer in the timeline.");
        }
        throw new Error("Select one imported MIDI null layer in the timeline.");
    };

    function isGeneratedMidiActionLayer(layer) {
        var name = String((layer && layer.name) || "");
        return name.indexOf("MIDI Action") === 0;
    }

    function layerHasImportPitchSlider(layer) {
        var resolved = resolvePitchSlider(layer, {});
        return !!(resolved && resolved.slider && sliderHasKeys(resolved.slider));
    }

    function isMidiImportSourceLayer(layer) {
        if (!layer || isGeneratedMidiActionLayer(layer)) {
            return false;
        }
        return layerHasImportPitchSlider(layer);
    }

    function midiActionGlobalStore() {
        return api.getGlobalState();
    }

    function rememberMidiActionSourceLayer(layer) {
        var store = midiActionGlobalStore();
        if (store && layer && layer.name) {
            store.actionSourceLayerName = layer.name;
        }
    }

    function resolveRememberedMidiActionSourceLayer(comp, options) {
        var store = midiActionGlobalStore();
        var name = options && options.sourceLayerName;
        var layer;
        if (!name && store) {
            name = store.actionSourceLayerName;
        }
        if (!name || !comp || !comp.layer) {
            return null;
        }
        try {
            layer = comp.layer(name);
            if (isMidiImportSourceLayer(layer)) {
                rememberMidiActionSourceLayer(layer);
                return layer;
            }
        } catch (e) {}
        return null;
    }

    api.rememberMidiActionSourceLayer = rememberMidiActionSourceLayer;

    function getLayerEffectParade(layer) {
        var parade;
        if (!layer) {
            return null;
        }
        try {
            if (layer.Effects && layer.Effects.numProperties > 0) {
                return layer.Effects;
            }
        } catch (effectsErr) {}
        try {
            parade = layer.property("ADBE Effect Parade");
            if (parade && parade.numProperties > 0) {
                return parade;
            }
        } catch (paradeErr) {}
        try {
            if (layer.Effects) {
                return layer.Effects;
            }
        } catch (fallbackEffectsErr) {}
        return null;
    }

    function isPitchEffectName(name) {
        return /(?:^| )pitch$/i.test(name) || /_pitch$/i.test(name);
    }

    function isVelocityEffectName(name) {
        return /(?:^| )velocity$/i.test(name) || /_vel$/i.test(name);
    }

    function isDurationEffectName(name) {
        return /(?:^| )duration$/i.test(name) || /_dur$/i.test(name);
    }

    function parseMidiChannelFromName(name) {
        var match = String(name || "").match(/ Ch(\d{1,2})(?: |$)/i);
        var legacy = String(name || "").match(/^ch_(\d+)_/i);
        if (match) {
            return parseInt(match[1], 10) - 1;
        }
        if (legacy) {
            return parseInt(legacy[1], 10);
        }
        return -1;
    }

    function parseDrumEffectName(name) {
        var match = String(name || "").match(/^(.*) d(\d+)(?: (.*))?$/);
        var legacy;
        if (match) {
            return {
                prefix: match[1],
                pitch: parseInt(match[2], 10),
                label: match[3] || String(match[2])
            };
        }
        legacy = String(name || "").match(/^(.*) drum (\d+)(?: (.*))?$/);
        if (legacy) {
            return {
                prefix: legacy[1],
                pitch: parseInt(legacy[2], 10),
                label: legacy[3] || String(legacy[2])
            };
        }
        return null;
    }

    function effectSliderProperty(effect) {
        var slider;
        var propNames = ["ADBE Slider Control-0001", "Slider", 1];
        var i;
        if (!effect || !effect.property) {
            return null;
        }
        for (i = 0; i < propNames.length; i += 1) {
            try {
                slider = effect.property(propNames[i]);
                if (slider) {
                    return slider;
                }
            } catch (e) {}
        }
        return null;
    }

    function layerEffectSliderByName(layer, effectName) {
        var limitedName = api.limitEffectName(effectName);
        var found = null;
        forEachLayerEffect(layer, function (effect) {
            if (!found && String(effect.name) === limitedName) {
                found = effectSliderProperty(effect);
            }
        });
        if (found) {
            return found;
        }
        try {
            return layer.effect(limitedName)("Slider");
        } catch (e) {}
        return null;
    }

    function sliderFromEffectGroup(effect) {
        var slider = effectSliderProperty(effect);
        if (slider && sliderHasKeys(slider)) {
            return slider;
        }
        return null;
    }

    function sliderFromLayerEffectByName(layer, effectName) {
        var slider = null;
        if (!layer || !effectName) {
            return null;
        }
        forEachLayerEffect(layer, function (effect) {
            if (String(effect.name) === effectName) {
                slider = sliderFromEffectGroup(effect);
                if (!slider) {
                    slider = effectSliderProperty(effect);
                    if (!sliderHasKeys(slider)) {
                        slider = null;
                    }
                }
            }
        });
        return slider;
    }

    function resolvePitchSlider(layer, options) {
        var resolvedName = null;
        var resolvedSlider = null;
        var prefix;
        var candidate;
        var bestName = null;
        var bestSlider = null;
        var bestKeys = 0;
        var keyCount;
        var name;
        var slider;

        options = options || {};

        if (options.pitchSliderName) {
            resolvedSlider = sliderFromLayerEffectByName(layer, options.pitchSliderName);
            if (resolvedSlider) {
                return {
                    effectName: options.pitchSliderName,
                    slider: resolvedSlider
                };
            }
        }

        prefix = channelPrefixFromLayer(layer);
        if (prefix) {
            candidate = prefix + " pitch";
            resolvedSlider = sliderFromLayerEffectByName(layer, candidate);
            if (resolvedSlider) {
                return {
                    effectName: candidate,
                    slider: resolvedSlider
                };
            }
        }

        forEachLayerEffect(layer, function (effect) {
            name = String(effect.name || "");
            if (!isPitchEffectName(name)) {
                return;
            }
            slider = sliderFromEffectGroup(effect);
            if (!slider) {
                slider = effectSliderProperty(effect);
                if (!sliderHasKeys(slider)) {
                    slider = null;
                }
            }
            if (!slider) {
                return;
            }
            keyCount = sliderKeyCount(slider);
            if (keyCount > bestKeys) {
                bestKeys = keyCount;
                bestName = name;
                bestSlider = slider;
            }
        });
        if (bestSlider) {
            return {
                effectName: bestName,
                slider: bestSlider
            };
        }

        forEachLayerEffect(layer, function (effect) {
            name = String(effect.name || "");
            if (/ CC /i.test(name) || /pitch bend/i.test(name)) {
                return;
            }
            if (parseDrumEffectName(name)) {
                return;
            }
            slider = sliderFromEffectGroup(effect);
            if (!slider) {
                slider = effectSliderProperty(effect);
                if (!sliderHasKeys(slider)) {
                    slider = null;
                }
            }
            if (!slider || !looksLikePitchSlider(slider)) {
                return;
            }
            keyCount = sliderKeyCount(slider);
            if (keyCount > bestKeys) {
                bestKeys = keyCount;
                bestName = name;
                bestSlider = slider;
            }
        });

        return {
            effectName: bestName,
            slider: bestSlider
        };
    }

    function resolveDurationSlider(layer, options) {
        var resolvedSlider = null;
        var prefix;
        var candidate;
        var bestName = null;
        var bestSlider = null;
        var bestKeys = 0;
        var keyCount;
        var name;
        var slider;

        options = options || {};

        if (options.durationSliderName) {
            resolvedSlider = sliderFromLayerEffectByName(layer, options.durationSliderName);
            if (resolvedSlider) {
                return {
                    effectName: options.durationSliderName,
                    slider: resolvedSlider
                };
            }
        }

        prefix = channelPrefixFromLayer(layer);
        if (prefix) {
            candidate = prefix + " duration";
            resolvedSlider = sliderFromLayerEffectByName(layer, candidate);
            if (resolvedSlider) {
                return {
                    effectName: candidate,
                    slider: resolvedSlider
                };
            }
        }

        forEachLayerEffect(layer, function (effect) {
            name = String(effect.name || "");
            if (!isDurationEffectName(name)) {
                return;
            }
            slider = sliderFromEffectGroup(effect);
            if (!slider) {
                slider = effectSliderProperty(effect);
                if (!sliderHasKeys(slider)) {
                    slider = null;
                }
            }
            if (!slider) {
                return;
            }
            keyCount = sliderKeyCount(slider);
            if (keyCount > bestKeys) {
                bestKeys = keyCount;
                bestName = name;
                bestSlider = slider;
            }
        });
        if (bestSlider) {
            return {
                effectName: bestName,
                slider: bestSlider
            };
        }

        forEachLayerEffect(layer, function (effect) {
            name = String(effect.name || "");
            if (/ CC /i.test(name) || /pitch bend/i.test(name)) {
                return;
            }
            if (parseDrumEffectName(name)) {
                return;
            }
            slider = sliderFromEffectGroup(effect);
            if (!slider) {
                slider = effectSliderProperty(effect);
                if (!sliderHasKeys(slider)) {
                    slider = null;
                }
            }
            if (!slider || !looksLikeDurationSlider(slider)) {
                return;
            }
            keyCount = sliderKeyCount(slider);
            if (keyCount > bestKeys) {
                bestKeys = keyCount;
                bestName = name;
                bestSlider = slider;
            }
        });

        return {
            effectName: bestName,
            slider: bestSlider
        };
    }

    function defaultDurationSliderName(layer) {
        var prefix = channelPrefixFromLayer(layer);
        if (prefix) {
            return prefix + " duration";
        }
        return "T01 Ch01 duration";
    }

    function forEachLayerEffect(layer, callback) {
        var parade;
        var i;
        parade = getLayerEffectParade(layer);
        if (!parade) {
            return;
        }
        for (i = 1; i <= parade.numProperties; i += 1) {
            callback(parade.property(i));
        }
    }

    api.countLayerSliderEffects = function (layer) {
        var count = 0;
        forEachLayerEffect(layer, function (effect) {
            if (sliderFromEffectGroup(effect)) {
                count += 1;
            }
        });
        return count;
    };

    function durationFromSliderKey(slider, keyIndex) {
        var startKey;
        var i;
        var endKey;
        startKey = readSliderKey(slider, keyIndex);
        if (!startKey) {
            return 0.05;
        }
        for (i = keyIndex + 1; i <= sliderKeyCount(slider); i += 1) {
            endKey = readSliderKey(slider, i);
            if (endKey && endKey.value === 0) {
                return Math.max(endKey.time - startKey.time, 0.01);
            }
        }
        return 0.05;
    }

    function findVelocitySliderForLayer(layer, pitchEffectName) {
        var prefix = "";
        var found = null;
        var name;
        var slider;
        if (pitchEffectName) {
            prefix = pitchEffectName.replace(/(?:^| )pitch$/i, "").replace(/_pitch$/i, "");
        }
        if (!prefix) {
            prefix = channelPrefixFromLayer(layer) || "";
        }
        if (prefix) {
            found = sliderFromLayerEffectByName(layer, prefix + " velocity");
            if (found) {
                return found;
            }
        }
        forEachLayerEffect(layer, function (effect) {
            name = String(effect.name || "");
            if (!isVelocityEffectName(name)) {
                return;
            }
            if (prefix && name.indexOf(prefix) !== 0) {
                return;
            }
            slider = sliderFromEffectGroup(effect);
            if (!slider) {
                slider = effectSliderProperty(effect);
            }
            if (sliderHasKeys(slider)) {
                found = slider;
            }
        });
        return found;
    }

    function buildPreviewSliderCaches(sourceLayer, options) {
        var resolved = resolvePitchSlider(sourceLayer, options);
        var velSlider = findVelocitySliderForLayer(sourceLayer, resolved.effectName);
        reportPreviewProgress(options, "keyframes", 0, 2, "Reading pitch keyframes");
        return {
            pitch: buildSliderKeyCache(resolved.slider, options),
            velocity: velSlider ? buildSliderKeyCache(velSlider, options) : null
        };
    }

    function collectPitchTriggersFromLayer(sourceLayer, options) {
        var resolved = resolvePitchSlider(sourceLayer, options);
        var pitchSlider = resolved.slider;
        var velSlider = findVelocitySliderForLayer(sourceLayer, resolved.effectName);
        var caches = options.__previewSliderCaches;
        var pitchCache = caches && caches.pitch ? caches.pitch : buildSliderKeyCache(pitchSlider, options);
        var velCache =
            caches && caches.velocity !== undefined
                ? caches.velocity
                : velSlider
                  ? buildSliderKeyCache(velSlider, options)
                  : null;
        var triggers = [];
        var maxNotes = midiActionUsesTriggerLimits(options) ? parsePianoRollMaxNotes(options.maxNotes, 10) : -1;
        var i;
        var time;
        var pitch;
        var velocity;
        var trigger;

        if (!pitchCache.times.length) {
            return triggers;
        }

        reportPreviewProgress(options, "triggers", 0, Math.max(1, pitchCache.times.length), "Collecting triggers");
        for (i = 0; i < pitchCache.times.length; i += 1) {
            if (i % 16 === 0 || i === pitchCache.times.length - 1) {
                reportPreviewProgress(options, null, i + 1, pitchCache.times.length, "Collecting triggers");
            }
            if (maxNotes >= 0 && triggers.length >= maxNotes) {
                break;
            }
            time = pitchCache.times[i];
            pitch = pitchCache.values[i];
            if (pitch <= 0) {
                continue;
            }
            trigger = { time: time };
            if (!midiActionTriggerInTimeRange(trigger, options)) {
                continue;
            }
            if (velCache) {
                velocity = exactValueAtCachedTime(velCache, time, 100);
                if (velocity <= 0) {
                    continue;
                }
            }
            pitch = Math.round(pitch);
            if (!midiActionPitchMatchesFilter(pitch, options)) {
                continue;
            }
            triggers.push({
                time: time,
                label: String(pitch),
                amount: 1,
                source: "pitch",
                value: pitch
            });
        }
        return triggers;
    }

    api.collectPitchValuesFromLayer = function (sourceLayer, options) {
        var resolved = resolvePitchSlider(sourceLayer, options || {});
        var pitchCache = buildSliderKeyCache(resolved.slider);
        var seen = {};
        var pitches = [];
        var i;
        var pitch;

        for (i = 0; i < pitchCache.values.length; i += 1) {
            pitch = Math.round(pitchCache.values[i]);
            if (pitch <= 0 || seen[pitch]) {
                continue;
            }
            seen[pitch] = true;
            pitches.push(pitch);
        }
        pitches.sort(function (a, b) {
            return a - b;
        });
        return {
            pitches: pitches,
            min: pitches.length ? pitches[0] : null,
            max: pitches.length ? pitches[pitches.length - 1] : null,
            pitchSliderName: resolved.effectName
        };
    };

    api.collectMidiActionTriggersFromLayer = function (sourceLayer, options) {
        return filterMidiActionTriggers(sortTriggers(collectPitchTriggersFromLayer(sourceLayer, options)), options);
    };

    function parseValueLiteral(value, fallback) {
        var text;
        var parts;
        var result;
        var i;
        var n;

        if (value === "value") {
            return fallback;
        }
        text = String(value || "").replace(/^\s+|\s+$/g, "");
        if (!text) {
            return fallback;
        }
        if (text.charAt(0) === "[" && text.charAt(text.length - 1) === "]") {
            parts = text.substring(1, text.length - 1).split(",");
            result = [];
            for (i = 0; i < parts.length; i += 1) {
                n = parseFloat(parts[i]);
                if (!isNaN(n)) {
                    result.push(n);
                }
            }
            return result.length ? result : fallback;
        }
        n = parseFloat(text);
        return isNaN(n) ? text : n;
    }

    function cloneValue(value) {
        var copy;
        var i;
        if (value && value.length !== undefined && typeof value !== "string") {
            copy = [];
            for (i = 0; i < value.length; i += 1) {
                copy.push(value[i]);
            }
            return copy;
        }
        return value;
    }

    function addDeltaValue(base, delta) {
        var out;
        var i;
        if (base && base.length !== undefined && typeof base !== "string") {
            out = [];
            for (i = 0; i < base.length; i += 1) {
                out.push(base[i] + delta);
            }
            return out;
        }
        return base + delta;
    }

    function propertyDimensions(property) {
        var sample;
        if (!property) {
            return 1;
        }
        try {
            sample = property.value;
        } catch (valueErr) {
            return 1;
        }
        if (sample && sample.length !== undefined && typeof sample !== "string") {
            return sample.length;
        }
        return 1;
    }

    function fitValueToProperty(property, value) {
        var dims = propertyDimensions(property);
        var out;
        var i;

        if (dims <= 1) {
            if (value && value.length !== undefined && typeof value !== "string") {
                return value.length ? value[0] : 0;
            }
            return value;
        }
        if (typeof value === "number" && !isNaN(value)) {
            out = [];
            for (i = 0; i < dims; i += 1) {
                out.push(value);
            }
            return out;
        }
        if (value && value.length !== undefined && typeof value !== "string") {
            out = [];
            for (i = 0; i < dims; i += 1) {
                out.push(i < value.length ? value[i] : value[value.length - 1]);
            }
            return out;
        }
        return value;
    }

    function mixValue(base, active, progress) {
        var out = [];
        var i;
        var len;
        var basePart;
        var activePart;
        var baseIsArray = base && base.length !== undefined && typeof base !== "string";
        var activeIsArray = active && active.length !== undefined && typeof active !== "string";

        if (baseIsArray || activeIsArray) {
            len = activeIsArray ? active.length : base.length;
            for (i = 0; i < len; i += 1) {
                basePart = baseIsArray ? base[i] : base;
                activePart = activeIsArray ? active[i] : active;
                out.push(basePart + (activePart - basePart) * progress);
            }
            return out;
        }
        return base + (active - base) * progress;
    }

    function interpolationProgress(time, startTime, endTime, falloff) {
        var x;
        if (endTime <= startTime) {
            return 1;
        }
        x = (time - startTime) / (endTime - startTime);
        if (x < 0) {
            x = 0;
        }
        if (x > 1) {
            x = 1;
        }
        if (falloff === "instant") {
            return x >= 1 ? 1 : 0;
        }
        if (falloff === "exponential") {
            return Math.pow(x, 3);
        }
        if (falloff === "ease") {
            return x * x * (3 - 2 * x);
        }
        return x;
    }

    function targetForInterpolatedEvent(index, base, active) {
        return index % 2 ? cloneValue(active) : cloneValue(base);
    }

    function uniqueSortedTimes(times) {
        var sorted = times.sort(function (a, b) {
            return a - b;
        });
        var result = [];
        var last = null;
        var i;
        for (i = 0; i < sorted.length; i += 1) {
            if (last === null || Math.abs(sorted[i] - last) > 0.00001) {
                result.push(sorted[i]);
                last = sorted[i];
            }
        }
        return result;
    }

    function addWindowTimes(times, start, duration, step) {
        var t;
        times.push(start);
        if (duration <= 0) {
            return;
        }
        for (t = start + step; t < start + duration; t += step) {
            times.push(t);
        }
        times.push(start + duration);
    }

    function triggerWindowDuration(options) {
        var duration = numeric(options.duration, 0.2);
        var step = options.frameDuration || 1 / 24;
        return options.falloff === "instant" ? step : duration;
    }

    function addRestKeyframeBeforeNextTrigger(times, currentTriggerTime, nextTriggerTime, options) {
        var step = options.frameDuration || 1 / 24;
        var windowEnd = currentTriggerTime + triggerWindowDuration(options);
        var holdTime;

        if (nextTriggerTime <= windowEnd) {
            return;
        }
        holdTime = nextTriggerTime - step;
        if (holdTime > windowEnd && holdTime < nextTriggerTime) {
            times.push(holdTime);
        }
    }

    function valueAtBakedTime(triggers, time, base, active, options, knownIndex) {
        var n = typeof knownIndex === "number" ? knownIndex : latestTriggerIndex(triggers, time);
        var duration = numeric(options.duration, 0.2);
        var amount = numeric(options.amount, 20);
        var windowDuration = options.falloff === "instant" ? options.frameDuration || duration : duration;
        var to;
        var from;
        var i;
        var f;

        if (options.preset === "toggle") {
            return n >= 0 && (n + 1) % 2 ? cloneValue(active) : cloneValue(base);
        }
        if (options.preset === "interpolate") {
            if (n < 0) {
                return cloneValue(base);
            }
            if (n >= triggers.length - 1) {
                return targetForInterpolatedEvent(n, base, active);
            }
            return mixValue(
                targetForInterpolatedEvent(n, base, active),
                targetForInterpolatedEvent(n + 1, base, active),
                interpolationProgress(time, triggers[n].time, triggers[n + 1].time, options.falloff)
            );
        }
        if (options.preset === "accumulator") {
            to = cloneValue(base);
            for (i = 0; i <= n; i += 1) {
                to = addDeltaValue(to, triggers[i].amount);
            }
            if (n >= 0 && time <= triggers[n].time + windowDuration) {
                from = addDeltaValue(to, -triggers[n].amount);
                f = 1 - falloffValue(time, triggers[n].time, duration, options.falloff, options.frameDuration);
                return addDeltaValue(from, triggers[n].amount * f);
            }
            return to;
        }
        if (n >= 0 && time <= triggers[n].time + windowDuration) {
            return addDeltaValue(
                base,
                amount * falloffValue(time, triggers[n].time, duration, options.falloff, options.frameDuration)
            );
        }
        return cloneValue(base);
    }

    api.buildMidiActionBakePlan = function (triggers, property, comp, options) {
        var step = comp && comp.frameDuration ? comp.frameDuration : numeric(options.previewStep, 1 / 24);
        var duration = numeric(options.duration, 0.2);
        var base = parseValueLiteral(
            options.baseValue,
            property && typeof property.value !== "undefined" ? property.value : 0
        );
        var active = parseValueLiteral(options.activeValue, base);
        var times = [];
        var values = [];
        var i;

        options.frameDuration = step;
        if (options.preset === "toggle") {
            times.push(0);
            for (i = 0; i < triggers.length; i += 1) {
                times.push(triggers[i].time);
            }
        } else if (options.preset === "interpolate") {
            times.push(0);
            for (i = 0; i < triggers.length; i += 1) {
                times.push(triggers[i].time);
                if (options.falloff !== "instant" && i < triggers.length - 1) {
                    addWindowTimes(times, triggers[i].time, triggers[i + 1].time - triggers[i].time, step);
                }
            }
        } else {
            times.push(0);
            for (i = 0; i < triggers.length; i += 1) {
                addWindowTimes(times, triggers[i].time, options.falloff === "instant" ? step : duration, step);
                if (i < triggers.length - 1) {
                    addRestKeyframeBeforeNextTrigger(times, triggers[i].time, triggers[i + 1].time, options);
                }
            }
        }

        times = uniqueSortedTimes(times);
        for (i = 0; i < times.length; i += 1) {
            values.push(fitValueToProperty(property, valueAtBakedTime(triggers, times[i], base, active, options)));
        }

        return { times: times, values: values, hold: options.preset === "toggle" };
    };

    function setHoldInterpolation(property) {
        var i;
        if (!property || !property.setInterpolationTypeAtKey || typeof KeyframeInterpolationType === "undefined") {
            return;
        }
        for (i = 1; i <= property.numKeys; i += 1) {
            property.setInterpolationTypeAtKey(i, KeyframeInterpolationType.HOLD);
        }
    }

    function applyBakePlan(property, plan) {
        var i;
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
        if (plan.hold) {
            setHoldInterpolation(property);
        }
        return true;
    }

    api.bakeMidiActionToSelectedProperties = function (comp, options) {
        var properties;
        var sourceLayer;
        var triggers;
        var applied = 0;
        var skipped = 0;
        var i;
        var plan;
        var prop;

        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before baking MIDI Actions.");
        }
        properties = comp.selectedProperties;
        if (!properties || !properties.length) {
            throw new Error("Select one or more properties to receive baked keyframes.");
        }
        sourceLayer = api.resolveMidiSourceLayer(comp, options);
        options = api.resolveMidiActionOptions(comp, options || {}, sourceLayer);
        options.sourceLayerName = sourceLayer.name;
        options.limitTriggers = true;
        triggers = api.collectMidiActionTriggersFromLayer(sourceLayer, options);
        if (!triggers.length) {
            throw new Error("No MIDI Action triggers matched the current maps.");
        }

        for (i = 0; i < properties.length; i += 1) {
            prop = properties[i];
            if (prop && (prop.setValuesAtTimes || prop.setValueAtTime)) {
                plan = api.buildMidiActionBakePlan(triggers, prop, comp, options || {});
                if (applyBakePlan(prop, plan)) {
                    applied += 1;
                } else {
                    skipped += 1;
                }
            } else {
                skipped += 1;
            }
        }
        return { applied: applied, skipped: skipped, triggers: triggers.length };
    };

    api.mapRange = function (value, inMin, inMax, outMin, outMax, clamp) {
        var ratio;
        if (inMax === inMin) {
            return (outMin + outMax) / 2;
        }
        ratio = (value - inMin) / (inMax - inMin);
        if (clamp) {
            if (ratio < 0) {
                ratio = 0;
            }
            if (ratio > 1) {
                ratio = 1;
            }
        }
        return outMin + (outMax - outMin) * ratio;
    };

    function sliderValueAtKeyTime(slider, time, fallback) {
        var i;
        var key;
        var keyCount;
        var best = null;
        if (!slider) {
            return fallback;
        }
        keyCount = sliderKeyCount(slider);
        for (i = 1; i <= keyCount; i += 1) {
            key = readSliderKey(slider, i);
            if (!key) {
                continue;
            }
            if (Math.abs(key.time - time) < 0.0001) {
                return key.value;
            }
            if (key.time <= time) {
                best = key.value;
            }
        }
        if (best !== null) {
            return best;
        }
        return sliderValueAtTime(slider, time, fallback);
    }

    function isNoteOnKey(velSlider, time) {
        var velocity = sliderValueAtKeyTime(velSlider, time, 100);
        return velocity > 0;
    }

    function channelPrefixFromLayer(layer) {
        var match;
        var prefix = null;
        if (!layer) {
            return null;
        }
        match = String(layer.name || "").match(/T\d{2}\s+Ch\d{2}/i);
        if (match) {
            return match[0];
        }
        match = String(layer.comment || "").match(/T\d{2}\s+Ch\d{2}/i);
        if (match) {
            return match[0];
        }
        forEachLayerEffect(layer, function (effect) {
            var name = String(effect.name || "");
            match = name.match(/^(T\d{2}\s+Ch\d{2})/i);
            if (match && (!prefix || /pitch$/i.test(name))) {
                prefix = match[1];
            }
        });
        return prefix;
    }

    function parseChannelPrefix(prefix) {
        var match = String(prefix || "").match(/T(\d{2})\s+Ch(\d{2})/i);
        if (!match) {
            return null;
        }
        return {
            trackIndex: parseInt(match[1], 10) - 1,
            midiChannel: parseInt(match[2], 10) - 1
        };
    }

    function parsePianoRollMaxNotes(value, fallback) {
        var parsed = numeric(value, fallback);
        if (parsed < 0) {
            return -1;
        }
        return Math.max(1, Math.floor(parsed));
    }

    function pianoRollCanAddMore(notes, maxNotes) {
        return maxNotes < 0 || notes.length < maxNotes;
    }

    function pianoRollHasTimeFilter(options) {
        return !!(
            options &&
            (options.useWorkArea || typeof options.timeStart !== "undefined" || typeof options.timeEnd !== "undefined")
        );
    }

    function pianoRollTimeStart(options) {
        if (!options) {
            return 0;
        }
        return numeric(options.timeStart, 0);
    }

    function pianoRollTimeEnd(options, fallback) {
        if (!options) {
            return fallback;
        }
        if (typeof options.timeEnd !== "undefined") {
            return numeric(options.timeEnd, fallback);
        }
        return fallback;
    }

    function pianoRollNoteInTimeRange(note, options) {
        var start;
        var end;
        var noteStart;
        var noteEnd;
        if (!pianoRollHasTimeFilter(options)) {
            return true;
        }
        start = pianoRollTimeStart(options);
        end = pianoRollTimeEnd(options, 999999);
        noteStart = note.time || 0;
        noteEnd = noteStart + (typeof note.duration !== "undefined" ? note.duration : 0.05);
        return noteStart < end && noteEnd > start;
    }

    api.resolvePianoRollMapOptions = function (comp, options) {
        var resolved = {};
        options = options || {};
        resolved.maxNotes = options.maxNotes;
        resolved.noteHeight = options.noteHeight;
        resolved.useDrumLanes = options.useDrumLanes;
        resolved.useWorkArea = !!options.useWorkArea;
        resolved.xMin = options.xMin;
        resolved.xMax = options.xMax;
        resolved.yMin = options.yMin;
        resolved.yMax = options.yMax;
        resolved.color = options.color;
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

    function appendPitchSliderNotes(pitchSlider, velSlider, durSlider, notes, maxNotes, midiChannel, options) {
        var pitchCache = buildSliderKeyCache(pitchSlider);
        var velCache = buildSliderKeyCache(velSlider);
        var durCache = buildSliderKeyCache(durSlider);
        var i;
        var time;
        var pitch;
        var velocity;
        var duration;
        var noteDraft;

        if (!pitchCache.times.length) {
            return;
        }
        for (i = 0; i < pitchCache.times.length; i += 1) {
            if (!pianoRollCanAddMore(notes, maxNotes)) {
                return;
            }
            time = pitchCache.times[i];
            pitch = pitchCache.values[i];
            if (pitch <= 0 && time === 0) {
                continue;
            }
            if (options && pianoRollHasTimeFilter(options)) {
                noteDraft = { time: time, duration: 0.05 };
                if (!pianoRollNoteInTimeRange(noteDraft, options)) {
                    continue;
                }
            }
            velocity = exactValueAtCachedTime(velCache, time, 100);
            if (velocity <= 0) {
                continue;
            }
            duration = exactValueAtCachedTime(durCache, time, 0);
            if (!duration || duration <= 0) {
                duration = 0.05;
            }
            if (
                !pushPianoRollNote(
                    notes,
                    {
                        time: time,
                        duration: duration,
                        pitch: pitch,
                        velocity: velocity,
                        label: api.isDrumChannel(midiChannel)
                            ? api.getDrumName(Math.round(pitch))
                            : String(Math.round(pitch)),
                        isDrum: api.isDrumChannel(midiChannel),
                        midiChannel: midiChannel
                    },
                    maxNotes,
                    options
                )
            ) {
                return;
            }
        }
    }

    function collectStandardNotesForPrefix(layer, notes, maxNotes, drumChannels, prefix, options, sliderIndex) {
        var channel = parseChannelPrefix(prefix);
        var midiChannel = channel ? channel.midiChannel : parseMidiChannelFromName(prefix);
        var pitchSlider;
        var velSlider;
        var durSlider;

        if (midiChannel >= 0 && drumChannels[midiChannel]) {
            return;
        }
        pitchSlider = sliderFromEffectIndex(sliderIndex, prefix + " pitch");
        velSlider = sliderFromEffectIndex(sliderIndex, prefix + " velocity");
        durSlider = sliderFromEffectIndex(sliderIndex, prefix + " duration");
        appendPitchSliderNotes(pitchSlider, velSlider, durSlider, notes, maxNotes, midiChannel, options);
    }

    function collectDrumNotesForPrefix(layer, notes, maxNotes, prefix, options, sliderIndex) {
        var channel = parseChannelPrefix(prefix);
        var drumChannels = {};
        var parsed;
        var midiChannel;
        var i;
        var j;
        var name;
        var slider;
        var cache;

        if (!channel || !api.isDrumChannel(channel.midiChannel)) {
            return drumChannels;
        }
        midiChannel = channel.midiChannel;
        for (i = 0; i < sliderIndex.names.length; i += 1) {
            if (!pianoRollCanAddMore(notes, maxNotes)) {
                return drumChannels;
            }
            name = sliderIndex.names[i];
            if (name.indexOf(prefix) !== 0) {
                continue;
            }
            parsed = parseDrumEffectName(name);
            if (!parsed) {
                continue;
            }
            slider = sliderIndex.byName[name];
            cache = buildSliderKeyCache(slider);
            if (!cache.times.length) {
                continue;
            }
            drumChannels[midiChannel] = true;
            for (j = 0; j < cache.times.length; j += 1) {
                if (cache.values[j] <= 0) {
                    continue;
                }
                if (
                    !pushPianoRollNote(
                        notes,
                        {
                            time: cache.times[j],
                            duration: durationFromKeyCache(cache, j),
                            pitch: parsed.pitch,
                            velocity: cache.values[j],
                            label: parsed.label,
                            isDrum: true,
                            midiChannel: midiChannel
                        },
                        maxNotes,
                        options
                    )
                ) {
                    return drumChannels;
                }
            }
        }
        return drumChannels;
    }

    api.channelPrefixFromLayer = channelPrefixFromLayer;

    function pushPianoRollNote(notes, note, maxNotes, options) {
        if (options && !pianoRollNoteInTimeRange(note, options)) {
            return true;
        }
        if (!pianoRollCanAddMore(notes, maxNotes)) {
            return false;
        }
        notes.push({
            index: notes.length + 1,
            time: note.time || 0,
            duration: typeof note.duration !== "undefined" ? note.duration : 0.05,
            pitch: note.pitch,
            velocity: note.velocity || 0,
            label: note.label || String(note.pitch),
            isDrum: !!note.isDrum,
            midiChannel: typeof note.midiChannel !== "undefined" ? note.midiChannel : -1,
            trackIndex: typeof note.trackIndex !== "undefined" ? note.trackIndex : -1
        });
        return true;
    }

    function collectDrumSliderNotes(layer, notes, maxNotes, options) {
        var drumChannels = {};
        var parsed;
        var slider;
        var cache;
        var midiChannel;
        var i;
        var j;

        forEachLayerEffect(layer, function (effect) {
            parsed = parseDrumEffectName(effect.name);
            if (!parsed) {
                return;
            }
            slider = sliderFromEffectGroup(effect);
            cache = buildSliderKeyCache(slider);
            if (!cache.times.length) {
                return;
            }
            midiChannel = parseMidiChannelFromName(effect.name);
            if (midiChannel >= 0) {
                drumChannels[midiChannel] = true;
            }
            for (j = 0; j < cache.times.length; j += 1) {
                if (cache.values[j] <= 0) {
                    continue;
                }
                if (
                    !pushPianoRollNote(
                        notes,
                        {
                            time: cache.times[j],
                            duration: durationFromKeyCache(cache, j),
                            pitch: parsed.pitch,
                            velocity: cache.values[j],
                            label: parsed.label,
                            isDrum: midiChannel >= 0 ? api.isDrumChannel(midiChannel) : true,
                            midiChannel: midiChannel
                        },
                        maxNotes,
                        options
                    )
                ) {
                    return;
                }
            }
        });
        return drumChannels;
    }

    function collectStandardSliderNotes(layer, notes, maxNotes, drumChannels, options) {
        var groups = {};
        var prefix;
        var group;
        var midiChannel;
        var pitchSlider;
        var velSlider;
        var durSlider;

        forEachLayerEffect(layer, function (effect) {
            if (isPitchEffectName(effect.name)) {
                prefix = effect.name.replace(/(?:^| )pitch$/i, "").replace(/_pitch$/i, "");
                groups[prefix] = groups[prefix] || {};
                groups[prefix].pitch = sliderFromEffectGroup(effect);
            } else if (isVelocityEffectName(effect.name)) {
                prefix = effect.name.replace(/(?:^| )velocity$/i, "").replace(/_vel$/i, "");
                groups[prefix] = groups[prefix] || {};
                groups[prefix].velocity = sliderFromEffectGroup(effect);
            } else if (isDurationEffectName(effect.name)) {
                prefix = effect.name.replace(/(?:^| )duration$/i, "").replace(/_dur$/i, "");
                groups[prefix] = groups[prefix] || {};
                groups[prefix].duration = sliderFromEffectGroup(effect);
            }
        });

        for (prefix in groups) {
            if (!groups.hasOwnProperty(prefix)) {
                continue;
            }
            group = groups[prefix];
            pitchSlider = group.pitch;
            if (!sliderKeyCount(pitchSlider)) {
                continue;
            }
            midiChannel = parseMidiChannelFromName(prefix);
            if (midiChannel >= 0 && drumChannels[midiChannel]) {
                continue;
            }
            velSlider = group.velocity;
            durSlider = group.duration;
            appendPitchSliderNotes(pitchSlider, velSlider, durSlider, notes, maxNotes, midiChannel, options);
            if (!pianoRollCanAddMore(notes, maxNotes)) {
                return;
            }
        }
    }

    function looksLikePitchSlider(slider) {
        var i;
        var key;
        var total = 0;
        var noteLike = 0;
        var keyCount = sliderKeyCount(slider);
        for (i = 1; i <= keyCount; i += 1) {
            key = readSliderKey(slider, i);
            if (!key) {
                continue;
            }
            if (key.time === 0 && key.value <= 0) {
                continue;
            }
            total += 1;
            if (key.value >= 0 && key.value <= 127 && Math.abs(key.value - Math.round(key.value)) < 0.001) {
                noteLike += 1;
            }
        }
        return total > 0 && noteLike >= total * 0.8;
    }

    function defaultPitchSliderName(layer) {
        var prefix = channelPrefixFromLayer(layer);
        if (prefix) {
            return prefix + " pitch";
        }
        return "T01 Ch01 pitch";
    }

    function detectPitchSliderName(layer) {
        var resolved;
        if (!layer) {
            return null;
        }
        resolved = resolvePitchSlider(layer, {});
        if (resolved && resolved.effectName && sliderHasKeys(resolved.slider)) {
            return resolved.effectName;
        }
        return defaultPitchSliderName(layer);
    }

    api.detectPitchSliderName = detectPitchSliderName;

    api.resolvePitchSliderName = function (layer, options) {
        var cache;
        var cacheKey;
        var prefix;
        var candidate;
        options = options || {};
        if (options.pitchSliderName) {
            return options.pitchSliderName;
        }
        cacheKey = layer && layer.name;
        cache = midiActionGlobalStore();
        if (cacheKey && cache && cache.pitchSliderCache && cache.pitchSliderCache[cacheKey]) {
            return cache.pitchSliderCache[cacheKey];
        }
        prefix = channelPrefixFromLayer(layer);
        if (prefix) {
            candidate = prefix + " pitch";
            if (sliderFromLayerEffectByName(layer, candidate)) {
                if (cache && cacheKey) {
                    cache.pitchSliderCache = cache.pitchSliderCache || {};
                    cache.pitchSliderCache[cacheKey] = candidate;
                }
                return candidate;
            }
        }
        candidate = detectPitchSliderName(layer) || defaultPitchSliderName(layer);
        if (cache && cacheKey) {
            cache.pitchSliderCache = cache.pitchSliderCache || {};
            cache.pitchSliderCache[cacheKey] = candidate;
        }
        return candidate;
    };

    api.resolveDurationSliderName = function (layer, options) {
        var resolved;
        options = options || {};
        if (options.durationSliderName) {
            return options.durationSliderName;
        }
        resolved = resolveDurationSlider(layer, options);
        if (resolved && resolved.effectName && sliderHasKeys(resolved.slider)) {
            return resolved.effectName;
        }
        return defaultDurationSliderName(layer);
    };

    function looksLikeVelocitySlider(slider) {
        var first = readSliderKey(slider, 1);
        return !!(first && first.time === 0 && first.value === 0);
    }

    function looksLikeDurationSlider(slider) {
        var i;
        var key;
        var total = 0;
        var durLike = 0;
        var keyCount = sliderKeyCount(slider);
        for (i = 1; i <= keyCount; i += 1) {
            key = readSliderKey(slider, i);
            if (!key) {
                continue;
            }
            total += 1;
            if (key.value > 0 && key.value <= 120) {
                durLike += 1;
            }
        }
        return total > 0 && durLike >= total * 0.8 && !looksLikePitchSlider(slider);
    }

    function looksLikeDrumHitSlider(slider) {
        var i;
        var key;
        var keyCount = sliderKeyCount(slider);
        var hits = 0;
        for (i = 1; i <= keyCount; i += 1) {
            key = readSliderKey(slider, i);
            if (key && key.value > 0) {
                hits += 1;
            }
        }
        return hits > 0 && !looksLikePitchSlider(slider) && !looksLikeVelocitySlider(slider);
    }

    function collectNotesByHeuristicScan(layer, notes, maxNotes, options) {
        var prefix = channelPrefixFromLayer(layer);
        var channel = parseChannelPrefix(prefix || "");
        var midiChannel = channel ? channel.midiChannel : parseMidiChannelFromName(prefix || "");
        var pitchSlider = null;
        var velSlider = null;
        var durSlider = null;
        var unknown = [];
        var i;
        var j;
        var cache;
        var name;
        var slider;
        var parsed;
        var key;
        var keyCount;

        forEachLayerEffect(layer, function (effect) {
            name = String(effect.name || "");
            slider = sliderFromEffectGroup(effect);
            if (!sliderHasKeys(slider)) {
                return;
            }
            if (/ CC /i.test(name) || /pitch bend/i.test(name)) {
                return;
            }
            parsed = parseDrumEffectName(name);
            if (parsed) {
                cache = buildSliderKeyCache(slider);
                for (j = 0; j < cache.times.length; j += 1) {
                    if (cache.values[j] <= 0) {
                        continue;
                    }
                    if (
                        !pushPianoRollNote(
                            notes,
                            {
                                time: cache.times[j],
                                duration: durationFromKeyCache(cache, j),
                                pitch: parsed.pitch,
                                velocity: cache.values[j],
                                label: parsed.label,
                                isDrum: true,
                                midiChannel: midiChannel
                            },
                            maxNotes,
                            options
                        )
                    ) {
                        return;
                    }
                }
                return;
            }
            if (isPitchEffectName(name)) {
                pitchSlider = slider;
                return;
            }
            if (isVelocityEffectName(name)) {
                velSlider = slider;
                return;
            }
            if (isDurationEffectName(name)) {
                durSlider = slider;
                return;
            }
            if (looksLikePitchSlider(slider)) {
                pitchSlider = slider;
                return;
            }
            if (looksLikeVelocitySlider(slider)) {
                velSlider = slider;
                return;
            }
            if (looksLikeDurationSlider(slider)) {
                durSlider = slider;
                return;
            }
            if (looksLikeDrumHitSlider(slider) && api.isDrumChannel(midiChannel)) {
                cache = buildSliderKeyCache(slider);
                for (j = 0; j < cache.times.length; j += 1) {
                    if (cache.values[j] <= 0) {
                        continue;
                    }
                    if (
                        !pushPianoRollNote(
                            notes,
                            {
                                time: cache.times[j],
                                duration: durationFromKeyCache(cache, j),
                                pitch: 36,
                                velocity: cache.values[j],
                                label: "Drum",
                                isDrum: true,
                                midiChannel: midiChannel
                            },
                            maxNotes,
                            options
                        )
                    ) {
                        return;
                    }
                }
                return;
            }
            unknown.push(slider);
        });

        if (!pitchSlider) {
            for (i = 0; i < unknown.length; i += 1) {
                if (looksLikePitchSlider(unknown[i])) {
                    pitchSlider = unknown[i];
                    break;
                }
            }
        }
        if (!velSlider) {
            for (i = 0; i < unknown.length; i += 1) {
                if (looksLikeVelocitySlider(unknown[i])) {
                    velSlider = unknown[i];
                    break;
                }
            }
        }
        if (!durSlider) {
            for (i = 0; i < unknown.length; i += 1) {
                if (looksLikeDurationSlider(unknown[i]) && unknown[i] !== pitchSlider && unknown[i] !== velSlider) {
                    durSlider = unknown[i];
                    break;
                }
            }
        }
        if (pitchSlider) {
            appendPitchSliderNotes(pitchSlider, velSlider, durSlider, notes, maxNotes, midiChannel, options);
        }
    }

    api.collectPianoRollNotesFromLayer = function (layer, options) {
        options = options || {};
        var maxNotes = parsePianoRollMaxNotes(options.maxNotes, 10);
        var notes = [];
        var drumChannels = {};
        var prefix;
        var sliderIndex;

        if (!layer) {
            return notes;
        }

        sliderIndex = buildLayerEffectSliderIndex(layer);
        prefix = channelPrefixFromLayer(layer);
        if (prefix) {
            drumChannels = collectDrumNotesForPrefix(layer, notes, maxNotes, prefix, options, sliderIndex);
            if (pianoRollCanAddMore(notes, maxNotes)) {
                collectStandardNotesForPrefix(layer, notes, maxNotes, drumChannels, prefix, options, sliderIndex);
            }
        }

        if (notes.length === 0) {
            collectNotesByHeuristicScan(layer, notes, maxNotes, options);
        }

        if (notes.length === 0) {
            drumChannels = collectDrumSliderNotes(layer, notes, maxNotes, options);
            if (pianoRollCanAddMore(notes, maxNotes)) {
                collectStandardSliderNotes(layer, notes, maxNotes, drumChannels, options);
            }
        }

        return notes;
    };

    function layerHasNamedDrumSliderEffects(layer, prefix) {
        var found = false;
        if (!layer) {
            return false;
        }
        forEachLayerEffect(layer, function (effect) {
            var name;
            var slider;
            if (found) {
                return;
            }
            name = String(effect.name || "");
            if (prefix && name.indexOf(prefix) !== 0) {
                return;
            }
            if (!parseDrumEffectName(name)) {
                return;
            }
            slider = sliderFromEffectGroup(effect);
            if (!slider) {
                slider = effectSliderProperty(effect);
            }
            if (slider) {
                found = true;
            }
        });
        return found;
    }

    api.layerHasNamedDrumSliders = function (layer) {
        var prefix = channelPrefixFromLayer(layer);
        if (layerHasNamedDrumSliderEffects(layer, prefix)) {
            return true;
        }
        return layerHasNamedDrumSliderEffects(layer, null);
    };

    api.collectNamedDrumPadGroupsFromLayer = function (layer, options) {
        var groups = {};
        var order = [];
        var result = [];
        var prefix;
        var pitchFilter;
        var i;
        var j;
        var name;
        var parsed;
        var slider;
        var cache;
        var pitch;
        var group;
        var hit;

        options = options || {};
        prefix = channelPrefixFromLayer(layer);
        pitchFilter = options.pitchFilter || [];

        if (!layer) {
            return result;
        }

        forEachLayerEffect(layer, function (effect) {
            name = String(effect.name || "");
            if (prefix && name.indexOf(prefix) !== 0) {
                return;
            }
            parsed = parseDrumEffectName(name);
            if (!parsed) {
                return;
            }
            pitch = Math.round(parsed.pitch);
            if (pitchFilter.length && !pitchMatchesFilter(pitch, pitchFilter)) {
                return;
            }
            slider = sliderFromEffectGroup(effect);
            if (!slider) {
                slider = effectSliderProperty(effect);
            }
            cache = buildSliderKeyCache(slider);
            if (!cache.times.length) {
                return;
            }
            if (!groups[name]) {
                groups[name] = {
                    pitch: pitch,
                    label: parsed.label || api.getDrumName(pitch),
                    effectName: name,
                    hits: []
                };
                order.push(name);
            }
            group = groups[name];
            for (j = 0; j < cache.times.length; j += 1) {
                if (cache.values[j] <= 0) {
                    continue;
                }
                hit = {
                    time: cache.times[j],
                    duration: durationFromKeyCache(cache, j),
                    velocity: cache.values[j]
                };
                if (
                    options.useWorkArea &&
                    typeof options.timeStart !== "undefined" &&
                    (hit.time < options.timeStart || hit.time >= options.timeEnd)
                ) {
                    continue;
                }
                group.hits.push(hit);
            }
        });

        order.sort(function (a, b) {
            return groups[a].pitch - groups[b].pitch;
        });
        for (i = 0; i < order.length; i += 1) {
            group = groups[order[i]];
            if (group.hits.length > 0) {
                result.push(group);
            }
        }
        return result;
    };

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

    api.collectDrumHitNotesFromLayer = function (layer, options) {
        var maxNotes;
        var notes = [];
        var drumChannels = {};
        var prefix;
        var sliderIndex;
        var channel;
        var filtered = [];
        var hasNamedDrumEffects = false;
        var i;
        var note;

        options = options || {};
        maxNotes = parsePianoRollMaxNotes(options.maxNotes, -1);

        if (!layer) {
            return notes;
        }

        sliderIndex = buildLayerEffectSliderIndex(layer);
        prefix = channelPrefixFromLayer(layer);
        hasNamedDrumEffects = api.layerHasNamedDrumSliders(layer);
        if (prefix) {
            channel = parseChannelPrefix(prefix);
            drumChannels = collectDrumNotesForPrefix(layer, notes, maxNotes, prefix, options, sliderIndex);
            if (
                pianoRollCanAddMore(notes, maxNotes) &&
                !hasNamedDrumEffects &&
                !(channel && drumChannels[channel.midiChannel])
            ) {
                collectStandardNotesForPrefix(layer, notes, maxNotes, drumChannels, prefix, options, sliderIndex);
            }
        }

        if (notes.length === 0 && !hasNamedDrumEffects) {
            drumChannels = collectDrumSliderNotes(layer, notes, maxNotes, options);
            if (pianoRollCanAddMore(notes, maxNotes) && !Object.keys(drumChannels).length) {
                collectStandardSliderNotes(layer, notes, maxNotes, drumChannels, options);
            }
        }

        for (i = 0; i < notes.length; i += 1) {
            note = notes[i];
            if (note.isDrum && note.velocity > 0 && Math.round(note.pitch) > 0) {
                filtered.push(note);
            }
        }
        return filtered;
    };

    function inferPianoRollDuration(notes, compLike) {
        var maxTime = 0;
        var i;
        for (i = 0; i < notes.length; i += 1) {
            maxTime = Math.max(maxTime, notes[i].time + notes[i].duration);
        }
        if (maxTime > 0) {
            return maxTime;
        }
        return compLike && compLike.duration ? compLike.duration : 1;
    }

    function pianoRollNoteEndTime(note) {
        return (note.time || 0) + (typeof note.duration !== "undefined" ? note.duration : 0.05);
    }

    function computePianoRollContentTimeBounds(notes) {
        var i;
        var note;
        var noteStart;
        var noteEnd;
        var start = null;
        var end = 0;
        if (!notes || !notes.length) {
            return null;
        }
        for (i = 0; i < notes.length; i += 1) {
            note = notes[i];
            noteStart = note.time || 0;
            noteEnd = pianoRollNoteEndTime(note);
            if (start === null || noteStart < start) {
                start = noteStart;
            }
            if (noteEnd > end) {
                end = noteEnd;
            }
        }
        return { timeStart: start, timeEnd: end };
    }

    function resolvePianoRollTimeRange(notes, options, fallbackEnd) {
        var bounds;
        var timeStart;
        var timeEnd;
        var minSpan = 0.001;
        if (pianoRollHasTimeFilter(options)) {
            timeStart = pianoRollTimeStart(options);
            timeEnd = pianoRollTimeEnd(options, fallbackEnd);
        } else {
            bounds = computePianoRollContentTimeBounds(notes);
            if (bounds) {
                timeStart = bounds.timeStart;
                timeEnd = bounds.timeEnd;
            } else {
                timeStart = 0;
                timeEnd = fallbackEnd;
            }
        }
        if (timeEnd <= timeStart) {
            timeEnd = timeStart + minSpan;
        }
        return { timeStart: timeStart, timeEnd: timeEnd };
    }

    api.collectPianoRollNotes = function (midi, options) {
        options = options || {};
        var maxNotes = parsePianoRollMaxNotes(options.maxNotes, 10);
        var notes = [];
        var i;
        var note;
        var entry;
        for (i = 0; i < midi.notes.length; i += 1) {
            if (!pianoRollCanAddMore(notes, maxNotes)) {
                break;
            }
            note = midi.notes[i];
            entry = {
                time: note.time || 0,
                duration: typeof note.duration !== "undefined" ? note.duration : 0.05,
                pitch: note.pitch,
                velocity: note.velocity || note.vel || 0,
                label: note.drumName || String(note.pitch),
                isDrum: api.isDrumChannel(note.midiChannel),
                midiChannel: note.midiChannel,
                trackIndex: note.trackIndex
            };
            if (!pianoRollNoteInTimeRange(entry, options)) {
                continue;
            }
            notes.push({
                index: notes.length + 1,
                time: entry.time,
                duration: entry.duration,
                pitch: entry.pitch,
                velocity: entry.velocity,
                label: entry.label,
                isDrum: entry.isDrum,
                midiChannel: entry.midiChannel,
                trackIndex: entry.trackIndex
            });
        }
        return notes;
    };

    function uniqueLabels(notes) {
        var labels = [];
        var seen = {};
        var i;
        for (i = 0; i < notes.length; i += 1) {
            if (notes[i].isDrum && !seen[notes[i].label]) {
                labels.push(notes[i].label);
                seen[notes[i].label] = true;
            }
        }
        labels.sort();
        return labels;
    }

    function labelIndex(labels, label) {
        var i;
        for (i = 0; i < labels.length; i += 1) {
            if (labels[i] === label) {
                return i;
            }
        }
        return -1;
    }

    function computePianoRollPitchRange(notes, options) {
        var min = numeric(options.pitchRangeMin, -1);
        var max = numeric(options.pitchRangeMax, -1);
        var padding = numeric(options.pitchRangePadding, 1);
        var i;
        var note;
        if (min >= 0 && max >= min) {
            return { min: min, max: max };
        }
        min = 127;
        max = 0;
        for (i = 0; i < notes.length; i += 1) {
            note = notes[i];
            if (note.isDrum && options.useDrumLanes === false) {
                continue;
            }
            if (typeof note.pitch !== "number") {
                continue;
            }
            if (note.pitch < min) {
                min = note.pitch;
            }
            if (note.pitch > max) {
                max = note.pitch;
            }
        }
        if (min > max) {
            if (options.useDrumLanes) {
                min = 35;
                max = 81;
            } else {
                min = 0;
                max = 127;
            }
        } else {
            min = Math.max(0, min - padding);
            max = Math.min(127, max + padding);
        }
        return { min: min, max: max };
    }

    api.pianoRollYForPitch = function (pitch, rangeMin, rollBottom, laneHeight) {
        return rollBottom - (pitch - rangeMin + 0.5) * laneHeight;
    };

    function pianoRollLaneMetrics(notes, options, yMin, yMax, noteHeight) {
        var pitchRange = computePianoRollPitchRange(notes, options);
        var numLanes = pitchRange.max - pitchRange.min + 1;
        var rollBottom = yMin;
        var rollTop = yMax;
        var rollHeight = rollBottom - rollTop;
        var laneHeight = noteHeight;
        if (numLanes * laneHeight > rollHeight) {
            laneHeight = rollHeight / numLanes;
        }
        return {
            pitchRange: pitchRange,
            laneHeight: laneHeight,
            rollBottom: rollBottom
        };
    }

    api.buildPianoRollRects = function (source, compLike, options) {
        compLike = compLike || {};
        if (compLike instanceof CompItem) {
            options = api.resolvePianoRollMapOptions(compLike, options || {});
        } else {
            options = options || {};
        }
        var notes;
        var timeRange;
        var fallbackEnd;
        if (options.notes && options.notes.length) {
            notes = options.notes;
            fallbackEnd = inferPianoRollDuration(notes, compLike);
        } else if (source && source.Effects) {
            notes = api.collectPianoRollNotesFromLayer(source, options);
            fallbackEnd = inferPianoRollDuration(notes, compLike);
        } else {
            notes = api.collectPianoRollNotes(source, options);
            fallbackEnd = inferPianoRollDuration(notes, compLike);
            if (!notes.length) {
                fallbackEnd = source.durationSeconds || compLike.duration || 1;
            }
        }
        timeRange = resolvePianoRollTimeRange(notes, options, fallbackEnd);
        var width = compLike.width || 1920;
        var height = compLike.height || 1080;
        var xMin = numeric(options.xMin, 100);
        var xMax = numeric(options.xMax, width - 100);
        var yMin = numeric(options.yMin, height - 100);
        var yMax = numeric(options.yMax, 100);
        var noteHeight = numeric(options.noteHeight, 6);
        var timeStart = timeRange.timeStart;
        var timeEnd = timeRange.timeEnd;
        var laneMetrics = pianoRollLaneMetrics(notes, options, yMin, yMax, noteHeight);
        var pitchRange = laneMetrics.pitchRange;
        var laneHeight = laneMetrics.laneHeight;
        var rollBottom = laneMetrics.rollBottom;
        var barHeight = laneHeight * 0.85;
        var rects = [];
        var i;
        var note;
        var y;
        var startX;
        var endX;

        reportPreviewProgress(options, "rects", 0, Math.max(1, notes.length), "Building note bars");
        for (i = 0; i < notes.length; i += 1) {
            if (i % 12 === 0 || i === notes.length - 1) {
                reportPreviewProgress(options, null, i + 1, notes.length, "Building note bars");
            }
            note = notes[i];
            if (note.isDrum && options.useDrumLanes === false) {
                continue;
            }
            if (typeof note.pitch !== "number") {
                continue;
            }
            if (note.pitch < pitchRange.min || note.pitch > pitchRange.max) {
                continue;
            }
            startX = api.mapRange(note.time, timeStart, timeEnd, xMin, xMax, true);
            endX = api.mapRange(note.time + note.duration, timeStart, timeEnd, xMin, xMax, true);
            y = api.pianoRollYForPitch(note.pitch, pitchRange.min, rollBottom, laneHeight);
            rects.push({
                index: note.index,
                x: startX + Math.max(endX - startX, 1) / 2,
                y: y,
                left: startX,
                right: endX,
                width: Math.max(endX - startX, 1),
                height: barHeight,
                opacity: api.mapRange(note.velocity, 1, 127, 30, 100, true),
                label: note.label,
                pitch: note.pitch,
                time: note.time,
                duration: note.duration,
                velocity: note.velocity,
                isDrum: note.isDrum,
                pitchRangeMin: pitchRange.min,
                pitchRangeMax: pitchRange.max,
                laneHeight: laneHeight
            });
        }
        return rects;
    };

    function escapePreviewHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function pianoRollPreviewColor(rect) {
        if (rect.isDrum) {
            return "#f59e0b";
        }
        return "#38bdf8";
    }

    function pianoRollPreviewDescription(options, noteCount) {
        var parts = ["Showing " + noteCount + " mapped note bars."];
        if (options && options.useWorkArea) {
            parts.push("Limited to the current work area.");
        }
        return parts.join(" ");
    }

    api.buildPianoRollPreviewLayout = function (source, compLike, options) {
        var svgWidth;
        var svgHeight;
        var mapOptions;
        var rects;
        var sourceLabel;
        options = options || {};
        compLike = compLike || {};
        svgWidth = numeric(options.previewWidth, 1400);
        svgHeight = numeric(options.previewHeight, 760);
        mapOptions = {
            maxNotes: options.maxNotes,
            noteHeight: options.noteHeight,
            useDrumLanes: options.useDrumLanes,
            useWorkArea: options.useWorkArea,
            timeStart: options.timeStart,
            timeEnd: options.timeEnd,
            xMin: numeric(options.xMin, 70),
            xMax: numeric(options.xMax, svgWidth - 40),
            yMin: numeric(options.yMin, svgHeight - 50),
            yMax: numeric(options.yMax, 40)
        };
        reportPreviewProgress(options, "notes", 0, 1, "Collecting notes");
        if (source && source.Effects) {
            mapOptions.notes = api.collectPianoRollNotesFromLayer(source, mapOptions);
        }
        reportPreviewProgress(options, "notes", 1, 1, "Collecting notes");
        reportPreviewProgress(options, "rects");
        rects = api.buildPianoRollRects(source, compLike, mapOptions);
        reportPreviewProgress(options, "finalize", 1, 1, "Finishing preview");
        sourceLabel = options.sourceLabel || (source && source.name) || "MIDI";
        return {
            rects: rects,
            noteCount: rects.length,
            bounds: {
                left: mapOptions.xMin,
                right: mapOptions.xMax,
                top: mapOptions.yMax,
                bottom: mapOptions.yMin
            },
            sourceLabel: sourceLabel,
            description: pianoRollPreviewDescription(options, rects.length)
        };
    };

    api.buildPianoRollPreviewHtml = function (source, compLike, options) {
        var svgWidth;
        var svgHeight;
        var layout;
        var bars;
        var i;
        var rect;
        var x;
        var y;
        var title;
        var html;
        options = options || {};
        compLike = compLike || {};
        svgWidth = numeric(options.previewWidth, 1400);
        svgHeight = numeric(options.previewHeight, 760);
        layout = api.buildPianoRollPreviewLayout(source, compLike, options);
        bars = [];
        for (i = 0; i < layout.rects.length; i += 1) {
            rect = layout.rects[i];
            x = rect.x - rect.width / 2;
            y = rect.y - rect.height / 2;
            title = escapePreviewHtml(
                rect.label +
                    " pitch " +
                    rect.pitch +
                    " at " +
                    rect.time.toFixed(3) +
                    "s, duration " +
                    rect.duration.toFixed(3) +
                    "s"
            );
            bars.push(
                '<rect x="' +
                    x.toFixed(2) +
                    '" y="' +
                    y.toFixed(2) +
                    '" width="' +
                    rect.width.toFixed(2) +
                    '" height="' +
                    rect.height.toFixed(2) +
                    '" rx="1.5" fill="' +
                    pianoRollPreviewColor(rect) +
                    '" opacity="' +
                    (rect.opacity / 100).toFixed(2) +
                    '"><title>' +
                    title +
                    "</title></rect>"
            );
        }
        html =
            "<!doctype html>\n" +
            '<html lang="en">\n' +
            "<head>\n" +
            '  <meta charset="utf-8">\n' +
            '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
            "  <title>ReOm MIDI Piano Roll Map</title>\n" +
            "  <style>\n" +
            "    body { margin: 28px; background: #111318; color: #e8eaf0; font: 14px/1.45 system-ui, sans-serif; }\n" +
            "    h1 { margin: 0 0 8px; }\n" +
            "    svg { width: 100%; height: auto; background: #101218; border: 1px solid #2c313c; border-radius: 10px; }\n" +
            "    .axis { stroke: #657086; stroke-width: 1; }\n" +
            "    code { color: #bae6fd; }\n" +
            "  </style>\n" +
            "</head>\n" +
            "<body>\n" +
            "  <h1>ReOm MIDI Piano Roll Map</h1>\n" +
            "  <p>Source: <code>" +
            escapePreviewHtml(layout.sourceLabel) +
            "</code>. " +
            escapePreviewHtml(layout.description) +
            "</p>\n" +
            '  <svg viewBox="0 0 ' +
            svgWidth +
            " " +
            svgHeight +
            '" role="img" aria-label="MIDI piano roll map">\n' +
            '    <line x1="70" y1="' +
            (svgHeight - 50) +
            '" x2="' +
            (svgWidth - 40) +
            '" y2="' +
            (svgHeight - 50) +
            '" class="axis"></line>\n' +
            '    <line x1="70" y1="40" x2="70" y2="' +
            (svgHeight - 50) +
            '" class="axis"></line>\n' +
            "    " +
            bars.join("\n    ") +
            "\n" +
            "  </svg>\n" +
            "</body>\n" +
            "</html>\n";
        return {
            html: html,
            rects: layout.rects,
            noteCount: layout.noteCount,
            bounds: layout.bounds,
            sourceLabel: layout.sourceLabel,
            description: layout.description
        };
    };

    api.previewPianoRollMap = function (comp, sourceLayer, options) {
        var preview;
        options = options || {};
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before previewing a piano-roll map.");
        }
        if (!sourceLayer) {
            throw new Error("Select an imported MIDI layer before previewing a piano roll.");
        }
        options = api.resolvePianoRollMapOptions(comp, options);
        options.sourceLabel = sourceLayer.name;
        try {
            preview = api.buildPianoRollPreviewLayout(sourceLayer, comp, options);
            if (!preview.noteCount) {
                throw new Error(
                    'No note keyframes were found on layer "' +
                        sourceLayer.name +
                        '". Found ' +
                        api.countLayerSliderEffects(sourceLayer) +
                        " keyed slider effects" +
                        (api.channelPrefixFromLayer(sourceLayer)
                            ? " for " + api.channelPrefixFromLayer(sourceLayer)
                            : "") +
                        (options.useWorkArea ? " inside the current work area" : "") +
                        ". Select the null layer created by Import MIDI."
                );
            }
        } finally {
            if (api.endPreviewProgress && options.__previewProgressHook) {
                api.endPreviewProgress(options.__previewProgressHook);
            }
        }
        if (api.showPianoRollPreviewInPanel) {
            api.showPianoRollPreviewInPanel(preview);
        }
        return {
            notes: preview.noteCount,
            rects: preview.rects,
            layout: preview
        };
    };

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

    function setPropValue(group, name, value) {
        var prop = safeProperty(group, name);
        if (prop && prop.setValue) {
            try {
                prop.setValue(value);
                return true;
            } catch (e) {}
        }
        return false;
    }

    function setPropExpression(prop, expression) {
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
        } catch (e) {}
        return false;
    }

    function pianoRollControllerLayerName(sourceLayer) {
        var suffix = sourceLayer && sourceLayer.name ? " " + sourceLayer.name : "";
        return api.limitEffectName("MIDI Piano Roll" + suffix);
    }

    function pianoRollControlExpression(effectName, propertyName) {
        return (
            "try { thisLayer.parent.effect(" +
            quote(effectName) +
            ")(" +
            quote(propertyName) +
            "); } catch (e) { value; }"
        );
    }

    function pianoRollMasterOpacityExpression(controllerEffects) {
        if (controllerEffects && controllerEffects.fillOpacity) {
            return (
                "try { var c = thisLayer.parent; c.effect(" +
                quote(controllerEffects.masterOpacity) +
                ')("Slider") * ' +
                "c.effect(" +
                quote(controllerEffects.fillOpacity) +
                ')("Slider") / 100; } catch (e) { 100; }'
            );
        }
        return (
            "try { thisLayer.parent.effect(" +
            quote(controllerEffects.masterOpacity) +
            ')("Slider"); } catch (e) { 100; }'
        );
    }

    function addPianoRollControllerSlider(layer, name, value) {
        var fx;
        var sliderProp;
        if (!layer || !layer.Effects || !layer.Effects.addProperty) {
            return null;
        }
        try {
            fx = layer.Effects.addProperty("Slider Control");
        } catch (addSliderErr) {
            try {
                fx = layer.Effects.addProperty("ADBE Slider Control");
            } catch (legacySliderErr) {
                return null;
            }
        }
        fx.name = api.limitEffectName(name);
        sliderProp = safeProperty(fx, 1) || safeProperty(fx, "Slider");
        if (sliderProp && sliderProp.setValue) {
            try {
                sliderProp.setValue(value);
            } catch (setValueErr) {}
        }
        return fx;
    }

    function addPianoRollControllerColor(layer, name, rgb) {
        var fx;
        var colorProp;
        if (!layer || !layer.Effects || !layer.Effects.addProperty) {
            return null;
        }
        fx = layer.Effects.addProperty("ADBE Color Control");
        fx.name = api.limitEffectName(name);
        try {
            colorProp = fx.property("Color");
        } catch (colorErr) {
            colorProp = null;
        }
        if (!colorProp) {
            try {
                colorProp = fx.property(1);
            } catch (colorErr2) {
                colorProp = null;
            }
        }
        if (colorProp && colorProp.setValue) {
            colorProp.setValue(rgb);
        } else {
            setPropValue(fx, "Color", rgb);
        }
        return fx;
    }

    function createPianoRollControllerNull(comp, sourceLayer, options) {
        var layer;
        var fx;
        var info;
        options = options || {};
        if (!comp || !comp.layers || !comp.layers.addNull) {
            return null;
        }
        layer = comp.layers.addNull();
        layer.name = options.controllerName || pianoRollControllerLayerName(sourceLayer);
        layer.comment =
            "Piano roll map controller\nParent for generated note bars.\nAdjust fill, stroke, and master opacity for all notes.";
        info = {
            layer: layer,
            name: layer.name,
            effects: {}
        };
        if (options.includeFillControls !== false) {
            fx = addPianoRollControllerColor(layer, "Fill Color", options.fillColor || [0.22, 0.74, 0.97]);
            info.effects.fillColor = fx && fx.name ? fx.name : "Fill Color";
            fx = addPianoRollControllerSlider(
                layer,
                "Fill Opacity",
                typeof options.fillOpacity !== "undefined" ? options.fillOpacity : 100
            );
            info.effects.fillOpacity = fx && fx.name ? fx.name : "Fill Opacity";
        }
        fx = addPianoRollControllerColor(layer, "Stroke Color", options.strokeColor || [1, 1, 1]);
        info.effects.strokeColor = fx && fx.name ? fx.name : "Stroke Color";
        fx = addPianoRollControllerSlider(
            layer,
            "Stroke Opacity",
            typeof options.strokeOpacity !== "undefined" ? options.strokeOpacity : 100
        );
        info.effects.strokeOpacity = fx && fx.name ? fx.name : "Stroke Opacity";
        fx = addPianoRollControllerSlider(
            layer,
            "Stroke Width",
            typeof options.strokeWidth !== "undefined" ? options.strokeWidth : 0
        );
        info.effects.strokeWidth = fx && fx.name ? fx.name : "Stroke Width";
        fx = addPianoRollControllerSlider(
            layer,
            "Master Opacity",
            typeof options.masterOpacity !== "undefined" ? options.masterOpacity : 100
        );
        info.effects.masterOpacity = fx && fx.name ? fx.name : "Master Opacity";
        return info;
    }

    function shapeContentMatches(prop, matchName) {
        return prop && (prop.matchName === matchName || prop.name === matchName);
    }

    function visitShapeContentProps(layer, visitor) {
        var contents;
        var i;
        var prop;
        var sub;
        var j;
        var subProp;
        contents = safeProperty(layer, "ADBE Root Vectors Group");
        if (!contents || !contents.numProperties) {
            return null;
        }
        for (i = 1; i <= contents.numProperties; i += 1) {
            prop = safeProperty(contents, i);
            if (!prop) {
                continue;
            }
            if (visitor(prop)) {
                return prop;
            }
            if (shapeContentMatches(prop, "ADBE Vector Group")) {
                sub = safeProperty(prop, "ADBE Vectors Group") || safeProperty(prop, 2);
                if (sub && sub.numProperties) {
                    for (j = 1; j <= sub.numProperties; j += 1) {
                        subProp = safeProperty(sub, j);
                        if (subProp && visitor(subProp)) {
                            return subProp;
                        }
                    }
                }
            }
        }
        return null;
    }

    function findShapeFill(layer) {
        return visitShapeContentProps(layer, function (prop) {
            return shapeContentMatches(prop, "ADBE Vector Graphic - Fill");
        });
    }

    function findShapeStroke(layer) {
        return visitShapeContentProps(layer, function (prop) {
            return shapeContentMatches(prop, "ADBE Vector Graphic - Stroke");
        });
    }

    function findLayerOpacity(layer) {
        var transform = safeProperty(layer, "ADBE Transform Group");
        return safeProperty(transform, "ADBE Opacity");
    }

    function shapeFillColorProp(fill) {
        return safeProperty(fill, "ADBE Vector Fill Color") || safeProperty(fill, "Color") || safeProperty(fill, 4);
    }

    function shapeStrokeColorProp(stroke) {
        return (
            safeProperty(stroke, "ADBE Vector Stroke Color") || safeProperty(stroke, "Color") || safeProperty(stroke, 4)
        );
    }

    function shapeStrokeOpacityProp(stroke) {
        return (
            safeProperty(stroke, "ADBE Vector Stroke Opacity") ||
            safeProperty(stroke, "Opacity") ||
            safeProperty(stroke, 5)
        );
    }

    function shapeStrokeWidthProp(stroke) {
        return (
            safeProperty(stroke, "ADBE Vector Stroke Width") ||
            safeProperty(stroke, "Stroke Width") ||
            safeProperty(stroke, 6)
        );
    }

    function wireShapeStrokeFromController(layer, controllerEffects) {
        var stroke;
        if (!layer || !controllerEffects) {
            return;
        }
        stroke = findShapeStroke(layer);
        if (!stroke) {
            return;
        }
        setPropExpression(
            shapeStrokeColorProp(stroke),
            pianoRollControlExpression(controllerEffects.strokeColor, "Color")
        );
        setPropExpression(
            shapeStrokeOpacityProp(stroke),
            pianoRollControlExpression(controllerEffects.strokeOpacity, "Slider")
        );
        setPropExpression(
            shapeStrokeWidthProp(stroke),
            pianoRollControlExpression(controllerEffects.strokeWidth, "Slider")
        );
    }

    function wireShapeMasterOpacityFromController(layer, controllerEffects) {
        var opacityProp;
        if (!layer || !controllerEffects) {
            return;
        }
        opacityProp = findLayerOpacity(layer);
        if (opacityProp) {
            setPropExpression(opacityProp, pianoRollMasterOpacityExpression(controllerEffects));
        }
    }

    function wirePianoRollShapeStyles(layer, controllerEffects) {
        var fill;
        if (!layer || !controllerEffects) {
            return;
        }
        fill = findShapeFill(layer);
        if (fill) {
            setPropExpression(
                shapeFillColorProp(fill),
                pianoRollControlExpression(controllerEffects.fillColor, "Color")
            );
        }
        wireShapeStrokeFromController(layer, controllerEffects);
    }

    api.createPianoRollControllerNull = createPianoRollControllerNull;
    api.wireShapeStrokeFromController = wireShapeStrokeFromController;
    api.wireShapeMasterOpacityFromController = wireShapeMasterOpacityFromController;

    function buildShapeRectContents(contents, rect) {
        var rectShape = null;
        var fill = null;
        var stroke = null;
        var group;
        var vectors;
        var width = Math.max(1, rect.width);
        var height = Math.max(1, rect.height);

        if (!contents || !contents.addProperty) {
            return { rectShape: null, fill: null, stroke: null };
        }

        try {
            rectShape = contents.addProperty("ADBE Vector Shape - Rect");
            setPropValue(rectShape, "ADBE Vector Rect Size", [width, height]);
            fill = contents.addProperty("ADBE Vector Graphic - Fill");
            setPropValue(fill, "ADBE Vector Fill Color", rect.color || [0.22, 0.74, 0.97]);
            setPropValue(fill, "ADBE Vector Fill Opacity", 100);
            try {
                stroke = contents.addProperty("ADBE Vector Graphic - Stroke");
                setPropValue(stroke, "ADBE Vector Stroke Color", [1, 1, 1]);
                setPropValue(stroke, "ADBE Vector Stroke Opacity", 100);
                setPropValue(stroke, "ADBE Vector Stroke Width", 0);
            } catch (strokeErr) {
                stroke = null;
            }
            return { rectShape: rectShape, fill: fill, stroke: stroke };
        } catch (flatErr) {}

        try {
            group = contents.addProperty("ADBE Vector Group");
            vectors = safeProperty(group, "ADBE Vectors Group") || safeProperty(group, 2);
            if (!vectors || !vectors.addProperty) {
                return { rectShape: null, fill: null, stroke: null };
            }
            rectShape = vectors.addProperty("ADBE Vector Shape - Rect");
            setPropValue(rectShape, "ADBE Vector Rect Size", [width, height]);
            fill = vectors.addProperty("ADBE Vector Graphic - Fill");
            setPropValue(fill, "ADBE Vector Fill Color", rect.color || [0.22, 0.74, 0.97]);
            setPropValue(fill, "ADBE Vector Fill Opacity", 100);
            try {
                stroke = vectors.addProperty("ADBE Vector Graphic - Stroke");
                setPropValue(stroke, "ADBE Vector Stroke Color", [1, 1, 1]);
                setPropValue(stroke, "ADBE Vector Stroke Opacity", 100);
                setPropValue(stroke, "ADBE Vector Stroke Width", 0);
            } catch (strokeErr2) {
                stroke = null;
            }
            return { rectShape: rectShape, fill: fill, stroke: stroke };
        } catch (nestedErr) {}

        return { rectShape: null, fill: null, stroke: null };
    }

    function parentLayerToController(comp, layer, controllerName, controllerLayer) {
        var parentLayer;
        if (!layer || (!controllerName && !controllerLayer)) {
            return false;
        }
        try {
            parentLayer = controllerName ? comp.layer(controllerName) : controllerLayer;
            layer.parent = parentLayer;
            return true;
        } catch (parentErr) {
            if (controllerLayer && controllerLayer !== parentLayer) {
                try {
                    layer.parent = controllerLayer;
                    return true;
                } catch (fallbackParentErr) {}
            }
        }
        return false;
    }

    function createShapeRectLayer(comp, rect) {
        var layer = null;
        var contents;
        var transform;
        var result = {
            layer: null,
            rect: rect
        };

        try {
            if (!comp.layers.addShape) {
                return result;
            }
            layer = comp.layers.addShape();
            layer.name = "MIDI Note " + api.pad2(rect.index) + " " + api.sanitizeName(rect.label);
            layer.comment =
                "Piano roll note" +
                "\ntime: " +
                rect.time.toFixed(4) +
                "\nduration: " +
                rect.duration.toFixed(4) +
                "\npitch: " +
                rect.pitch +
                "\nvelocity: " +
                rect.velocity +
                "\nlabel: " +
                rect.label;
            contents = safeProperty(layer, "ADBE Root Vectors Group");
            buildShapeRectContents(contents, rect);
            transform = safeProperty(layer, "ADBE Transform Group");
            if (transform) {
                setPropValue(transform, "ADBE Anchor Point", [0, 0]);
                setPropValue(transform, "ADBE Position", [rect.x, rect.y]);
                setPropValue(transform, "ADBE Opacity", 100);
            }
            result.layer = layer;
        } catch (e) {}

        return result;
    }

    api.createShapeRectLayer = createShapeRectLayer;

    api.createPianoRollMapLayers = function (comp, sourceLayer, options) {
        var rects;
        var created = 0;
        var notes;
        var controllerName;
        var i;
        var noteStyles;
        var noteStyle;
        var controllerInfo;
        var opacityProp;
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before creating a piano-roll map.");
        }
        if (!sourceLayer) {
            throw new Error("Select an imported MIDI layer before creating a piano roll.");
        }
        options = api.resolvePianoRollMapOptions(comp, options || {});
        notes = api.collectPianoRollNotesFromLayer(sourceLayer, options);
        if (!notes.length) {
            throw new Error(
                'No note keyframes were found on layer "' +
                    sourceLayer.name +
                    '". Found ' +
                    api.countLayerSliderEffects(sourceLayer) +
                    " keyed slider effects" +
                    (api.channelPrefixFromLayer(sourceLayer) ? " for " + api.channelPrefixFromLayer(sourceLayer) : "") +
                    (options.useWorkArea ? " inside the current work area" : "") +
                    ". Select the null layer created by Import MIDI."
            );
        }
        options.notes = notes;
        rects = api.buildPianoRollRects(sourceLayer, comp, options);
        controllerName = options.controllerName || pianoRollControllerLayerName(sourceLayer);
        options.controllerName = controllerName;
        noteStyles = [];
        for (i = 0; i < rects.length; i += 1) {
            noteStyle = createShapeRectLayer(comp, rects[i]);
            if (noteStyle && noteStyle.layer) {
                created += 1;
                noteStyles.push(noteStyle);
            }
        }
        controllerInfo = createPianoRollControllerNull(comp, sourceLayer, options);
        if (controllerInfo && controllerInfo.layer) {
            controllerName = controllerInfo.name;
            for (i = 0; i < noteStyles.length; i += 1) {
                parentLayerToController(comp, noteStyles[i].layer, null, controllerInfo.layer);
            }
            for (i = 0; i < noteStyles.length; i += 1) {
                wirePianoRollShapeStyles(noteStyles[i].layer, controllerInfo.effects);
                opacityProp = findLayerOpacity(noteStyles[i].layer);
                if (opacityProp) {
                    setPropExpression(opacityProp, pianoRollMasterOpacityExpression(controllerInfo.effects));
                }
            }
        }
        return {
            created: created,
            rects: rects,
            notes: notes.length,
            controller: controllerName
        };
    };

    function previewScalarValue(value) {
        if (typeof value === "number" && !isNaN(value)) {
            return value;
        }
        if (value && value.length !== undefined && typeof value !== "string") {
            return typeof value[0] === "number" ? value[0] : 0;
        }
        if (typeof value === "string") {
            return value ? 1 : 0;
        }
        return 0;
    }

    function resolveMidiActionPreviewRange(comp, options, triggers) {
        var step = comp && comp.frameDuration ? comp.frameDuration : numeric(options.previewStep, 1 / 24);
        var startTime = 0;
        var endTime = 0;
        var durationPad;
        triggers = triggers || [];
        durationPad = Math.max(numeric(options.duration, 0.2), 0.25);
        if (options.useWorkArea && comp && typeof comp.workAreaStart !== "undefined") {
            startTime = comp.workAreaStart;
            endTime = comp.workAreaStart + comp.workAreaDuration;
        } else if (triggers.length) {
            startTime = Math.max(0, triggers[0].time - durationPad);
            endTime = triggers[triggers.length - 1].time + durationPad;
        } else {
            endTime = numeric(options.previewEndTime, 0);
            if (!endTime && comp && comp.duration) {
                endTime = comp.duration;
            }
            if (!endTime && options.midiDuration) {
                endTime = options.midiDuration;
            }
            if (!endTime) {
                endTime = 10;
            }
        }
        if (step <= 0) {
            step = 1 / 24;
        }
        return { step: step, startTime: startTime, endTime: endTime };
    }

    function midiActionPreviewSampleStep(range, maxPoints) {
        var span;
        var step = range.step;
        maxPoints = maxPoints || 256;
        span = range.endTime - range.startTime;
        if (span <= 0 || step <= 0) {
            return step > 0 ? step : 1 / 24;
        }
        while (span / step > maxPoints) {
            step *= 2;
        }
        return step;
    }

    function midiActionPreviewUsesSharpSamples(preset) {
        return preset !== "interpolate";
    }

    function pushPreviewSampleEntry(entries, seen, plotTime, evalTime) {
        var key;
        if (plotTime === null || typeof plotTime === "undefined" || isNaN(plotTime)) {
            return;
        }
        if (evalTime === null || typeof evalTime === "undefined" || isNaN(evalTime)) {
            evalTime = plotTime;
        }
        key = Math.round(plotTime * 1000000) + ":" + Math.round(evalTime * 1000000);
        if (seen[key]) {
            return;
        }
        seen[key] = true;
        entries.push({ plotTime: plotTime, evalTime: evalTime });
    }

    function sortPreviewSampleEntries(entries) {
        return entries.sort(function (a, b) {
            if (a.plotTime === b.plotTime) {
                return a.evalTime - b.evalTime;
            }
            return a.plotTime - b.plotTime;
        });
    }

    function buildMidiActionPreviewSampleEntries(range, triggers, options) {
        var maxPoints = 256;
        var preset = options.preset || "pump";
        var step = midiActionPreviewSampleStep(range, maxPoints);
        var duration = numeric(options.duration, 0.2);
        var windowDuration = options.falloff === "instant" ? step || duration : duration;
        var eps = Math.min(step * 0.001, range.step * 0.001, 0.00001);
        var entries = [];
        var seen = {};
        var budget;
        var coarseStep;
        var reserved = 0;
        var t;
        var i;
        var hitPlotTime;

        if (!midiActionPreviewUsesSharpSamples(preset)) {
            for (t = range.startTime; t <= range.endTime + 0.0001; t += step) {
                pushPreviewSampleEntry(entries, seen, t, t);
            }
            return sortPreviewSampleEntries(entries);
        }

        reserved = triggers.length * (preset === "toggle" ? 2 : 3) + 1;
        budget = Math.max(0, maxPoints - reserved);
        coarseStep = step;
        if (budget > 0) {
            while ((range.endTime - range.startTime) / coarseStep > budget && coarseStep > 0) {
                coarseStep *= 2;
            }
            for (t = range.startTime; t <= range.endTime + 0.0001; t += coarseStep) {
                pushPreviewSampleEntry(entries, seen, t, t);
            }
        }

        for (i = 0; i < triggers.length; i += 1) {
            if (triggers[i].time - eps >= range.startTime) {
                pushPreviewSampleEntry(entries, seen, triggers[i].time - eps, triggers[i].time - eps * 2);
                hitPlotTime = triggers[i].time;
            } else {
                pushPreviewSampleEntry(entries, seen, range.startTime, triggers[i].time - eps * 2);
                hitPlotTime = Math.min(range.endTime, Math.max(range.startTime + eps * 0.01, triggers[i].time + eps));
            }
            pushPreviewSampleEntry(entries, seen, hitPlotTime, hitPlotTime);
            if (preset !== "toggle") {
                pushPreviewSampleEntry(
                    entries,
                    seen,
                    triggers[i].time + windowDuration,
                    triggers[i].time + windowDuration
                );
            }
        }

        return sortPreviewSampleEntries(entries);
    }

    function triggerIndexAtTime(triggers, time) {
        var index = -1;
        while (index + 1 < triggers.length && triggers[index + 1].time <= time) {
            index += 1;
        }
        return index;
    }

    function pushMidiActionSimulationPoint(points, t, value) {
        points.push({
            time: t,
            value: previewScalarValue(value)
        });
    }

    function buildMidiActionSimulationPoints(triggers, comp, options) {
        var range = resolveMidiActionPreviewRange(comp, options, triggers);
        var sampleEntries = buildMidiActionPreviewSampleEntries(range, triggers, options);
        var previewBaseFallback = options.baseValue === "value" ? 100 : numeric(options.previewBaseValue, 0);
        var base = parseValueLiteral(options.baseValue, previewBaseFallback);
        var active = parseValueLiteral(options.activeValue, numeric(options.previewActiveValue, base));
        var simOptions = {
            preset: options.preset || "pump",
            duration: options.duration,
            amount: options.amount,
            falloff: options.falloff || "linear",
            frameDuration: range.step
        };
        var points = [];
        var accumTotal = null;
        var accumUpTo = -1;
        var duration = numeric(simOptions.duration, 0.2);
        var windowDuration = simOptions.falloff === "instant" ? simOptions.frameDuration || duration : duration;
        var i;
        var entry;
        var t;
        var evalTime;
        var triggerIndex;
        var n;
        var value;
        var from;
        var f;

        if (simOptions.preset === "accumulator") {
            accumTotal = cloneValue(base);
        }

        reportPreviewProgress(options, "simulate", 0, Math.max(1, sampleEntries.length), "Simulating curve");
        for (i = 0; i < sampleEntries.length; i += 1) {
            if (i % 6 === 0 || i === sampleEntries.length - 1) {
                reportPreviewProgress(options, null, i + 1, sampleEntries.length, "Simulating curve");
            }
            entry = sampleEntries[i];
            t = entry.plotTime;
            evalTime = entry.evalTime;
            triggerIndex = triggerIndexAtTime(triggers, evalTime);
            if (simOptions.preset === "accumulator") {
                while (accumUpTo < triggerIndex) {
                    accumUpTo += 1;
                    accumTotal = addDeltaValue(accumTotal, triggers[accumUpTo].amount);
                }
                n = triggerIndex;
                if (n >= 0 && evalTime <= triggers[n].time + windowDuration) {
                    from = addDeltaValue(accumTotal, -triggers[n].amount);
                    f =
                        1 -
                        falloffValue(
                            evalTime,
                            triggers[n].time,
                            duration,
                            simOptions.falloff,
                            simOptions.frameDuration
                        );
                    value = addDeltaValue(from, triggers[n].amount * f);
                } else {
                    value = accumTotal;
                }
                pushMidiActionSimulationPoint(points, t, value);
            } else if (simOptions.preset === "interpolate") {
                n = triggerIndex;
                if (n < 0) {
                    value = cloneValue(base);
                } else if (n >= triggers.length - 1) {
                    value = targetForInterpolatedEvent(n, base, active);
                } else {
                    value = mixValue(
                        targetForInterpolatedEvent(n, base, active),
                        targetForInterpolatedEvent(n + 1, base, active),
                        interpolationProgress(evalTime, triggers[n].time, triggers[n + 1].time, simOptions.falloff)
                    );
                }
                pushMidiActionSimulationPoint(points, t, value);
            } else {
                pushMidiActionSimulationPoint(
                    points,
                    t,
                    valueAtBakedTime(triggers, evalTime, base, active, simOptions, triggerIndex)
                );
            }
        }
        return points;
    }

    function midiActionPreviewBounds(points, range) {
        var minValue = Infinity;
        var maxValue = -Infinity;
        var i;
        for (i = 0; i < points.length; i += 1) {
            minValue = Math.min(minValue, points[i].value);
            maxValue = Math.max(maxValue, points[i].value);
        }
        if (!points.length) {
            minValue = 0;
            maxValue = 1;
        }
        if (minValue === maxValue) {
            minValue -= 1;
            maxValue += 1;
        }
        return {
            left: range.startTime,
            right: Math.max(range.endTime, range.startTime + 0.001),
            top: maxValue,
            bottom: minValue
        };
    }

    function midiActionPresetLabel(preset) {
        if (preset === "toggle") {
            return "Toggle / Flip";
        }
        if (preset === "interpolate") {
            return "Interpolate A-B";
        }
        if (preset === "accumulator") {
            return "Integrate / Accumulate";
        }
        return "Pump / Decay";
    }

    function midiActionPreviewDescription(options, triggerCount) {
        var parts = [];
        parts.push(triggerCount + " trigger" + (triggerCount === 1 ? "" : "s") + " in preview.");
        parts.push("Curve shows the " + midiActionPresetLabel(options.preset) + " preset over time.");
        if (options.pitchSliderName && options.triggerMode !== "drums") {
            parts.push("Pitch slider: " + options.pitchSliderName + ".");
        }
        if (options.useWorkArea && midiActionUsesTriggerLimits(options)) {
            parts.push("Limited to current work area.");
        }
        return parts.join(" ");
    }

    api.simulateMidiActionFromLayer = function (sourceLayer, comp, options) {
        var triggers;
        options = api.resolveMidiActionOptions(comp, options || {}, sourceLayer);
        triggers = api.collectMidiActionTriggersFromLayer(sourceLayer, options);
        return {
            triggers: triggers,
            points: buildMidiActionSimulationPoints(triggers, comp, options)
        };
    };

    api.buildMidiActionPreviewLayout = function (sourceLayer, comp, options) {
        var triggers;
        var points;
        var range;
        options = options || {};
        reportPreviewProgress(options, "triggers");
        triggers = api.collectMidiActionTriggersFromLayer(sourceLayer, options);
        reportPreviewProgress(options, "simulate");
        points = buildMidiActionSimulationPoints(triggers, comp, options);
        range = resolveMidiActionPreviewRange(comp, options, triggers);
        reportPreviewProgress(options, "finalize", 1, 1, "Finishing preview");
        return {
            points: points,
            triggers: triggers,
            triggerCount: triggers.length,
            bounds: midiActionPreviewBounds(points, range),
            sourceLabel: sourceLayer && sourceLayer.name ? sourceLayer.name : "MIDI",
            description: midiActionPreviewDescription(options, triggers.length),
            preset: options.preset || "pump"
        };
    };

    api.computeMidiActionPreviewLayout = function (comp, sourceLayer, options) {
        var layout;
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before previewing MIDI Actions.");
        }
        if (!sourceLayer) {
            throw new Error("Select an imported MIDI layer before previewing MIDI Actions.");
        }
        options = api.resolveMidiActionOptions(comp, options || {}, sourceLayer);
        if (sourceLayer.name) {
            options.sourceLayerName = sourceLayer.name;
        }
        options.limitTriggers = true;
        reportPreviewProgress(options, "prepare", 1, 1, "Preparing options");
        reportPreviewProgress(options, "keyframes");
        options.__previewSliderCaches = buildPreviewSliderCaches(sourceLayer, options);
        reportPreviewProgress(options, "keyframes", 2, 2, "Reading velocity keyframes");
        layout = api.buildMidiActionPreviewLayout(sourceLayer, comp, options);
        if (!layout.triggerCount) {
            throw new Error(
                'No MIDI Action triggers matched the current maps on layer "' +
                    sourceLayer.name +
                    '".' +
                    (options.pitchSliderName ? ' Pitch slider: "' + options.pitchSliderName + '".' : "")
            );
        }
        return layout;
    };

    api.previewMidiAction = function (comp, sourceLayer, options) {
        var layout;
        options = options || {};
        try {
            layout = api.computeMidiActionPreviewLayout(comp, sourceLayer, options);
        } finally {
            if (api.endPreviewProgress && options.__previewProgressHook) {
                api.endPreviewProgress(options.__previewProgressHook);
            }
        }
        if (api.showMidiActionPreviewInPanel) {
            api.showMidiActionPreviewInPanel(layout);
        }
        return layout;
    };

    api.simulateMidiAction = function (midi, options) {
        var triggers;
        options = options || {};
        options.midiDuration = midi.durationSeconds || 1;
        if (options.limitTriggers === undefined && (options.maxNotes || options.useWorkArea)) {
            options.limitTriggers = true;
        }
        triggers = api.collectMidiActionTriggers(midi, options);
        return {
            triggers: triggers,
            points: buildMidiActionSimulationPoints(triggers, null, options)
        };
    };

    function midiActionPresetShortName(preset) {
        if (preset === "toggle") {
            return "Toggle";
        }
        if (preset === "interpolate") {
            return "Interpolate";
        }
        if (preset === "accumulator") {
            return "Accumulate";
        }
        return "Pump";
    }

    function midiActionOutputLayerName(sourceLayer, options) {
        var sourceName = sourceLayer && sourceLayer.name ? sourceLayer.name : "MIDI";
        return api.limitEffectName(
            "MIDI Action " + midiActionPresetShortName(options.preset || "pump") + " " + sourceName
        );
    }

    function createMidiActionOutputNull(comp, sourceLayer, options) {
        var layer;
        var sliderProp;
        var base;
        var preset;
        if (!comp || !comp.layers || !comp.layers.addNull) {
            throw new Error("Could not create a null layer in the active composition.");
        }
        layer = comp.layers.addNull();
        layer.name = options.outputLayerName || midiActionOutputLayerName(sourceLayer, options);
        layer.comment =
            "Generated by ReOm MIDI Actions\nSource: " + (sourceLayer && sourceLayer.name ? sourceLayer.name : "MIDI");
        if (!addPianoRollControllerSlider(layer, "Value", 0)) {
            throw new Error("Could not add a Slider Control to the MIDI Action null.");
        }
        preset = options.preset || "pump";
        if (options.addOutputSliders) {
            if (midiActionUsesBaseSlider(preset)) {
                addPianoRollControllerSlider(layer, MIDI_ACTION_BASE_SLIDER, defaultBaseSliderValue(options));
            }
            if (midiActionUsesActiveSlider(preset)) {
                addPianoRollControllerSlider(layer, MIDI_ACTION_ACTIVE_SLIDER, defaultActiveSliderValue(options));
            }
            if (midiActionUsesAmountDurationSliders(preset)) {
                addPianoRollControllerSlider(layer, MIDI_ACTION_AMOUNT_SLIDER, numeric(options.amount, 20));
                addPianoRollControllerSlider(layer, MIDI_ACTION_DURATION_SLIDER, numeric(options.duration, 0.2));
            }
        }
        sliderProp = layerEffectSliderByName(layer, "Value");
        if (!sliderProp) {
            throw new Error("Could not access the MIDI Action slider property.");
        }
        base = parseValueLiteral(options.baseValue, 0);
        if (base && base.length !== undefined && typeof base !== "string") {
            base = base.length ? base[0] : 0;
        }
        if (typeof sliderProp.setValue === "function") {
            try {
                sliderProp.setValue(base);
            } catch (setErr) {}
        }
        return {
            layer: layer,
            property: sliderProp,
            effect: null
        };
    }

    api.prepareMidiActionExpression = function (comp, sourceLayer, options) {
        var resolved;
        var expression;
        if (!sourceLayer) {
            throw new Error("Select an imported MIDI layer before building a MIDI Action expression.");
        }
        rememberMidiActionSourceLayer(sourceLayer);
        resolved = api.resolveMidiActionOptions(comp, options || {}, sourceLayer);
        resolved.sourceLayerName = sourceLayer.name;
        if (options.useOutputSliders !== false) {
            resolved.useOutputSliders = true;
        }
        expression = api.buildMidiActionExpression(resolved);
        return {
            resolved: resolved,
            expression: expression
        };
    };

    api.buildMidiActionExpressionFromLayer = function (comp, sourceLayer, options) {
        return api.prepareMidiActionExpression(comp, sourceLayer, options).expression;
    };

    api.createMidiActionNullWithExpression = function (comp, sourceLayer, options) {
        var prepared;
        var resolved;
        var output;
        var expression;
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before creating a MIDI Action null.");
        }
        if (!sourceLayer) {
            throw new Error("Select an imported MIDI layer before creating a MIDI Action null.");
        }
        prepared = api.prepareMidiActionExpression(comp, sourceLayer, options);
        resolved = prepared.resolved;
        expression = prepared.expression;
        output = createMidiActionOutputNull(comp, sourceLayer, {
            outputLayerName: resolved.outputLayerName,
            baseValue: resolved.baseValue,
            activeValue: resolved.activeValue,
            preset: resolved.preset,
            amount: resolved.amount,
            duration: resolved.duration,
            addOutputSliders: true
        });
        if (!output.property.canSetExpression) {
            throw new Error("The MIDI Action slider cannot receive expressions.");
        }
        if (!setPropExpression(output.property, expression)) {
            throw new Error("Could not apply the MIDI Action expression to the Value slider.");
        }
        return {
            layerName: output.layer.name,
            expression: expression
        };
    };

    api.createMidiActionNullWithBake = function (comp, sourceLayer, options) {
        var resolved;
        var output;
        var triggers;
        var plan;
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before baking MIDI Actions.");
        }
        if (!sourceLayer) {
            throw new Error("Select an imported MIDI layer before baking MIDI Actions.");
        }
        resolved = api.resolveMidiActionOptions(comp, options || {}, sourceLayer);
        resolved.sourceLayerName = sourceLayer.name;
        resolved.limitTriggers = true;
        output = createMidiActionOutputNull(comp, sourceLayer, resolved);
        triggers = api.collectMidiActionTriggersFromLayer(sourceLayer, resolved);
        if (!triggers.length) {
            throw new Error("No MIDI Action triggers matched the current maps.");
        }
        plan = api.buildMidiActionBakePlan(triggers, output.property, comp, resolved);
        if (!applyBakePlan(output.property, plan)) {
            throw new Error("Could not bake keyframes onto the MIDI Action null.");
        }
        return {
            layerName: output.layer.name,
            triggers: triggers.length
        };
    };

    api.applyExpressionToSelectedProperties = function (comp, options) {
        var properties;
        var expression;
        var applied = 0;
        var skipped = 0;
        var i;
        var prop;

        if (!comp || !(comp instanceof CompItem)) {
            throw new Error("Open or select a composition before applying MIDI Actions.");
        }
        properties = comp.selectedProperties;
        if (!properties || !properties.length) {
            throw new Error("Select one or more properties that can receive expressions.");
        }

        expression = api.buildMidiActionExpression(options || {});
        for (i = 0; i < properties.length; i += 1) {
            prop = properties[i];
            if (prop && prop.canSetExpression) {
                prop.expression = expression;
                prop.expressionEnabled = true;
                applied += 1;
            } else {
                skipped += 1;
            }
        }
        return { applied: applied, skipped: skipped };
    };

    function scalarMagnitude(value) {
        var magnitude = Math.abs(value);
        return magnitude || 100;
    }

    function formatScreenFlipToggleLiteral(values) {
        if (values && values.length !== undefined && typeof values !== "string") {
            return "[" + values.join(", ") + "]";
        }
        return String(values);
    }

    function resolveScreenFlipToggleValues(property, axis) {
        var axisIndex = axis === "vertical" ? 1 : 0;
        var dims = propertyDimensions(property);
        var value;
        var base;
        var active;
        var magnitude;

        try {
            value = property.value;
        } catch (valueErr) {
            value = dims > 1 ? [100, 100] : 100;
        }
        if (dims <= 1) {
            magnitude = scalarMagnitude(value);
            return {
                baseValue: String(magnitude),
                activeValue: String(-magnitude)
            };
        }
        base = cloneValue(value);
        active = cloneValue(value);
        magnitude = scalarMagnitude(base[axisIndex]);
        base[axisIndex] = magnitude;
        active[axisIndex] = -magnitude;
        return {
            baseValue: formatScreenFlipToggleLiteral(base),
            activeValue: formatScreenFlipToggleLiteral(active)
        };
    }

    api.buildScreenFlipExpression = function (options) {
        var axisIndex;
        var body;
        options = options || {};
        axisIndex = options.screenFlipAxis === "vertical" ? 1 : 0;
        if (options.screenFlipDimensions === 1) {
            body = expressionTryCatch(
                [
                    "var count = pitchHitCountAt(time);",
                    "var mag = Math.abs(value);",
                    "if (!mag) { mag = 100; }",
                    "fitPropertyValue((count % 2) ? -mag : mag);"
                ],
                "value"
            );
        } else {
            body = expressionTryCatch(
                [
                    "var count = pitchHitCountAt(time);",
                    "var dims = value;",
                    "var out = [];",
                    "var i;",
                    "var mag;",
                    "for (i = 0; i < dims.length; i++) { out[i] = dims[i]; }",
                    "mag = Math.abs(out[" + axisIndex + "]);",
                    "if (!mag) { mag = 100; }",
                    "out[" + axisIndex + "] = (count % 2) ? -mag : mag;",
                    "fitPropertyValue(out);"
                ],
                "value"
            );
        }
        return commonHeader(options) + joinExpressionLines(body);
    };

    api.resolveScreenFlipActionOptions = function (comp, property, axis, options, sourceLayer) {
        var resolved;
        var toggleValues;
        resolved = api.resolveMidiActionOptions(comp, options || {}, sourceLayer);
        resolved.preset = "toggle";
        resolved.limitTriggers = true;
        resolved.screenFlipAxis = axis === "vertical" ? "vertical" : "horizontal";
        resolved.screenFlipDimensions = propertyDimensions(property);
        toggleValues = resolveScreenFlipToggleValues(property, resolved.screenFlipAxis);
        resolved.baseValue = toggleValues.baseValue;
        resolved.activeValue = toggleValues.activeValue;
        if (sourceLayer && sourceLayer.name) {
            resolved.sourceLayerName = sourceLayer.name;
        }
        return resolved;
    };

    api.applyMidiActionExpressionToProperty = function (property, expression) {
        if (!property || !property.canSetExpression) {
            throw new Error("The target property cannot receive an expression.");
        }
        property.expression = expression;
        property.expressionEnabled = true;
        return true;
    };

    api.bakeMidiActionToProperty = function (property, comp, sourceLayer, options) {
        var triggers;
        var plan;
        if (!property) {
            throw new Error("Select a target property before baking.");
        }
        options = options || {};
        options.sourceLayerName = sourceLayer.name;
        options.limitTriggers = true;
        triggers = api.collectMidiActionTriggersFromLayer(sourceLayer, options);
        if (!triggers.length) {
            throw new Error("No MIDI Action triggers matched the current maps.");
        }
        plan = api.buildMidiActionBakePlan(triggers, property, comp, options);
        if (!applyBakePlan(property, plan)) {
            throw new Error("Could not bake keyframes onto the target property.");
        }
        return { triggers: triggers.length };
    };

    api.getCompSelectedLayers = getCompSelectedLayers;
    api.isMidiImportSourceLayer = isMidiImportSourceLayer;
})(ReOmMIDI);
