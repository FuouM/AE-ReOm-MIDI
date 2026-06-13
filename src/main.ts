(function (api: ReOmMIDIApi, thisObj: Panel | Window | undefined) {
    function formatCatchError(err: unknown): string {
        if (err && typeof err === "object" && "message" in err) {
            var message = (err as { message: unknown }).message;
            if (typeof message === "string" && message) {
                return message;
            }
        }
        return String(err);
    }

    function requireActiveComp() {
        var item = app.project.activeItem;
        if (!item || !(item instanceof CompItem)) {
            throw new Error("Open or select a composition before importing MIDI.");
        }
        return item;
    }

    api.runGetMidiInfo = function (options) {
        var file;
        var midi;
        var report;

        if (!options || !options.midiFileName) {
            api.alertError("Choose a MIDI file first.");
            return;
        }

        file = new File(options.midiFileName);
        if (!file.exists) {
            api.alertError("MIDI file does not exist:\n" + options.midiFileName);
            return;
        }

        try {
            midi = api.MidiFile.fromFile(options.midiFileName);
            if (!midi.isMidi) {
                throw new Error("The selected file is not a Standard MIDI file.");
            }
            report = api.buildMidiFileInfoReport(midi, options.midiFileName);
            if (api.discardMidiFileData) {
                api.discardMidiFileData(midi);
            }
            midi = null;
            if (api.showMidiInfoDialog) {
                api.showMidiInfoDialog(options.midiFileName, report);
            } else {
                alert("ReOm MIDI Info\n\n" + report);
            }
            report = null;
        } catch (err) {
            api.alertError(formatCatchError(err));
        }
    };

    function loadMidiFromOptions(options: MidiFileRunnerOptions): MidiFileData {
        var file;
        var midi;

        if (!options || !options.midiFileName) {
            throw new Error("Choose a MIDI file first.");
        }

        file = new File(options.midiFileName);
        if (!file.exists) {
            throw new Error("MIDI file does not exist:\n" + options.midiFileName);
        }

        midi = api.MidiFile.fromFile(options.midiFileName);
        if (!midi.isMidi) {
            throw new Error("The selected file is not a Standard MIDI file.");
        }

        return midi;
    }

    api.runCreateMetronomeLayer = function (options) {
        var midi;
        var comp;
        var result;
        var runnerOptions = options || {};

        try {
            comp = requireActiveComp();
            midi = loadMidiFromOptions(runnerOptions);
            app.beginUndoGroup("ReOm MIDI Metronome Layer");
            result = api.createMetronomeLayer(comp, midi, {
                quantizeToFrames: !!runnerOptions.quantizeToFrames
            });
            app.endUndoGroup();
            alert(
                "ReOm MIDI Metronome\n\nCreated null: " +
                    result.layerName +
                    "\nTime signature changes: " +
                    result.signatureChanges
            );
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runCreateBpmLayer = function (options) {
        var midi;
        var comp;
        var result;
        var runnerOptions = options || {};

        try {
            comp = requireActiveComp();
            midi = loadMidiFromOptions(runnerOptions);
            app.beginUndoGroup("ReOm MIDI BPM Layer");
            result = api.createBpmLayer(comp, midi, {
                quantizeToFrames: !!runnerOptions.quantizeToFrames
            });
            app.endUndoGroup();
            alert(
                "ReOm MIDI BPM\n\nCreated null: " +
                    result.layerName +
                    "\nBeat keyframes: " +
                    result.beats +
                    "\nTempo changes: " +
                    result.tempoChanges
            );
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runImport = function (options) {
        var file;
        var midi;
        var comp;
        var progress: ProgressHandle | undefined;
        var importedChannels: ImportResult = 0;
        var message;

        if (!options || !options.midiFileName) {
            api.alertError("Choose a MIDI file first.");
            return;
        }

        file = new File(options.midiFileName);
        if (!file.exists) {
            api.alertError("MIDI file does not exist:\n" + options.midiFileName);
            return;
        }

        try {
            comp = requireActiveComp();
            progress = api.showProgress("ReOm MIDI Import");
            progress.update("Reading MIDI...", 0.05);

            midi = api.MidiFile.fromFile(options.midiFileName);
            if (!midi.isMidi) {
                throw new Error("The selected file is not a Standard MIDI file.");
            }
            if (!midi.notes.length && !midi.noteEventCount) {
                throw new Error("No MIDI notes were found in the selected file.");
            }

            app.beginUndoGroup("ReOm MIDI Import");
            importedChannels = api.importMidiToComp(comp, midi, options, function (text, ratio) {
                if (!progress) {
                    return true;
                }
                return progress.update(text, ratio);
            });
            app.endUndoGroup();
            progress.close();

            if (importedChannels && typeof importedChannels === "object" && importedChannels.cancelled) {
                alert("ReOm MIDI Import cancelled.\n\nImported channels before cancel: " + importedChannels.imported);
                return;
            }

            if (!importedChannels) {
                api.alertError("MIDI was parsed, but no importable channels were found.");
            } else {
                message = "ReOm MIDI Import\n\nImported channels: " + importedChannels;
                if (midi.warnings && midi.warnings.length) {
                    message += "\nWarnings: " + midi.warnings.length + "\nRun Get MIDI Info for the full warning list.";
                }
                alert(message);
            }
        } catch (err) {
            try {
                if (progress) {
                    progress.close();
                }
            } catch (closeErr) {}
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runApplyMidiAction = function (options) {
        var comp;
        var sourceLayer;
        var result;

        try {
            comp = requireActiveComp();
            sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
            options = api.resolveMidiActionOptions(comp, options || {}, sourceLayer);
            options.sourceLayerName = sourceLayer.name;
            app.beginUndoGroup("ReOm MIDI Actions");
            result = api.applyExpressionToSelectedProperties(comp, options);
            app.endUndoGroup();
            alert(
                "ReOm MIDI Actions\n\nSource layer: " +
                    sourceLayer.name +
                    "\nApplied expressions: " +
                    result.applied +
                    "\nSkipped properties: " +
                    result.skipped
            );
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    function requireGlobalState(): ReOmGlobalState {
        var state = api.getGlobalState();
        if (!state) {
            throw new Error("ReOm MIDI global state is unavailable.");
        }
        return state;
    }

    api.runCopyMidiActionExpression = function (options) {
        var comp;
        var sourceLayer;

        try {
            comp = requireActiveComp();
            sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
            if (api.openMidiActionExpressionCopyDialog) {
                api.openMidiActionExpressionCopyDialog(sourceLayer.name);
            }
            requireGlobalState().copyExpressionPayload = {
                comp: comp,
                sourceLayer: sourceLayer,
                options: options || {}
            };
            app.scheduleTask(
                "try { if (ReOmMIDI.__runDeferredCopyExpression) { ReOmMIDI.__runDeferredCopyExpression(); } } catch (e) { try { ReOmMIDI.alertError(String(e)); } catch (e2) {} }",
                1,
                false
            );
        } catch (err) {
            api.alertError(formatCatchError(err));
        }
    };

    api.__runDeferredCopyExpression = function () {
        var payload = requireGlobalState().copyExpressionPayload;
        var prepared;

        if (!payload) {
            return;
        }
        requireGlobalState().copyExpressionPayload = null;
        try {
            prepared = api.prepareMidiActionExpression(payload.comp, payload.sourceLayer, payload.options);
            if (api.completeMidiActionExpressionCopyDialog) {
                api.completeMidiActionExpressionCopyDialog(prepared.expression, payload.sourceLayer.name);
            } else if (api.showMidiActionExpressionCopyDialog) {
                api.showMidiActionExpressionCopyDialog(prepared.expression, payload.sourceLayer.name);
            } else {
                alert("ReOm MIDI Actions\n\nExpression ready.\nSource layer: " + payload.sourceLayer.name);
            }
        } catch (err) {
            if (api.closeMidiActionExpressionCopyDialog) {
                api.closeMidiActionExpressionCopyDialog();
            }
            api.alertError(formatCatchError(err));
        }
    };

    api.runCreateMidiActionNullWithExpression = function (options) {
        var comp;
        var sourceLayer;
        var result;

        try {
            comp = requireActiveComp();
            sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
            app.beginUndoGroup("ReOm MIDI Action Null");
            result = api.createMidiActionNullWithExpression(comp, sourceLayer, options || {});
            app.endUndoGroup();
            alert("ReOm MIDI Actions\n\nSource layer: " + sourceLayer.name + "\nCreated null: " + result.layerName);
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runPreviewMidiAction = function (options) {
        var comp;
        var sourceLayer;
        var uiGeneration;

        try {
            comp = requireActiveComp();
            sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
            if (api.showMidiActionPreviewLoadingInPanel) {
                api.showMidiActionPreviewLoadingInPanel(sourceLayer.name);
            }
            uiGeneration = api.beginDeferredPreviewUi ? api.beginDeferredPreviewUi("flushActionPreviewCanvas") : 0;
            if (api.scheduleDeferredPreviewUi && uiGeneration) {
                api.scheduleDeferredPreviewUi(uiGeneration, 1);
            }
            requireGlobalState().actionPreviewPayload = {
                comp: comp,
                sourceLayer: sourceLayer,
                options: options || {},
                uiGeneration: uiGeneration
            };
            app.scheduleTask(
                "try { if (ReOmMIDI.__runDeferredActionPreview) { ReOmMIDI.__runDeferredActionPreview(); } } catch (e) { try { ReOmMIDI.alertError(String(e)); } catch (e2) {} }",
                api.DEFERRED_PREVIEW_TASK_MS || 1,
                false
            );
        } catch (err) {
            if (api.stopMidiActionPreviewLoadingAnimation) {
                api.stopMidiActionPreviewLoadingAnimation();
            }
            api.alertError(formatCatchError(err));
        }
    };

    api.__runDeferredActionPreview = function () {
        var payload = requireGlobalState().actionPreviewPayload;
        var comp;
        var sourceLayer;
        var options;
        var uiGeneration;

        if (!payload) {
            return;
        }
        comp = payload.comp;
        sourceLayer = payload.sourceLayer;
        options = payload.options;
        uiGeneration = payload.uiGeneration;
        requireGlobalState().actionPreviewPayload = null;

        try {
            if (!comp || !sourceLayer) {
                throw new Error("Preview context was lost. Click Preview again.");
            }
            options = options || {};
            if (api.beginPreviewProgress) {
                options.__previewProgressHook = api.beginPreviewProgress("midiAction", sourceLayer.name);
            }
            api.previewMidiAction(comp, sourceLayer, options);
            if (api.scheduleDeferredPreviewUi && uiGeneration) {
                api.scheduleDeferredPreviewUi(uiGeneration, 1, true);
                api.scheduleDeferredPreviewUi(uiGeneration, 24, false);
                api.scheduleDeferredPreviewUi(uiGeneration, 100, false);
            }
        } catch (err) {
            if (api.stopMidiActionPreviewLoadingAnimation) {
                api.stopMidiActionPreviewLoadingAnimation();
            }
            api.alertError(formatCatchError(err));
        }
    };

    api.runCreatePianoRollMap = function (options) {
        var comp;
        var sourceLayer;
        var result;

        try {
            comp = requireActiveComp();
            sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
            app.beginUndoGroup("ReOm MIDI Piano Roll Map");
            result = api.createPianoRollMapLayers(comp, sourceLayer, options || {});
            app.endUndoGroup();
            alert(
                "ReOm MIDI Piano Roll Map\n\nSource layer: " +
                    sourceLayer.name +
                    "\nNotes mapped: " +
                    result.notes +
                    "\nCreated note layers: " +
                    result.created +
                    (result.controller ? "\nController null: " + result.controller : "")
            );
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runPreviewPianoRollMap = function (options) {
        var comp;
        var sourceLayer;
        var uiGeneration;

        try {
            comp = requireActiveComp();
            sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
            if (api.showPianoRollPreviewLoadingInPanel) {
                api.showPianoRollPreviewLoadingInPanel(sourceLayer.name);
            }
            uiGeneration = api.beginDeferredPreviewUi ? api.beginDeferredPreviewUi("flushPianoRollPreviewCanvas") : 0;
            if (api.scheduleDeferredPreviewUi && uiGeneration) {
                api.scheduleDeferredPreviewUi(uiGeneration, 1);
            }
            requireGlobalState().pianoRollPreviewPayload = {
                comp: comp,
                sourceLayer: sourceLayer,
                options: options || {},
                uiGeneration: uiGeneration
            };
            app.scheduleTask(
                "try { if (ReOmMIDI.__runDeferredPianoRollPreview) { ReOmMIDI.__runDeferredPianoRollPreview(); } } catch (e) { try { ReOmMIDI.alertError(String(e)); } catch (e2) {} }",
                api.DEFERRED_PREVIEW_TASK_MS || 1,
                false
            );
        } catch (err) {
            if (api.stopPianoRollPreviewLoadingAnimation) {
                api.stopPianoRollPreviewLoadingAnimation();
            }
            api.alertError(formatCatchError(err));
        }
    };

    api.__runDeferredPianoRollPreview = function () {
        var payload = requireGlobalState().pianoRollPreviewPayload;
        var comp;
        var sourceLayer;
        var options;
        var uiGeneration;

        if (!payload) {
            return;
        }
        comp = payload.comp;
        sourceLayer = payload.sourceLayer;
        options = payload.options;
        uiGeneration = payload.uiGeneration;
        requireGlobalState().pianoRollPreviewPayload = null;

        try {
            if (!comp || !sourceLayer) {
                throw new Error("Preview context was lost. Click Preview Map again.");
            }
            options = options || {};
            if (api.beginPreviewProgress) {
                options.__previewProgressHook = api.beginPreviewProgress("pianoRoll", sourceLayer.name);
            }
            api.previewPianoRollMap(comp, sourceLayer, options);
            if (api.scheduleDeferredPreviewUi && uiGeneration) {
                api.scheduleDeferredPreviewUi(uiGeneration, 1, true);
                api.scheduleDeferredPreviewUi(uiGeneration, 24, false);
                api.scheduleDeferredPreviewUi(uiGeneration, 100, false);
            }
        } catch (err) {
            if (api.stopPianoRollPreviewLoadingAnimation) {
                api.stopPianoRollPreviewLoadingAnimation();
            }
            api.alertError(formatCatchError(err));
        }
    };

    api.runCreateMidiActionNullWithBake = function (options) {
        var comp;
        var sourceLayer;
        var result;

        try {
            comp = requireActiveComp();
            sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
            app.beginUndoGroup("ReOm MIDI Action Null Bake");
            result = api.createMidiActionNullWithBake(comp, sourceLayer, options || {});
            app.endUndoGroup();
            alert(
                "ReOm MIDI Actions\n\nSource layer: " +
                    sourceLayer.name +
                    "\nCreated null: " +
                    result.layerName +
                    "\nTriggers baked: " +
                    result.triggers
            );
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runGenerateMidiMap = function (options) {
        var comp;
        var sourceLayer;
        var prepared;

        try {
            comp = requireActiveComp();
            sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
            prepared = api.prepareMidiMapExpression(comp, sourceLayer, options || {});
            requireGlobalState().mapState = prepared.state;
            if (api.__midiMapHost) {
                if (api.__midiMapHost.selectTab) {
                    api.__midiMapHost.selectTab();
                }
                api.__midiMapHost.setExpression(prepared.expression, prepared.summary);
                api.__midiMapHost.setState(prepared.state);
            }
        } catch (err) {
            api.alertError(formatCatchError(err));
        }
    };

    api.runSwitchMidiMapLabels = function (labelMode) {
        var state = requireGlobalState().mapState;
        var expression;

        try {
            if (!state || !state.pitches || !state.pitches.length) {
                throw new Error("Generate from the selected layer first.");
            }
            state.labelMode = (labelMode || "notes") as MidiMapLabelMode;
            expression = api.regenerateMidiMapExpression(state, state.labelMode);
            requireGlobalState().mapState = state;
            if (api.__midiMapHost) {
                api.__midiMapHost.setExpression(expression);
                api.__midiMapHost.setState(state);
            }
        } catch (err) {
            api.alertError(formatCatchError(err));
        }
    };

    api.runCreateDrumMachineExpression = function (options) {
        var comp;
        var sourceLayers;
        var sourceLabel;
        var result;

        try {
            comp = requireActiveComp();
            sourceLayers = api.resolveDrumMachineSourceLayers(comp, options || {});
            sourceLabel = sourceLayers
                .map(function (layer) {
                    return layer.name;
                })
                .join(", ");
            app.beginUndoGroup("ReOm MIDI Drum Machine Expression");
            result = api.createDrumMachineShapesWithExpression(comp, sourceLayers, options || {});
            app.endUndoGroup();
            alert(
                "ReOm MIDI Drum Machine\n\nSource layer" +
                    (sourceLayers.length === 1 ? ": " : "s: ") +
                    sourceLabel +
                    "\nDrum types: " +
                    (result.types || result.created) +
                    "\nTotal hits: " +
                    result.hits +
                    "\nCreated shape layers: " +
                    result.created +
                    (result.controller ? "\nController null: " + result.controller : "")
            );
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runGenerateDrumSequencer = function (options) {
        var comp;
        var sourceLayer;
        var prepared;
        var prevState;

        try {
            options = options || {};
            prevState =
                (api.__drumSequencerHost && api.__drumSequencerHost.getState && api.__drumSequencerHost.getState()) ||
                requireGlobalState().drumSequencerState;
            if (prevState && typeof prevState.totalFrames !== "undefined") {
                options.previousTotalFrames = prevState.totalFrames;
            }
            comp = requireActiveComp();
            sourceLayer = api.resolveDrumSourceLayer(comp, options);
            prepared = api.prepareDrumSequencerExpression(comp, sourceLayer, options);
            requireGlobalState().drumSequencerState = prepared.state;
            if (api.__drumSequencerHost) {
                if (api.__drumSequencerHost.selectTab) {
                    api.__drumSequencerHost.selectTab();
                }
                api.__drumSequencerHost.setExpression(prepared.expression, prepared.summary);
                api.__drumSequencerHost.setState(prepared.state);
            }
        } catch (err) {
            api.alertError(formatCatchError(err));
        }
    };

    api.runApplyDrumSequencer = function (expression) {
        var comp;
        var targetLayer;
        var result;
        var expressionText = String(expression || "");

        try {
            comp = requireActiveComp();
            if (!expressionText.replace(/^\s+|\s+$/g, "")) {
                throw new Error("Generate a Drum Sequencer expression first, or paste one into the editor.");
            }
            targetLayer = api.resolveTargetFootageLayer(comp);
            app.beginUndoGroup("ReOm MIDI Drum Sequencer");
            result = api.applyDrumSequencerToLayer(comp, targetLayer, expressionText);
            app.endUndoGroup();
            alert("ReOm MIDI Drum Sequencer\n\nApplied Time Remap expression to: " + result.layerName);
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runCopyDrumSequencerExpression = function (expression) {
        var expressionText = String(expression || "");
        var state;
        var sourceLabel;

        try {
            if (!expressionText.replace(/^\s+|\s+$/g, "")) {
                throw new Error("Generate a Drum Sequencer expression first, or paste one into the editor.");
            }
            state =
                (api.__drumSequencerHost && api.__drumSequencerHost.getState && api.__drumSequencerHost.getState()) ||
                requireGlobalState().drumSequencerState;
            sourceLabel = state && state.sourceLayerName ? state.sourceLayerName : "Drum MIDI";
            if (api.showMidiActionExpressionCopyDialog) {
                api.showMidiActionExpressionCopyDialog(expressionText, sourceLabel);
            } else {
                alert("ReOm MIDI Drum Sequencer\n\nExpression ready.\nSource layer: " + sourceLabel);
            }
        } catch (err) {
            api.alertError(formatCatchError(err));
        }
    };

    api.runCreateDrumMachineBake = function (options) {
        var comp;
        var sourceLayers;
        var sourceLabel;
        var result;

        try {
            comp = requireActiveComp();
            sourceLayers = api.resolveDrumMachineSourceLayers(comp, options || {});
            sourceLabel = sourceLayers
                .map(function (layer) {
                    return layer.name;
                })
                .join(", ");
            app.beginUndoGroup("ReOm MIDI Drum Machine Bake");
            result = api.createDrumMachineShapesWithBake(comp, sourceLayers, options || {});
            app.endUndoGroup();
            alert(
                "ReOm MIDI Drum Machine\n\nSource layer" +
                    (sourceLayers.length === 1 ? ": " : "s: ") +
                    sourceLabel +
                    "\nDrum types: " +
                    (result.types || result.created) +
                    "\nTotal hits: " +
                    result.hits +
                    "\nCreated shape layers: " +
                    result.created +
                    "\nAnimated properties: " +
                    result.animated +
                    (result.controller ? "\nController null: " + result.controller : "")
            );
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runCreateToneLayer = function (options) {
        var comp;
        var sourceLayer;
        var result;

        try {
            comp = requireActiveComp();
            sourceLayer = api.resolveMidiSourceLayer(comp, options || {});
            app.beginUndoGroup("ReOm MIDI Tone Layer");
            result = api.createToneLayer(comp, sourceLayer, options || {});
            app.endUndoGroup();
            alert(
                "ReOm MIDI Tone Layer\n\nSource layer: " +
                    sourceLayer.name +
                    "\nCreated null: " +
                    result.layerName +
                    "\nNotes baked: " +
                    result.notes +
                    "\nKeyframes: " +
                    result.keyframes
            );
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runApplyScreenFlip = function (options) {
        var comp;
        var result;

        try {
            comp = requireActiveComp();
            app.beginUndoGroup("ReOm Screen Flip");
            result = api.applyScreenFlip(comp, (options && options.axis) || "horizontal", options || {});
            app.endUndoGroup();
            alert(
                "ReOm Screen Flip\n\nSource layer: " +
                    result.sourceLayerName +
                    "\nTarget layer: " +
                    result.targetLayerName +
                    "\nProperty: " +
                    result.propertyName +
                    "\nAxis: " +
                    result.axis +
                    "\nApplied toggle expression."
            );
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runBakeScreenFlip = function (options) {
        var comp;
        var result;

        try {
            comp = requireActiveComp();
            app.beginUndoGroup("ReOm Screen Flip Bake");
            result = api.bakeScreenFlip(comp, (options && options.axis) || "horizontal", options || {});
            app.endUndoGroup();
            alert(
                "ReOm Screen Flip\n\nSource layer: " +
                    result.sourceLayerName +
                    "\nTarget layer: " +
                    result.targetLayerName +
                    "\nProperty: " +
                    result.propertyName +
                    "\nAxis: " +
                    result.axis +
                    "\nTriggers baked: " +
                    result.triggers
            );
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runCreateMidiMapTextNull = function (expressionText) {
        var comp;
        var sourceLayer;
        var result;
        var text = String(expressionText || "").replace(/^\s+|\s+$/g, "");

        try {
            if (!text) {
                throw new Error("Generate a MIDI Map expression first.");
            }
            comp = requireActiveComp();
            sourceLayer = api.resolveMidiSourceLayer(comp, {});
            app.beginUndoGroup("ReOm MIDI Map Text");
            result = api.createMidiMapTextLayer(comp, sourceLayer, text);
            app.endUndoGroup();
            alert("ReOm MIDI Map\n\nSource layer: " + sourceLayer.name + "\nCreated text layer: " + result.layerName);
        } catch (err) {
            try {
                app.endUndoGroup();
            } catch (undoErr) {}
            api.alertError(formatCatchError(err));
        }
    };

    api.runBakeMidiAction = api.runCreateMidiActionNullWithBake;

    api.launch = function (panel) {
        var ui = api.buildUI(panel);
        if (ui instanceof Window) {
            ui.center();
            ui.show();
        }
        return ui;
    };

    if (!api.__NO_AUTO_LAUNCH__) {
        api.launch(thisObj);
    }
})(ReOmMIDI, reomScriptThis(this));
