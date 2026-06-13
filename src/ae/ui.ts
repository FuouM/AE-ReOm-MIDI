(function (api: ReOmMIDIApi) {
    function globalState(): ReOmGlobalState {
        var state = api.getGlobalState();
        if (!state) {
            throw new Error("ReOm MIDI global state is unavailable.");
        }
        return state;
    }

    function makeProgress(title: string) {
        var win = new Window("palette", title);
        var label = win.add("statictext", undefined, "Starting...");
        var bar = win.add("progressbar", undefined, 0, 100);
        var cancel = win.add("button", undefined, "Cancel");
        var running = true;

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.margins = 14;
        win.spacing = 8;
        win.preferredSize.width = 360;

        cancel.onClick = function () {
            running = false;
        };

        win.show();

        return {
            update: function (text: string, ratio: number) {
                label.text = text;
                bar.value = Math.max(0, Math.min(100, Math.round(ratio * 100)));
                if (win.update) {
                    win.update();
                }
                return running;
            },
            close: function () {
                win.close();
            }
        };
    }

    function addLabeledControl(
        parent: Window | Panel | Tab | Group,
        labelText: string,
        controlType: string,
        controlText?: string | string[]
    ) {
        var group = parent.add("group");
        var label = group.add("statictext", undefined, labelText);
        var control = group.add(controlType as "edittext", undefined, controlText as string) as unknown as _Control;
        group.orientation = "row";
        group.alignChildren = ["fill", "center"];
        label.preferredSize.width = 96;
        control.alignment = ["fill", "center"];
        if (controlType === "dropdownlist" || controlType === "listbox") {
            control.onClick = function () {
                syncDropdownControlWidth(control);
            };
        }
        return control;
    }

    function setLabeledControlLabel(control: _Control | null, labelText: string) {
        var label;
        if (!control || !control.parent) {
            return;
        }
        label = control.parent.children && control.parent.children[0];
        if (label) {
            label.text = labelText;
        }
    }

    function setLabeledControlVisible(control: _Control | null, visible: boolean) {
        var row;
        if (!control) {
            return;
        }
        row = control.parent;
        control.visible = visible;
        if (row) {
            row.visible = visible;
        }
    }

    function setScriptUiGroupVisible(group: _Control | null, visible: boolean) {
        if (!group) {
            return;
        }
        group.visible = visible;
        if (visible) {
            group.maximumSize = [10000, 10000];
            if (group._reomSavedGroupSize) {
                group.minimumSize = group._reomSavedGroupSize.minimumSize as Dimension;
                group.preferredSize = group._reomSavedGroupSize.preferredSize as Dimension;
                group.margins = group._reomSavedGroupSize.margins;
                group.spacing = group._reomSavedGroupSize.spacing;
            }
            return;
        }
        if (!group._reomSavedGroupSize) {
            group._reomSavedGroupSize = {
                minimumSize: group.minimumSize,
                preferredSize: group.preferredSize,
                margins: group.margins,
                spacing: group.spacing
            };
        }
        group.margins = 0;
        group.spacing = 0;
        group.minimumSize = [0, 0];
        group.preferredSize = [0, 0];
        group.maximumSize = [10000, 0];
    }

    function scriptUiPreservesWidthMin(control: _Control | null): boolean {
        if (!control) {
            return false;
        }
        if (control._reomPreserveMinWidth) {
            return true;
        }
        if (control.type === "button") {
            return control.minimumSize && control.minimumSize[0] >= 72;
        }
        return false;
    }

    function previewUiIsBusy(): boolean {
        var state;
        if (typeof $ === "undefined" || !$.global) {
            return false;
        }
        state = globalState();
        return !!(state.previewProgressHook || state.actionPreviewLoading || state.pianoRollPreviewLoading);
    }

    function previewLayoutGuardIsActive(): boolean {
        var state;
        if (typeof $ === "undefined" || !$.global) {
            return false;
        }
        state = globalState();
        return !!(state.panelHostPreviewLayoutGuard || previewUiIsBusy());
    }

    function runWithPreviewLayoutGuard(fn: () => void): void {
        globalState().panelHostPreviewLayoutGuard = true;
        try {
            fn();
        } finally {
            globalState().panelHostPreviewLayoutGuard = false;
        }
    }

    function scriptUiControlHasStaleWidthLock(node: _Control | null, hostWidth: number): boolean {
        var type;
        var minW;
        var prefW;
        var maxW;

        if (!node || scriptUiPreservesWidthMin(node)) {
            return false;
        }
        type = node.type;
        minW = node.minimumSize ? node.minimumSize[0] : 0;
        prefW = node.preferredSize ? node.preferredSize[0] : -1;
        maxW = node.maximumSize ? node.maximumSize[0] : 10000;
        if (type === "group" || type === "panel" || type === "tab" || type === "tabbedpanel") {
            return minW > 0 || prefW > 0;
        }
        if (type === "dropdownlist" || type === "listbox") {
            return minW > 0 || prefW > hostWidth || maxW < 10000;
        }
        if (type === "statictext" || type === "edittext") {
            return minW > 0 || prefW > hostWidth;
        }
        return false;
    }

    function clearStaleScriptUiWidthLocks(node: _Control | null, hostWidth: number): void {
        var children;
        var i;
        var minH;
        var prefH;
        var maxH;
        var type;

        if (!node) {
            return;
        }
        hostWidth = Math.max(0, hostWidth || 0);
        children = node.children;
        if (children) {
            for (i = 0; i < children.length; i += 1) {
                clearStaleScriptUiWidthLocks(children[i], hostWidth);
            }
        }
        if (!scriptUiControlHasStaleWidthLock(node, hostWidth)) {
            return;
        }
        if (scriptUiPreservesWidthMin(node)) {
            return;
        }
        type = node.type;
        if (type === "group" || type === "panel" || type === "tab" || type === "tabbedpanel") {
            minH = node.minimumSize ? node.minimumSize[1] : 0;
            node.minimumSize = [0, minH];
            prefH = node.preferredSize ? node.preferredSize[1] : -1;
            node.preferredSize = [0, prefH != null ? prefH : -1];
            return;
        }
        if (type === "dropdownlist" || type === "listbox") {
            minH = node.minimumSize ? node.minimumSize[1] : 0;
            node.minimumSize = [0, minH];
            prefH = node.preferredSize ? node.preferredSize[1] : -1;
            node.preferredSize = [-1, prefH != null ? prefH : -1];
            maxH = node.maximumSize ? node.maximumSize[1] : 10000;
            node.maximumSize = [10000, maxH != null ? maxH : 10000];
            return;
        }
        if (type === "statictext" || type === "edittext") {
            minH = node.minimumSize ? node.minimumSize[1] : 0;
            node.minimumSize = [0, minH];
            if (node.preferredSize) {
                prefH = node.preferredSize[1];
                if (node.preferredSize[0] === -1 || node.preferredSize[0] > hostWidth) {
                    node.preferredSize = [0, prefH != null ? prefH : -1];
                }
            }
        }
    }

    function scriptUiControlBoundsWidth(control: _Control | null | undefined): number {
        var boundsControl;
        if (!control) {
            return 0;
        }
        if (control.size && control.size[0] > 0) {
            return control.size[0];
        }
        boundsControl = control as { bounds?: { width?: number } };
        if (boundsControl.bounds && boundsControl.bounds.width && boundsControl.bounds.width > 0) {
            return boundsControl.bounds.width;
        }
        return 0;
    }

    function syncDropdownControlWidth(control: _Control | null | undefined): void {
        var width;
        var minH;
        var prefH;
        var maxH;
        if (!control || (control.type !== "dropdownlist" && control.type !== "listbox")) {
            return;
        }
        width = scriptUiControlBoundsWidth(control);
        if (width <= 0) {
            return;
        }
        minH = control.minimumSize ? control.minimumSize[1] : 0;
        prefH = control.preferredSize ? control.preferredSize[1] : -1;
        maxH = control.maximumSize ? control.maximumSize[1] : 10000;
        control.minimumSize = [0, minH];
        control.preferredSize = [width, prefH != null ? prefH : -1];
        // Keep horizontal maximum flexible so parent relayout can shrink after resize/preview.
        control.maximumSize = [10000, maxH != null ? maxH : 10000];
    }

    function syncDropdownControlWidths(node: _Control | null | undefined): void {
        var children;
        var i;
        if (!node) {
            return;
        }
        syncDropdownControlWidth(node);
        children = node.children;
        if (children) {
            for (i = 0; i < children.length; i += 1) {
                syncDropdownControlWidths(children[i]);
            }
        }
    }

    var PANEL_WIDTH_DEFAULT = 600;

    function pianoRollPreviewNoteColor(isDrum: boolean, opacity: number): number[] {
        if (isDrum) {
            return [0.96, 0.62, 0.04, opacity];
        }
        return [0.22, 0.74, 0.97, opacity];
    }

    function drawPianoRollPreviewCanvas(
        canvasPanel: Group,
        layout: PianoRollPreviewLayout & { loading?: boolean }
    ): void {
        var g = canvasPanel.graphics;
        var dims = previewCanvasSize(canvasPanel);
        var w = dims[0];
        var h = dims[1];
        var pad = 10;
        var plotW = Math.max(1, w - pad * 2);
        var plotH = Math.max(1, h - pad * 2);
        var bounds = layout.bounds;
        var rects = layout.rects;
        var graphOpacity = layout.loading ? MIDI_ACTION_PREVIEW_LOADING_GRAPH_OPACITY : 1;
        var dataW: number;
        var dataH: number;
        var axisPen;
        var hasGraph = !!(bounds && rects && rects.length);
        var i;
        var rect;
        var left;
        var right;
        var top;
        var barW;
        var barH;
        var color;

        if (!g || !layout) {
            return;
        }

        g.newPath();
        g.rectPath(0, 0, w, h);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR as never, colorWithOpacity([0.063, 0.075, 0.094], graphOpacity)));

        if (hasGraph) {
            dataW = Math.max(1, bounds.right - bounds.left);
            dataH = Math.max(1, bounds.bottom - bounds.top);
            axisPen = g.newPen(
                g.PenType.SOLID_COLOR as never,
                colorWithOpacity([0.396, 0.439, 0.525], graphOpacity),
                1
            );

            g.newPath();
            g.moveTo(pad, pad + plotH);
            g.lineTo(pad + plotW, pad + plotH);
            g.moveTo(pad, pad);
            g.lineTo(pad, pad + plotH);
            g.strokePath(axisPen);

            for (i = 0; i < rects.length; i += 1) {
                rect = rects[i];
                left = pad + ((rect.left - bounds.left) / dataW) * plotW;
                right = pad + ((rect.right - bounds.left) / dataW) * plotW;
                top = pad + ((rect.y - rect.height / 2 - bounds.top) / dataH) * plotH;
                barW = Math.max(right - left, 1);
                barH = Math.max((rect.height / dataH) * plotH, 1);
                color = pianoRollPreviewNoteColor(!!rect.isDrum, ((rect.opacity || 100) / 100) * graphOpacity);
                g.newPath();
                g.rectPath(left, top, barW, barH);
                g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR as never, color));
            }
        } else if (!layout.loading) {
            return;
        }
    }

    function bindPianoRollPreviewCanvas(
        canvasPanel: Group,
        layout: PianoRollPreviewLayout & { loading?: boolean }
    ): void {
        canvasPanel._pianoRollPreviewLayout = layout;
        canvasPanel._pianoRollPreviewRevision = (canvasPanel._pianoRollPreviewRevision || 0) + 1;
        canvasPanel.onDraw = function () {
            if (!this._pianoRollPreviewLayout) {
                return;
            }
            drawPianoRollPreviewCanvas(this, this._pianoRollPreviewLayout);
        };
    }

    function repaintScriptUiHost(host: Window | Panel | null | undefined): void {
        if (host && host.update) {
            try {
                host.update();
            } catch (hostUpdateErr) {}
        }
    }

    function layoutScriptUiHost(
        host: Window | Panel | null | undefined,
        recalculate?: boolean,
        applyHostLayoutResize?: boolean
    ): void {
        if (!host || !host.layout) {
            return;
        }
        if (recalculate !== false) {
            host.layout.layout(true);
        } else if (host.layout.layout) {
            host.layout.layout(false);
        }
        if (applyHostLayoutResize !== false && host.layout.resize) {
            host.layout.resize();
        }
    }

    function refreshScriptUiHost(
        host: Window | Panel | null | undefined,
        recalculate?: boolean,
        shouldRepaint?: boolean
    ): void {
        layoutScriptUiHost(host, recalculate);
        if (shouldRepaint !== false) {
            repaintScriptUiHost(host);
        }
    }

    function resizeScriptUiHost(host: Window | Panel | null | undefined, shouldRepaint?: boolean): void {
        refreshScriptUiHost(host, false, shouldRepaint);
    }

    var PANEL_HEIGHT_DEFAULT = 880;
    var PANEL_MIN_WIDTH = 420;
    var PANEL_LOCKED_HEIGHT = 880;
    var PREVIEW_CANVAS_MAX_HEIGHT = 260;
    var PREVIEW_SUMMARY_MAX_HEIGHT = 56;
    // Max vertical trigger lines drawn on the action preview graph.
    var PREVIEW_MAX_TRIGGER_LINES = 220;
    // Toolbar group height reserved when inferring preview canvas size from parent.
    var PREVIEW_TOOLBAR_RESERVE_HEIGHT = 48;
    var ACTION_SETTINGS_PANEL_BASE_HEIGHT = 56;
    var ACTION_SETTINGS_PANEL_ROW_HEIGHT = 28;
    // Default simulation sample interval (seconds) for MIDI action previews.
    api.PREVIEW_SIM_STEP_SEC = 1 / 24;
    // Cap preview duration (seconds) when MIDI length is open-ended.
    api.PREVIEW_MAX_DURATION_SEC = 30;
    // Delay before running deferred preview compute off the UI thread.
    api.DEFERRED_PREVIEW_TASK_MS = 32;
    // Throttle live window resize relayout to avoid ScriptUI jank while dragging narrower.
    var PANEL_LIVE_RESIZE_MS = 24;

    function applyLockedWindowHeightFromState(state: ReOmPanelUiState | null | undefined): void {
        if (!state || !state.win) {
            return;
        }
        state.lockedWindowHeight = PANEL_LOCKED_HEIGHT;
        if (state.isPanel) {
            // Docked AE panels: host frame owns outer size; don't pin height min/max.
            state.win.minimumSize = [PANEL_MIN_WIDTH, 0];
            state.win.maximumSize = [10000, 10000];
        } else {
            state.win.minimumSize = [PANEL_MIN_WIDTH, PANEL_LOCKED_HEIGHT];
            state.win.maximumSize = [10000, PANEL_LOCKED_HEIGHT];
            if (state.win.size && state.win.size[1] !== PANEL_LOCKED_HEIGHT) {
                state.win.size = [state.win.size[0], PANEL_LOCKED_HEIGHT];
            }
        }
        refreshScriptUiHost(state.win);
    }

    function bindPanelResizeHandlers(
        win: Window | Panel,
        panelState: ReOmPanelUiState,
        mapPreviewState: ReOmPreviewState,
        actionPreviewState: ReOmPreviewState
    ): void {
        function panelHostResizeWidth(): number {
            if (win.size && win.size[0] > 0) {
                return win.size[0];
            }
            return PANEL_WIDTH_DEFAULT;
        }

        function relayoutPanelHostDuringResize() {
            var hostWidth;
            var lastWidth;
            var now;
            var lastLiveResizeMs;
            if (previewLayoutGuardIsActive()) {
                return;
            }
            now = new Date().getTime();
            lastLiveResizeMs = globalState().panelHostLiveResizeMs;
            if (typeof lastLiveResizeMs === "number" && now - lastLiveResizeMs < PANEL_LIVE_RESIZE_MS) {
                return;
            }
            globalState().panelHostLiveResizeMs = now;
            hostWidth = panelHostResizeWidth();
            lastWidth = globalState().panelHostLiveWidth || hostWidth;
            if (hostWidth === lastWidth) {
                return;
            }
            if (hostWidth < lastWidth) {
                clearStaleScriptUiWidthLocks(win as unknown as _Control, hostWidth);
            }
            globalState().panelHostLiveWidth = hostWidth;
            layoutScriptUiHost(win, false, false);
            repaintScriptUiHost(win);
        }

        function finalizePanelHostResize() {
            var hostWidth;
            if (previewLayoutGuardIsActive()) {
                return;
            }
            hostWidth = panelHostResizeWidth();
            globalState().panelHostLiveWidth = hostWidth;
            globalState().panelHostLiveResizeMs = 0;
            clearStaleScriptUiWidthLocks(win as unknown as _Control, hostWidth);
            layoutScriptUiHost(win, false, true);
            repaintScriptUiHost(win);
            refreshExpandedPreviewHosts(win, mapPreviewState, actionPreviewState);
        }

        win.onResize = finalizePanelHostResize;
        if (!panelState.isPanel) {
            win.onResizing = relayoutPanelHostDuringResize;
        }
    }

    function primePreviewHostLayout(previewState: ReOmPreviewState, _rootWin: Window | Panel, forceReprime?: boolean) {
        var container;
        if (!previewState || !previewState.expanded || !previewState.canvas) {
            return;
        }
        if (forceReprime === true) {
            previewState.layoutPrimed = false;
        }
        applyPreviewHostExpandedLayout(previewState, true);
        container = previewState.container;
        if (!container || !container.layout) {
            return;
        }
        if (!previewState.layoutPrimed) {
            if (container.layout.layout) {
                container.layout.layout(true);
            }
            previewState.layoutPrimed = true;
        } else if (container.layout.layout) {
            container.layout.layout(false);
        }
    }

    function refreshExpandedPreviewHosts(
        rootWin: Window | Panel,
        mapState: ReOmPreviewState,
        actionState: ReOmPreviewState,
        forceReprime?: boolean
    ) {
        var lightRepaint = previewUiIsBusy();
        if (globalState().panelHostPreviewLayoutGuard) {
            return;
        }
        if (mapState && mapState.expanded && mapState.canvas) {
            primePreviewHostLayout(mapState, rootWin, forceReprime);
            repaintPreviewCanvas(mapState.canvas, rootWin, lightRepaint);
        }
        if (actionState && actionState.expanded && actionState.canvas) {
            primePreviewHostLayout(actionState, rootWin, forceReprime);
            repaintPreviewCanvas(actionState.canvas, rootWin, lightRepaint);
        }
    }

    api.refreshPreviewPanels = function (forceReprime) {
        var state = api.__panelUiState;
        if (!state || !state.win) {
            return;
        }
        refreshExpandedPreviewHosts(state.win, state.mapPreviewState, state.actionPreviewState, forceReprime === true);
    };

    function previewStateForFlush(
        flushName: string,
        state: ReOmPanelUiState | null | undefined
    ): ReOmPreviewState | null {
        if (!state) {
            return null;
        }
        if (flushName === "flushActionPreviewCanvas") {
            return state.actionPreviewState;
        }
        if (flushName === "flushPianoRollPreviewCanvas") {
            return state.mapPreviewState;
        }
        return null;
    }

    function previewCanvasNeedsReprime(canvasPanel: Group | null | undefined): boolean {
        var size;
        if (!canvasPanel || !canvasPanel.size) {
            return true;
        }
        size = canvasPanel.size;
        return size[0] < 20 || size[1] < 20;
    }

    api.beginDeferredPreviewUi = function (flushName) {
        var generation;
        if (typeof $ === "undefined" || !$.global) {
            return 0;
        }
        generation = (globalState().previewUiGeneration || 0) + 1;
        globalState().previewUiGeneration = generation;
        globalState().previewUiFlushName = flushName;
        return generation;
    };

    api.__finalizeDeferredPreviewUi = function (generation, afterCompute) {
        var state = api.__panelUiState;
        var flushName;
        var previewState;
        var canvas;
        var forceReprime;
        if (typeof $ === "undefined" || !$.global) {
            return;
        }
        if (generation && globalState().previewUiGeneration !== generation) {
            return;
        }
        if (!state || !state.win) {
            return;
        }
        flushName = globalState().previewUiFlushName || "";
        previewState = previewStateForFlush(flushName, state);
        if (previewState && previewState.expanded && previewState.canvas) {
            canvas = previewState.canvas;
            forceReprime = afterCompute === 1 || afterCompute === true || previewCanvasNeedsReprime(canvas);
            if (forceReprime) {
                applyPreviewHostExpandedLayout(previewState, true);
                if (previewState.container && previewState.container.layout && previewState.container.layout.layout) {
                    previewState.container.layout.layout(true);
                }
                previewState.layoutPrimed = true;
            }
            repaintPreviewCanvas(canvas, state.win, !(afterCompute === 1 || afterCompute === true));
        }
        if (afterCompute === 1 || afterCompute === true) {
            clearStaleScriptUiWidthLocks(
                state.win as unknown as _Control,
                state.win && state.win.size && state.win.size[0] > 0 ? state.win.size[0] : PANEL_WIDTH_DEFAULT
            );
            layoutScriptUiHost(state.win, false, false);
            repaintScriptUiHost(state.win);
        }
    };

    api.scheduleDeferredPreviewUi = function (generation, delayMs, afterCompute) {
        var afterFlag = afterCompute ? 1 : 0;
        delayMs = delayMs || 1;
        app.scheduleTask(
            "try { if (ReOmMIDI.__finalizeDeferredPreviewUi) { ReOmMIDI.__finalizeDeferredPreviewUi(" +
                generation +
                ", " +
                afterFlag +
                "); } } catch (e) {}",
            delayMs,
            false
        );
    };

    function findPreviewHostTab(canvasPanel: _Control | Group | null | undefined): Tab | null {
        var node: _Control | null = canvasPanel as unknown as _Control;
        while (node && node.type !== "tab") {
            node = node.parent || null;
        }
        return node as unknown as Tab | null;
    }

    function invokeCanvasOnDraw(canvasPanel: _Control | Group | null | undefined): void {
        if (!canvasPanel) {
            return;
        }
        try {
            if (typeof canvasPanel.onDraw === "function") {
                canvasPanel.onDraw({} as never);
            }
        } catch (drawErr) {}
        try {
            if (canvasPanel.notify) {
                canvasPanel.notify("onDraw");
            }
        } catch (notifyErr) {}
    }

    function relayoutPreviewHost(
        rootWin: Window | Panel | null | undefined,
        canvasPanel: _Control | Group | null | undefined
    ): void {
        var tab = findPreviewHostTab(canvasPanel);
        if (tab && tab.layout && tab.layout.resize) {
            tab.layout.resize();
        }
        if (canvasPanel && canvasPanel.parent && canvasPanel.parent.layout && canvasPanel.parent.layout.resize) {
            canvasPanel.parent.layout.resize();
        }
    }

    function repaintPreviewSubtree(node: _Control | null | undefined): void {
        var current = node;
        while (current) {
            if (current.update) {
                try {
                    current.update();
                } catch (updateErr) {}
                return;
            }
            current = current.parent || null;
        }
    }

    function relayoutPreviewTabHost(
        _rootWin: Window | Panel | null | undefined,
        previewState: ReOmPreviewState | null | undefined,
        recalculate?: boolean
    ): void {
        var container;
        var tab;
        if (!previewState || !previewState.container) {
            return;
        }
        container = previewState.container;
        if (!previewState.expanded) {
            if (container.layout && container.layout.layout) {
                container.layout.layout(false);
            }
            repaintPreviewSubtree(container as unknown as _Control);
            return;
        }
        applyPreviewHostExpandedLayout(previewState, true);
        if (recalculate === true || !previewState.layoutPrimed) {
            tab = findPreviewHostTab(container as unknown as _Control);
            if (tab && tab.layout && tab.layout.layout) {
                tab.layout.layout(false);
            }
            if (container.layout && container.layout.layout) {
                container.layout.layout(recalculate === true);
            }
            previewState.layoutPrimed = true;
        } else if (container.layout && container.layout.layout) {
            container.layout.layout(false);
        }
        repaintPreviewSubtree(container as unknown as _Control);
    }

    function nudgeCanvasRepaint(canvasPanel: _Control | Group | null | undefined): void {
        var size;
        var h;
        if (!canvasPanel) {
            return;
        }
        try {
            size = canvasPanel.size;
            h = size && size[1] >= 20 ? size[1] : 120;
            canvasPanel.preferredSize = [-1, h + 1];
            if (canvasPanel.parent && canvasPanel.parent.layout && canvasPanel.parent.layout.resize) {
                canvasPanel.parent.layout.resize();
            }
            if (canvasPanel.layout && canvasPanel.layout.resize) {
                canvasPanel.layout.resize();
            }
            canvasPanel.preferredSize = [-1, -1];
        } catch (nudgeErr) {}
    }

    function repaintPreviewProgressSummary(summary: _Control | null | undefined): void {
        var parent;
        if (!summary) {
            return;
        }
        parent = summary.parent;
        if (parent && parent.update) {
            try {
                parent.update();
            } catch (parentUpdateErr) {}
            return;
        }
        if (summary.update) {
            try {
                summary.update();
            } catch (summaryUpdateErr) {}
        }
    }

    function repaintPreviewCanvas(
        canvasPanel: _Control | Group | null | undefined,
        rootWin: Window | Panel | null | undefined,
        light?: boolean
    ): void {
        if (!canvasPanel) {
            return;
        }
        if (!light) {
            relayoutPreviewHost(rootWin, canvasPanel);
            nudgeCanvasRepaint(canvasPanel);
        }
        invokeCanvasOnDraw(canvasPanel);
        if (!light) {
            repaintScriptUiHost(rootWin);
        }
    }

    function flushActionPreviewCanvasNow() {
        var canvas = globalState().actionPreviewCanvas;
        var root = globalState().actionPreviewCanvasRoot;
        if (!canvas) {
            return;
        }
        repaintPreviewCanvas(canvas, root as Window | Panel | null | undefined, true);
    }

    api.flushActionPreviewCanvas = flushActionPreviewCanvasNow;

    function queueActionPreviewRedraw(
        canvasPanel: Group | null | undefined,
        rootWin: Window | Panel | null | undefined
    ): void {
        if (!canvasPanel) {
            return;
        }
        globalState().actionPreviewCanvas = canvasPanel as unknown as _Control;
        if (rootWin) {
            globalState().actionPreviewCanvasRoot = rootWin as unknown as _Control;
        }
        flushActionPreviewCanvasNow();
    }

    function flushPianoRollPreviewCanvasNow() {
        var canvas = globalState().previewCanvas;
        var root = globalState().previewCanvasRoot;
        if (!canvas) {
            return;
        }
        repaintPreviewCanvas(canvas, root as Window | Panel | null | undefined, true);
    }

    api.flushPianoRollPreviewCanvas = flushPianoRollPreviewCanvasNow;

    function queuePianoRollPreviewRedraw(
        canvasPanel: Group | null | undefined,
        rootWin: Window | Panel | null | undefined
    ): void {
        if (!canvasPanel) {
            return;
        }
        globalState().previewCanvas = canvasPanel as unknown as _Control;
        if (rootWin) {
            globalState().previewCanvasRoot = rootWin as unknown as _Control;
        }
        flushPianoRollPreviewCanvasNow();
    }

    function invalidatePianoRollPreviewCanvas(
        canvasPanel: Group | null | undefined,
        rootWin: Window | Panel | null | undefined
    ): void {
        queuePianoRollPreviewRedraw(canvasPanel, rootWin);
    }

    var MIDI_ACTION_PREVIEW_LOADING_GRAPH_OPACITY = 0.34;
    var PREVIEW_PROGRESS_UI_MS = 125;
    var MIDI_ACTION_PREVIEW_PROGRESS_STAGES = [
        { id: "prepare", weight: 5, label: "Preparing options" },
        { id: "keyframes", weight: 25, label: "Reading keyframes" },
        { id: "triggers", weight: 20, label: "Collecting triggers" },
        { id: "simulate", weight: 45, label: "Simulating curve" },
        { id: "finalize", weight: 5, label: "Finishing preview" }
    ];
    var PIANO_ROLL_PREVIEW_PROGRESS_STAGES = [
        { id: "prepare", weight: 5, label: "Preparing map options" },
        { id: "notes", weight: 45, label: "Collecting notes" },
        { id: "rects", weight: 45, label: "Building note bars" },
        { id: "finalize", weight: 5, label: "Finishing preview" }
    ];

    function previewProgressSummaryControl(kind: string): _Control | null | undefined {
        if (typeof $ === "undefined" || !$.global) {
            return null;
        }
        if (kind === "pianoRoll") {
            return globalState().pianoRollPreviewLoadingSummary;
        }
        return globalState().actionPreviewLoadingSummary;
    }

    function previewProgressRootWin(kind: string): Window | Panel | _Control | null | undefined {
        if (typeof $ === "undefined" || !$.global) {
            return null;
        }
        if (kind === "pianoRoll") {
            return globalState().previewCanvasRoot;
        }
        return globalState().actionPreviewCanvasRoot;
    }

    function formatPreviewProgressSummary(sourceLabel: string, percent: number, stageLabel: string): string {
        return (
            "Calculating preview" +
            (sourceLabel ? " for " + sourceLabel : "") +
            " — " +
            Math.round(percent) +
            "%\n" +
            (stageLabel || "Working")
        );
    }

    function applyPreviewProgress(hook: PreviewProgressHook | null | undefined): void {
        var now;
        var summary;
        if (!hook) {
            return;
        }
        now = new Date().getTime();
        if (
            typeof hook.percent !== "number" ||
            (hook.percent < 100 && hook.lastUiMs && now - hook.lastUiMs < PREVIEW_PROGRESS_UI_MS)
        ) {
            return;
        }
        hook.lastUiMs = now;
        summary = previewProgressSummaryControl(hook.kind || "");
        if (summary) {
            summary.text = formatPreviewProgressSummary(hook.sourceLabel || "", hook.percent, hook.stageLabel || "");
            repaintPreviewProgressSummary(summary);
        }
        if (hook.kind === "midiAction" && globalState().actionPreviewCanvas) {
            invokeCanvasOnDraw(globalState().actionPreviewCanvas as unknown as Group);
        } else if (hook.kind === "pianoRoll" && globalState().previewCanvas) {
            invokeCanvasOnDraw(globalState().previewCanvas as unknown as Group);
        }
    }

    function buildPreviewProgressHook(kind: string, sourceLabel: string): PreviewProgressHook {
        var stages = kind === "pianoRoll" ? PIANO_ROLL_PREVIEW_PROGRESS_STAGES : MIDI_ACTION_PREVIEW_PROGRESS_STAGES;
        var hook: any = {
            kind: kind,
            sourceLabel: sourceLabel || "",
            stages: stages,
            stageIndex: -1,
            stageId: null,
            stageBase: 0,
            stageWeight: 0,
            percent: 0,
            stageLabel: "Starting",
            lastUiMs: 0
        };

        hook.setStage = function (stageId: string, labelOverride?: string) {
            var idx;
            var base = 0;
            for (idx = 0; idx < stages.length; idx += 1) {
                if (stages[idx].id === stageId) {
                    hook.stageIndex = idx;
                    hook.stageId = stageId;
                    hook.stageBase = base;
                    hook.stageWeight = stages[idx].weight;
                    hook.stageLabel = labelOverride || stages[idx].label;
                    hook.report(base, hook.stageLabel);
                    return;
                }
                base += stages[idx].weight;
            }
        };

        hook.step = function (done: number, total: number, detail?: string) {
            var frac = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
            hook.report(hook.stageBase + frac * hook.stageWeight, detail || hook.stageLabel);
        };

        hook.report = function (percent: number, label?: string) {
            hook.percent = Math.min(100, Math.max(0, percent));
            if (label) {
                hook.stageLabel = label;
            }
            applyPreviewProgress(hook);
        };

        hook.finish = function () {
            hook.report(100, "Done");
        };

        return hook;
    }

    api.getActivePreviewProgressHook = function () {
        if (typeof $ === "undefined" || !$.global) {
            return null;
        }
        return globalState().previewProgressHook || null;
    };

    api.beginPreviewProgress = function (kind, sourceLabel) {
        var hook = buildPreviewProgressHook(kind, sourceLabel || "");
        if (typeof $ !== "undefined" && $.global) {
            globalState().previewProgressHook = hook;
        }
        hook.setStage("prepare");
        return hook;
    };

    api.clearPreviewProgress = function () {
        if (typeof $ !== "undefined" && $.global) {
            globalState().previewProgressHook = null;
        }
    };

    api.endPreviewProgress = function (hook) {
        if (hook && hook.finish) {
            hook.finish();
        }
        if (api.clearPreviewProgress) {
            api.clearPreviewProgress();
        }
    };

    function colorWithOpacity(color: number[], opacity: number): number[] {
        if (!color || !color.length) {
            return color;
        }
        if (color.length >= 4) {
            return [color[0], color[1], color[2], color[3] * opacity];
        }
        return [color[0], color[1], color[2], opacity];
    }

    function pianoRollPreviewLoadingLayout(
        canvasPanel: Group,
        sourceLabel: string
    ): PianoRollPreviewLayout & { loading?: boolean; loadingFrame?: number } {
        var previous = canvasPanel && canvasPanel._pianoRollPreviewLayout;
        if (previous && previous.rects && previous.rects.length && !previous.loading) {
            return {
                loading: true,
                loadingFrame: 0,
                rects: previous.rects,
                bounds: previous.bounds,
                noteCount: previous.rects.length,
                sourceLabel: sourceLabel || previous.sourceLabel || "MIDI",
                description: previous.description || ""
            };
        }
        return {
            loading: true,
            loadingFrame: 0,
            rects: [] as PianoRollRect[],
            bounds: { left: 0, right: 1, top: 128, bottom: 21 },
            noteCount: 0,
            sourceLabel: sourceLabel || "MIDI",
            description: ""
        };
    }

    api.showPianoRollPreviewLoadingInPanel = function (sourceLabel) {
        var host;
        var targets;
        host = api.__mapPreviewHost;
        if (!host || !host.ensure) {
            return;
        }
        if (host.selectTab) {
            host.selectTab();
        }
        targets = host.ensure();
        if (targets.canvas) {
            bindPianoRollPreviewCanvas(
                targets.canvas,
                pianoRollPreviewLoadingLayout(targets.canvas, sourceLabel || "")
            );
        }
        globalState().previewCanvas = targets.canvas as unknown as _Control;
        globalState().previewCanvasRoot = host.win || null;
        if (targets.canvas && targets.summary) {
            armPreviewLoadingDisplay(host, targets, sourceLabel || "", startPianoRollPreviewLoadingAnimation);
        }
    };

    api.showPianoRollPreviewInPanel = function (layout) {
        var host;
        var targets;
        if (!layout) {
            return;
        }
        stopPianoRollPreviewLoadingAnimation();
        host = api.__mapPreviewHost;
        if (!host || !host.ensure) {
            api.alertError("Reopen the ReOm MIDI panel after reloading the script, then try Preview Map again.");
            return;
        }
        if (host.selectTab) {
            host.selectTab();
        }
        targets = host.ensure();
        if (targets.summary) {
            targets.summary.text = "Source: " + layout.sourceLabel + "\n" + layout.description;
        }
        if (targets.canvas) {
            bindPianoRollPreviewCanvas(targets.canvas, layout);
        }
        globalState().previewCanvas = targets.canvas as unknown as _Control;
        globalState().previewCanvasRoot = host.win || null;
        finishPreviewPanelDisplay(host, targets);
    };

    api.refreshPianoRollPreviewPanel = flushPianoRollPreviewCanvasNow;

    function midiActionPreviewLoadingLayout(
        canvasPanel: Group,
        sourceLabel: string
    ): MidiActionPreviewLayout & { loading?: boolean; loadingFrame?: number } {
        var previous = canvasPanel && canvasPanel._midiActionPreviewLayout;
        if (previous && previous.points && previous.points.length && !previous.loading) {
            return {
                loading: true,
                loadingFrame: 0,
                points: previous.points,
                triggers: previous.triggers || [],
                bounds: previous.bounds,
                triggerCount: (previous.triggers || []).length,
                preset: previous.preset || ("pump" as MidiActionPreset),
                sourceLabel: sourceLabel || previous.sourceLabel || "MIDI",
                description: previous.description || ""
            };
        }
        return {
            loading: true,
            loadingFrame: 0,
            points: [] as MidiActionSimulationPoint[],
            triggers: [] as MidiActionTrigger[],
            bounds: { left: 0, right: 1, top: 100, bottom: 0 },
            triggerCount: 0,
            preset: "pump" as MidiActionPreset,
            sourceLabel: sourceLabel || "MIDI",
            description: ""
        };
    }

    function previewCanvasLayout(
        canvasPanel: Group
    ): PianoRollPreviewLayout | (MidiActionPreviewLayout & { loading?: boolean }) | null {
        return (canvasPanel && (canvasPanel._pianoRollPreviewLayout || canvasPanel._midiActionPreviewLayout)) || null;
    }

    function previewCanvasSize(canvasPanel: Group): number[] {
        var size = canvasPanel.size || [0, 0];
        var w = size[0];
        var h = size[1];
        var node;
        var layout = previewCanvasLayout(canvasPanel);
        if (w >= 20 && h >= 20) {
            if (layout && (layout as { loading?: boolean }).loading) {
                return [Math.max(w, 280), Math.max(h, 140)];
            }
            return [w, h];
        }
        node = canvasPanel.parent;
        while (node) {
            if (node.size) {
                if (node.size[0] >= 20) {
                    w = Math.max(w, node.size[0]);
                }
                if (node.size[1] >= 20) {
                    h = Math.max(h, node.size[1] - PREVIEW_TOOLBAR_RESERVE_HEIGHT);
                }
            }
            if (w >= 20 && h >= 20) {
                break;
            }
            node = node.parent;
        }
        if (layout && (layout as { loading?: boolean }).loading) {
            w = Math.max(w, 280);
            h = Math.max(h, 140);
        }
        return [Math.max(1, w), Math.max(1, h)];
    }

    function armPreviewLoadingDisplay(
        host: ReOmPreviewHost | null | undefined,
        targets: ReOmPreviewState,
        sourceLabel: string,
        startAnimationFn: (
            canvasPanel: Group,
            rootWin: Window | Panel | undefined,
            summaryControl: _Control,
            sourceLabel: string
        ) => void
    ): void {
        if (host && host.previewState && host.previewState.expanded) {
            applyPreviewHostExpandedLayout(host.previewState, true);
        }
        if (targets.summary) {
            targets.summary.text = formatPreviewProgressSummary(sourceLabel, 0, "Starting");
            repaintPreviewProgressSummary(targets.summary);
        }
        if (host && host.win && targets.canvas) {
            invokeCanvasOnDraw(targets.canvas);
        }
        if (host && host.win && targets.canvas && targets.summary) {
            startAnimationFn(targets.canvas, host.win, targets.summary, sourceLabel);
        }
    }

    function addWrappedHintText(parent: Window | Panel | Tab | Group, text: string): _Control {
        var control = parent.add("statictext", undefined, text, { multiline: true });
        control.alignment = ["fill", "top"];
        control.minimumSize = [0, 28];
        return control as unknown as _Control;
    }

    function addOptionsPanel(parent: Window | Panel | Tab | Group, title: string): Panel {
        var panel = parent.add("panel", undefined, title);
        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.margins = 12;
        panel.spacing = 8;
        panel.alignment = ["fill", "top"];
        return panel;
    }

    function addSectionPanel(parent: Window | Panel | Tab | Group, title: string): Panel {
        var section = parent.add("group");
        var caption;
        var body;
        section.orientation = "column";
        section.alignChildren = ["fill", "top"];
        section.alignment = ["fill", "top"];
        section.spacing = 0;
        section.margins = 0;

        caption = section.add("statictext", undefined, title);
        caption.alignment = ["fill", "top"];

        body = section.add("panel", undefined, undefined);
        body.orientation = "column";
        body.alignChildren = ["fill", "top"];
        body.margins = 12;
        body.spacing = 8;
        body.alignment = ["fill", "top"];
        body.sectionShell = section;
        body.sectionCaption = caption;
        return body;
    }

    function applyPreviewHostExpandedLayout(state: ReOmPreviewState, expanded: boolean): void {
        var container = state.container;
        var canvas = state.canvas;
        var toolbarGroup = state.toolbarGroup || state.headerGroup;
        var footerGroup = state.footerGroup;
        var summary = state.summary;
        if (!container) {
            return;
        }
        if (expanded) {
            container.visible = true;
            container.margins = state.containerMargins as Margins;
            container.spacing = typeof state.containerSpacing === "number" ? state.containerSpacing : 0;
            container.alignment = ["fill", "fill"];
            container.preferredSize = [-1, PREVIEW_CANVAS_MAX_HEIGHT + 72];
            container.minimumSize = [0, 180];
            container.maximumSize = [10000, PREVIEW_CANVAS_MAX_HEIGHT + 72];
            if (toolbarGroup) {
                toolbarGroup.visible = true;
                toolbarGroup.alignment = ["fill", "top"];
            }
            if (canvas) {
                canvas.visible = true;
                canvas.alignment = ["fill", "fill"];
                canvas.minimumSize = [0, 120];
                canvas.maximumSize = [10000, PREVIEW_CANVAS_MAX_HEIGHT];
                canvas.preferredSize = [-1, PREVIEW_CANVAS_MAX_HEIGHT];
            }
            if (footerGroup) {
                footerGroup.visible = true;
                footerGroup.alignment = ["fill", "bottom"];
            }
            if (summary) {
                summary.alignment = ["fill", "top"];
                summary.minimumSize = [0, 28];
                summary.maximumSize = [10000, PREVIEW_SUMMARY_MAX_HEIGHT];
                summary.preferredSize = [-1, 40];
            }
            return;
        }
        if (canvas) {
            canvas.visible = false;
            canvas.preferredSize = [-1, 0];
            canvas.minimumSize = [0, 0];
            canvas.maximumSize = [10000, 0];
        }
        if (toolbarGroup) {
            toolbarGroup.visible = false;
        }
        if (footerGroup) {
            footerGroup.visible = false;
        }
        container.margins = 0;
        container.spacing = 0;
        container.alignment = ["fill", "top"];
        container.preferredSize = [-1, 0];
        container.minimumSize = [0, 0];
        container.maximumSize = [10000, 0];
        container.visible = false;
    }

    function stopMidiActionPreviewLoadingAnimation() {
        globalState().actionPreviewLoading = false;
        globalState().actionPreviewLoadingSummary = null;
        globalState().actionPreviewLoadingLabel = null;
        if (api.clearPreviewProgress) {
            api.clearPreviewProgress();
        }
    }

    function startMidiActionPreviewLoadingAnimation(
        canvasPanel: Group,
        rootWin: Window | Panel | undefined,
        summaryControl: _Control,
        sourceLabel: string
    ): void {
        stopMidiActionPreviewLoadingAnimation();
        globalState().actionPreviewLoading = true;
        globalState().actionPreviewLoadingSummary = summaryControl;
        globalState().actionPreviewLoadingLabel = sourceLabel || "";
        globalState().actionPreviewCanvas = canvasPanel as unknown as _Control;
        globalState().actionPreviewCanvasRoot = rootWin as unknown as _Control;
    }

    api.stopMidiActionPreviewLoadingAnimation = stopMidiActionPreviewLoadingAnimation;

    function stopPianoRollPreviewLoadingAnimation() {
        globalState().pianoRollPreviewLoading = false;
        globalState().pianoRollPreviewLoadingSummary = null;
        globalState().pianoRollPreviewLoadingLabel = null;
        if (api.clearPreviewProgress) {
            api.clearPreviewProgress();
        }
    }

    function startPianoRollPreviewLoadingAnimation(
        canvasPanel: Group,
        rootWin: Window | Panel | undefined,
        summaryControl: _Control,
        sourceLabel: string
    ): void {
        stopPianoRollPreviewLoadingAnimation();
        globalState().pianoRollPreviewLoading = true;
        globalState().pianoRollPreviewLoadingSummary = summaryControl;
        globalState().pianoRollPreviewLoadingLabel = sourceLabel || "";
        globalState().previewCanvas = canvasPanel as unknown as _Control;
        globalState().previewCanvasRoot = rootWin as unknown as _Control;
    }

    api.stopPianoRollPreviewLoadingAnimation = stopPianoRollPreviewLoadingAnimation;

    function finishPreviewPanelDisplay(host: ReOmPreviewHost | null | undefined, targets: ReOmPreviewState): void {
        if (host && host.win && targets.canvas) {
            repaintPreviewCanvas(targets.canvas, host.win, true);
        }
    }

    function drawMidiActionPreviewCanvas(
        canvasPanel: Group,
        layout: MidiActionPreviewLayout & { loading?: boolean }
    ): void {
        var g = canvasPanel.graphics;
        var dims = previewCanvasSize(canvasPanel);
        var w = dims[0];
        var h = dims[1];
        var pad = 10;
        var plotW = Math.max(1, w - pad * 2);
        var plotH = Math.max(1, h - pad * 2);
        var bounds = layout.bounds;
        var points = layout.points;
        var triggers = layout.triggers;
        var graphOpacity = layout.loading ? MIDI_ACTION_PREVIEW_LOADING_GRAPH_OPACITY : 1;
        var dataW: number;
        var dataH: number;
        var axisPen;
        var triggerPen;
        var curvePen;
        var maxTriggers;
        var i;
        var tx;
        var hasGraph = !!(bounds && points && points.length);

        function xFor(time: number): number {
            return pad + ((time - bounds.left) / dataW) * plotW;
        }

        function yFor(value: number): number {
            return pad + ((bounds.top - value) / dataH) * plotH;
        }

        if (!g || !layout) {
            return;
        }

        g.newPath();
        g.rectPath(0, 0, w, h);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR as never, colorWithOpacity([0.063, 0.075, 0.094], graphOpacity)));

        if (hasGraph) {
            dataW = Math.max(0.001, bounds.right - bounds.left);
            dataH = Math.max(0.001, bounds.top - bounds.bottom);
            axisPen = g.newPen(
                g.PenType.SOLID_COLOR as never,
                colorWithOpacity([0.396, 0.439, 0.525], graphOpacity),
                1
            );
            triggerPen = g.newPen(
                g.PenType.SOLID_COLOR as never,
                colorWithOpacity([0.82, 0.62, 0.28], graphOpacity),
                1
            );
            curvePen = g.newPen(g.PenType.SOLID_COLOR as never, colorWithOpacity([0.49, 0.83, 0.99], graphOpacity), 2);

            g.newPath();
            g.moveTo(pad, pad + plotH);
            g.lineTo(pad + plotW, pad + plotH);
            g.moveTo(pad, pad);
            g.lineTo(pad, pad + plotH);
            g.strokePath(axisPen);

            if (triggers && triggers.length) {
                maxTriggers = Math.min(triggers.length, PREVIEW_MAX_TRIGGER_LINES);
                for (i = 0; i < maxTriggers; i += 1) {
                    tx = xFor(triggers[i].time);
                    g.newPath();
                    g.moveTo(tx, pad);
                    g.lineTo(tx, pad + plotH);
                    g.strokePath(triggerPen);
                }
            }

            g.newPath();
            g.moveTo(xFor(points[0].time), yFor(points[0].value));
            for (i = 1; i < points.length; i += 1) {
                g.lineTo(xFor(points[i].time), yFor(points[i].value));
            }
            g.strokePath(curvePen);
        } else if (!layout.loading) {
            return;
        }
    }

    function bindMidiActionPreviewCanvas(
        canvasPanel: Group,
        layout: MidiActionPreviewLayout & { loading?: boolean }
    ): void {
        canvasPanel._midiActionPreviewLayout = layout;
        canvasPanel._midiActionPreviewRevision = (canvasPanel._midiActionPreviewRevision || 0) + 1;
        canvasPanel.onDraw = function () {
            if (!this._midiActionPreviewLayout) {
                return;
            }
            drawMidiActionPreviewCanvas(this, this._midiActionPreviewLayout);
        };
    }

    api.showMidiActionPreviewLoadingInPanel = function (sourceLabel) {
        var host;
        var targets;
        host = api.__actionPreviewHost;
        if (!host || !host.ensure) {
            return;
        }
        if (host.selectTab) {
            host.selectTab();
        }
        targets = host.ensure();
        if (targets.canvas) {
            bindMidiActionPreviewCanvas(
                targets.canvas,
                midiActionPreviewLoadingLayout(targets.canvas, sourceLabel || "")
            );
        }
        globalState().actionPreviewCanvas = targets.canvas as unknown as _Control;
        globalState().actionPreviewCanvasRoot = host.win || null;
        if (targets.canvas && targets.summary) {
            armPreviewLoadingDisplay(host, targets, sourceLabel || "", startMidiActionPreviewLoadingAnimation);
        }
    };

    api.showMidiActionPreviewInPanel = function (layout) {
        var host;
        var targets;
        if (!layout) {
            return;
        }
        stopMidiActionPreviewLoadingAnimation();
        host = api.__actionPreviewHost;
        if (!host || !host.ensure) {
            api.alertError("Reopen the ReOm MIDI panel after reloading the script, then try Preview again.");
            return;
        }
        if (host.selectTab) {
            host.selectTab();
        }
        targets = host.ensure();
        if (targets.summary) {
            targets.summary.text = "Source: " + layout.sourceLabel + "\n" + layout.description;
        }
        if (targets.canvas) {
            bindMidiActionPreviewCanvas(targets.canvas, layout);
        }
        globalState().actionPreviewCanvas = targets.canvas as unknown as _Control;
        globalState().actionPreviewCanvasRoot = host.win || null;
        finishPreviewPanelDisplay(host, targets);
    };

    api.refreshActionPreviewPanel = flushActionPreviewCanvasNow;

    function isMidiFilePath(path: string): boolean {
        var ext = String(path || "")
            .replace(/^.*\./, "")
            .toLowerCase();
        return ext === "mid" || ext === "midi";
    }

    function pathFromDropData(data: unknown): string {
        var i;
        var fileLike;
        var items;
        if (!data) {
            return "";
        }
        if (typeof data === "string") {
            return data;
        }
        items = data as { length?: number; fsName?: string; absoluteURI?: string };
        if (items.length !== undefined) {
            for (i = 0; i < items.length; i += 1) {
                fileLike = (data as unknown[])[i] as { fsName?: string; absoluteURI?: string } | string;
                if (typeof fileLike === "string" && fileLike) {
                    return fileLike;
                }
                if (fileLike && typeof fileLike === "object" && fileLike.fsName) {
                    return fileLike.fsName;
                }
                if (fileLike && typeof fileLike === "object" && fileLike.absoluteURI) {
                    return new File(fileLike.absoluteURI).fsName;
                }
            }
        }
        if (items.fsName) {
            return items.fsName;
        }
        if (items.absoluteURI) {
            return new File(items.absoluteURI).fsName;
        }
        return String(data);
    }

    function assignMidiFilePath(fileField: EditText, path: string): boolean {
        var file;
        path = String(path || "").replace(/^\s+|\s+$/g, "");
        if (!path || !isMidiFilePath(path)) {
            return false;
        }
        file = new File(path);
        if (!file.exists) {
            return false;
        }
        fileField.text = file.fsName;
        return true;
    }

    function setupMidiFileDropTarget(fileField: EditText): void {
        try {
            fileField.dropTarget = true;
            fileField.onDragEnter = function () {
                return true;
            };
            fileField.onDrop = function (dragData) {
                var path;
                try {
                    if (!dragData || dragData.type !== "Files") {
                        return;
                    }
                    path = pathFromDropData(dragData.data);
                    assignMidiFilePath(fileField, path);
                } catch (dropErr) {}
            };
        } catch (setupErr) {}
    }

    function createPreviewState() {
        return {
            container: null as Group | null,
            panel: null as Group | null,
            toolbarGroup: null as Group | null,
            headerGroup: null as Group | null,
            footerGroup: null as Group | null,
            summary: null as _Control | null,
            canvas: null as Group | null,
            hideButton: null as _Control | null,
            expanded: false,
            layoutPrimed: false
        };
    }

    function buildImportTab(featureTabs: TabbedPanel) {
        var tab = featureTabs.add("tab", undefined, "Import");
        var header;
        var fileGroup;
        var fileText;
        var browse;
        var optionsPanel;
        var layerMode;
        var quantizeToFrames;
        var importNamedDrumSliders;
        var includeControllers;
        var includePitchBends;
        var layerNamePrefix;
        var importButtonRow;
        var getMidiInfoButton;
        var importButton;
        var timingLayerPanel;
        var metronomeButtonRow;
        var createMetronomeButton;
        var metronomeQuantize;
        var bpmButtonRow;
        var createBpmButton;
        var bpmQuantize;

        tab.orientation = "column";
        tab.alignChildren = ["fill", "top"];
        tab.margins = 10;
        tab.spacing = 8;
        tab.alignment = ["fill", "fill"];

        header = tab.add(
            "statictext",
            undefined,
            "Import MIDI notes, velocity, duration, CC, and pitch-bend data as keyframes on control null layers.",
            { multiline: true }
        );
        header.alignment = ["fill", "top"];

        fileGroup = tab.add("group");
        fileGroup.orientation = "row";
        fileGroup.alignChildren = ["fill", "center"];
        fileGroup.alignment = ["fill", "top"];
        fileGroup.spacing = 8;
        fileText = fileGroup.add("edittext", undefined, "");
        fileText.alignment = ["fill", "center"];
        fileText.helpTip =
            "Specify the path to a Standard MIDI file (.mid or .midi), or drag and drop a file here (Windows).";
        setupMidiFileDropTarget(fileText);
        browse = fileGroup.add("button", undefined, "Browse...");
        browse.preferredSize = [76, 22];
        browse.maximumSize = [84, 10000];
        browse.alignment = ["right", "center"];
        browse.helpTip = "Open a file dialog to select a Standard MIDI file.";

        optionsPanel = addOptionsPanel(tab, "Import Options");

        layerMode = addLabeledControl(optionsPanel, "Layer mode", "dropdownlist", [
            "One layer per channel",
            "Combined layer"
        ]);
        layerMode.selection = 0 as unknown as ListItem;
        layerMode.helpTip =
            "Choose whether to create a separate null layer for each MIDI channel, or merge all channels into a single combined null layer.";
        layerNamePrefix = addLabeledControl(optionsPanel, "Layer prefix", "edittext", "MIDI");
        layerNamePrefix.helpTip = "Specify the base name prefix for the generated null layers.";
        quantizeToFrames = optionsPanel.add("checkbox", undefined, "Quantize keyframes to comp frames");
        quantizeToFrames.value = false;
        quantizeToFrames.helpTip = "Align keyframe timestamps to the nearest frame boundary of the active composition.";
        importNamedDrumSliders = optionsPanel.add(
            "checkbox",
            undefined,
            "Create named drum sliders for MIDI channel 10"
        );
        importNamedDrumSliders.value = true;
        importNamedDrumSliders.helpTip =
            "On Channel 10, generate sliders named after General MIDI drum instruments (e.g., Bass Drum, Snare) instead of raw pitch numbers.";
        includeControllers = optionsPanel.add("checkbox", undefined, "Import controller changes as CC sliders");
        includeControllers.value = false;
        includeControllers.helpTip =
            "Import MIDI CC automation data as additional slider controls on the control null.";
        includePitchBends = optionsPanel.add("checkbox", undefined, "Import pitch bend sliders");
        includePitchBends.value = false;
        includePitchBends.helpTip = "Import MIDI pitch wheel bend data as keyframed pitch-bend sliders.";

        importButtonRow = tab.add("group");
        importButtonRow.orientation = "row";
        importButtonRow.alignChildren = ["fill", "center"];
        importButtonRow.alignment = ["fill", "top"];
        importButtonRow.spacing = 8;
        getMidiInfoButton = importButtonRow.add("button", undefined, "Get MIDI Info");
        getMidiInfoButton.helpTip =
            "Scan the selected MIDI file to display format details, timing metadata, and track statistics.";
        importButton = importButtonRow.add("button", undefined, "Import MIDI");
        importButton.helpTip =
            "Process the selected MIDI file and create control null layers with keyframed sliders in the active composition.";

        timingLayerPanel = addOptionsPanel(tab, "Timing Layers");
        timingLayerPanel.add(
            "statictext",
            undefined,
            "Generate timing reference layers based on MIDI tempo and signatures. Metronome creates numerator/denominator sliders. BPM creates beat/bar index sliders plus a tempo (BPM) slider.",
            { multiline: true }
        );

        metronomeButtonRow = timingLayerPanel.add("group");
        metronomeButtonRow.orientation = "row";
        metronomeButtonRow.alignChildren = ["fill", "center"];
        metronomeButtonRow.spacing = 8;
        createMetronomeButton = metronomeButtonRow.add("button", undefined, "Create Metronome Layer");
        createMetronomeButton.helpTip =
            "Create a null layer containing 'X' (numerator) and 'Y' (denominator) slider keyframes representing time signature changes.";
        metronomeQuantize = metronomeButtonRow.add("checkbox", undefined, "Quantize to comp frames");
        metronomeQuantize.value = false;
        metronomeQuantize.helpTip =
            "Align metronome keyframe timestamps to the nearest frame boundary of the active composition.";

        bpmButtonRow = timingLayerPanel.add("group");
        bpmButtonRow.orientation = "row";
        bpmButtonRow.alignChildren = ["fill", "center"];
        bpmButtonRow.spacing = 8;
        createBpmButton = bpmButtonRow.add("button", undefined, "Create BPM Layer");
        createBpmButton.helpTip =
            "Create a null layer containing 'Beat' (beat index in current bar) and 'Bar' (overall bar index) sliders keyed to MIDI beat timing.";
        bpmQuantize = bpmButtonRow.add("checkbox", undefined, "Quantize to comp frames");
        bpmQuantize.value = false;
        bpmQuantize.helpTip = "Align BPM keyframe timestamps to the nearest frame boundary of the active composition.";

        createMetronomeButton.preferredSize = [180, 24];
        createMetronomeButton.minimumSize = [180, 22];
        createBpmButton.preferredSize = [180, 24];
        createBpmButton.minimumSize = [180, 22];

        tab.add("group").alignment = ["fill", "fill"];

        return {
            tab: tab,
            fileText: fileText,
            browse: browse,
            layerMode: layerMode,
            quantizeToFrames: quantizeToFrames,
            importNamedDrumSliders: importNamedDrumSliders,
            includeControllers: includeControllers,
            includePitchBends: includePitchBends,
            layerNamePrefix: layerNamePrefix,
            getMidiInfoButton: getMidiInfoButton,
            importButton: importButton,
            createMetronomeButton: createMetronomeButton,
            metronomeQuantize: metronomeQuantize,
            createBpmButton: createBpmButton,
            bpmQuantize: bpmQuantize
        };
    }

    function wireImportTabHandlers(ui: StringKeyedMap<unknown>, api: ReOmMIDIApi): void {
        var importUi = ui as StringKeyedMap<EditText | Button | DropDownList | Checkbox>;
        importUi.browse.onClick = function () {
            var f = File.openDialog("Choose a MIDI file", "*.mid;*.midi");
            if (f && (f as File).fsName) {
                assignMidiFilePath(importUi.fileText as EditText, (f as File).fsName);
            }
        };

        importUi.getMidiInfoButton.onClick = function () {
            api.runGetMidiInfo({
                midiFileName: (importUi.fileText as EditText).text
            });
        };

        importUi.importButton.onClick = function () {
            api.runImport({
                midiFileName: (importUi.fileText as EditText).text,
                layerMode:
                    (importUi.layerMode as DropDownList).selection &&
                    typeof (importUi.layerMode as DropDownList).selection !== "number" &&
                    ((importUi.layerMode as DropDownList).selection as ListItem).index === 1
                        ? "combined"
                        : "per-channel",
                layerNamePrefix: (importUi.layerNamePrefix as EditText).text || "MIDI",
                quantizeToFrames: !!(importUi.quantizeToFrames as Checkbox).value,
                importNamedDrumSliders: !!(importUi.importNamedDrumSliders as Checkbox).value,
                includeControllers: !!(importUi.includeControllers as Checkbox).value,
                includePitchBends: !!(importUi.includePitchBends as Checkbox).value
            } as UiImportRunOptions);
        };

        importUi.createMetronomeButton.onClick = function () {
            api.runCreateMetronomeLayer({
                midiFileName: (importUi.fileText as EditText).text,
                quantizeToFrames: !!(importUi.metronomeQuantize as Checkbox).value
            });
        };

        importUi.createBpmButton.onClick = function () {
            api.runCreateBpmLayer({
                midiFileName: (importUi.fileText as EditText).text,
                quantizeToFrames: !!(importUi.bpmQuantize as Checkbox).value
            });
        };
    }

    function buildPianoRollTab(win: Window | Panel, featureTabs: TabbedPanel, previewState: ReOmPreviewState) {
        var tab = featureTabs.add("tab", undefined, "Piano Roll Map");
        var mapPanel;
        var mapMaxNotes;
        var mapNoteHeight;
        var mapUseDrumLanes;
        var mapUseWorkArea;
        var mapButtonGroup;
        var previewPianoRollButton;
        var createPianoRollButton;
        var previewHost;

        tab.orientation = "column";
        tab.alignChildren = ["fill", "top"];
        tab.margins = 10;
        tab.spacing = 8;
        tab.alignment = ["fill", "fill"];

        tab.add(
            "statictext",
            undefined,
            "Select an imported MIDI null layer in the timeline, preview the note layout, and generate piano-roll shape layers.",
            { multiline: true }
        ).alignment = ["fill", "top"];

        mapPanel = tab.add("panel", undefined, "Piano Roll Options");
        mapPanel.orientation = "column";
        mapPanel.alignChildren = ["fill", "top"];
        mapPanel.margins = 12;
        mapPanel.spacing = 8;
        mapPanel.alignment = ["fill", "top"];
        mapMaxNotes = addLabeledControl(mapPanel, "Max notes", "edittext", "10");
        mapMaxNotes.helpTip = "Set the maximum number of notes to generate shape layers for. Use -1 for no limit.";
        mapNoteHeight = addLabeledControl(mapPanel, "Note height", "edittext", "6");
        mapNoteHeight.helpTip = "Set the height of each piano roll note shape block in pixels.";
        mapUseDrumLanes = mapPanel.add("checkbox", undefined, "Include MIDI channel 10 drum pitches");
        mapUseDrumLanes.value = true;
        mapUseDrumLanes.helpTip = "Include MIDI Channel 10 drum events when generating the piano roll shapes.";
        mapUseWorkArea = mapPanel.add("checkbox", undefined, "Limit to current work area");
        mapUseWorkArea.value = false;
        mapUseWorkArea.helpTip =
            "Only generate note shapes for MIDI events that fall within the current composition work area.";
        mapButtonGroup = mapPanel.add("group");
        mapButtonGroup.orientation = "row";
        mapButtonGroup.alignChildren = ["fill", "center"];
        mapButtonGroup.spacing = 8;
        previewPianoRollButton = mapButtonGroup.add("button", undefined, "Preview Map");
        previewPianoRollButton.helpTip =
            "Render a piano-roll preview of the selected MIDI null layer in the canvas below.";
        createPianoRollButton = mapButtonGroup.add("button", undefined, "Create Piano Roll Map");
        createPianoRollButton.helpTip =
            "Generate After Effects shape layers corresponding to the note events on the selected MIDI null layer.";

        function relayoutMapPreviewHost() {
            runWithPreviewLayoutGuard(function () {
                relayoutPreviewTabHost(win, previewState, false);
            });
        }

        function setMapPreviewExpanded(expanded: boolean): void {
            var canvas = previewState.canvas;
            var wasExpanded = previewState.expanded;
            if (!previewState.container) {
                return;
            }
            runWithPreviewLayoutGuard(function () {
                previewState.expanded = expanded;
                if (!expanded) {
                    previewState.layoutPrimed = false;
                    globalState().previewCanvas = null;
                    globalState().previewCanvasRoot = null;
                }
                applyPreviewHostExpandedLayout(previewState, expanded);
                relayoutPreviewTabHost(win, previewState, expanded && !wasExpanded);
                if (expanded && canvas) {
                    invokeCanvasOnDraw(canvas);
                }
            });
        }

        function hideMapPreviewPanel() {
            setMapPreviewExpanded(false);
        }

        function createMapPreviewPanel() {
            var toolbarGroup;
            var footerGroup;
            if (previewState.container) {
                return;
            }
            previewState.container = tab.add("group");
            previewState.container.orientation = "column";
            previewState.container.alignChildren = ["fill", "fill"];
            previewState.container.alignment = ["fill", "fill"];
            previewState.container.margins = 8;
            previewState.container.spacing = 6;
            previewState.containerMargins = previewState.container.margins;
            previewState.containerSpacing = previewState.container.spacing;
            previewState.panel = previewState.container;
            toolbarGroup = previewState.container.add("group");
            toolbarGroup.orientation = "row";
            toolbarGroup.alignChildren = ["right", "center"];
            toolbarGroup.alignment = ["fill", "top"];
            previewState.toolbarGroup = toolbarGroup;
            previewState.headerGroup = toolbarGroup;
            previewState.hideButton = toolbarGroup.add("button", undefined, "Hide") as unknown as _Control;
            previewState.hideButton.preferredSize = [52, 22];
            previewState.hideButton.onClick = hideMapPreviewPanel;
            previewState.canvas = previewState.container.add("group");
            previewState.canvas.alignment = ["fill", "fill"];
            bindPianoRollPreviewCanvas(previewState.canvas, {
                loading: false,
                rects: [] as PianoRollRect[],
                bounds: { left: 0, right: 1, top: 128, bottom: 21 },
                noteCount: 0,
                sourceLabel: "",
                description: ""
            });
            footerGroup = previewState.container.add("group");
            footerGroup.orientation = "column";
            footerGroup.alignChildren = ["fill", "top"];
            footerGroup.alignment = ["fill", "bottom"];
            previewState.footerGroup = footerGroup;
            previewState.summary = addWrappedHintText(
                footerGroup,
                "Preview map appears here after you click Preview Map."
            );
            globalState().previewCanvas = null;
            globalState().previewCanvasRoot = win;
            setMapPreviewExpanded(false);
        }

        function ensureMapPreviewPanel() {
            createMapPreviewPanel();
            if (!previewState.expanded) {
                setMapPreviewExpanded(true);
            }
            return previewState;
        }

        previewHost = {
            ensure: ensureMapPreviewPanel,
            hide: hideMapPreviewPanel,
            relayout: relayoutMapPreviewHost,
            previewState: previewState,
            flushName: "flushPianoRollPreviewCanvas",
            win: win
        };

        createMapPreviewPanel();

        tab.add("group").alignment = ["fill", "fill"];

        return {
            tab: tab,
            mapMaxNotes: mapMaxNotes,
            mapNoteHeight: mapNoteHeight,
            mapUseDrumLanes: mapUseDrumLanes,
            mapUseWorkArea: mapUseWorkArea,
            previewPianoRollButton: previewPianoRollButton,
            createPianoRollButton: createPianoRollButton,
            previewState: previewState,
            previewHost: previewHost
        };
    }

    function wirePianoRollTabHandlers(ui: StringKeyedMap<unknown>, api: ReOmMIDIApi): void {
        var controls = ui as StringKeyedMap<UiControl>;
        function pianoRollMapOptions(): PianoRollMapOptions {
            return {
                maxNotes: controls.mapMaxNotes.text,
                noteHeight: controls.mapNoteHeight.text,
                useDrumLanes: !!controls.mapUseDrumLanes.value,
                useWorkArea: !!controls.mapUseWorkArea.value
            };
        }

        controls.createPianoRollButton.onClick = function () {
            api.runCreatePianoRollMap(pianoRollMapOptions());
        };

        controls.previewPianoRollButton.onClick = function () {
            if (api.__mapPreviewHost && api.__mapPreviewHost.selectTab) {
                api.__mapPreviewHost.selectTab();
            }
            api.runPreviewPianoRollMap(pianoRollMapOptions());
        };
    }

    function buildActionsTab(win: Window | Panel, featureTabs: TabbedPanel, previewState: ReOmPreviewState) {
        var tab = featureTabs.add("tab", undefined, "MIDI Actions");
        var actionLayerHint;
        var actionSourcePanel;
        var actionMaxNotes;
        var actionPitchFilter;
        var actionUseWorkArea;
        var actionSettingsPanel: Panel;
        var actionPreset: _Control;
        var baseValue: _Control;
        var activeValue: _Control;
        var amountValue: _Control;
        var durationValue: _Control;
        var falloff: _Control;
        var actionSettingsPairGroup: Group;
        var actionSettingsAmountGroup: Group;
        var actionSettingsFalloffGroup: Group;
        var actionPresetHint: _Control;
        var actionButtonGroup;
        var previewActionButton;
        var actionOutputGroup;
        var copyActionButton;
        var createActionNullButton;
        var bakeActionNullButton;
        var previewHost;
        var lastActionPresetIndex = -1;

        tab.orientation = "column";
        tab.alignChildren = ["fill", "top"];
        tab.margins = 10;
        tab.spacing = 8;
        tab.alignment = ["fill", "fill"];

        actionLayerHint = tab.add(
            "statictext",
            undefined,
            "Select an imported MIDI null layer in the timeline, preview the trigger response curve, and either copy the expression or generate an output control null.",
            { multiline: true }
        );
        actionLayerHint.alignment = ["fill", "top"];

        actionSourcePanel = addOptionsPanel(tab, "Preview and Bake");
        actionSourcePanel.minimumSize = [0, 88];
        actionMaxNotes = addLabeledControl(actionSourcePanel, "Max notes", "edittext", "10");
        actionMaxNotes.helpTip = "Set the maximum trigger limit for preview and bake operations. Use -1 for no limit.";
        actionPitchFilter = addLabeledControl(actionSourcePanel, "Trigger notes", "edittext", "");
        actionPitchFilter.helpTip =
            "Optional MIDI pitch numbers to trigger on (comma-separated, e.g. 60, 64, 67). Leave empty for all notes. The generated expression also lists this filter near the top for easy editing.";
        actionUseWorkArea = actionSourcePanel.add("checkbox", undefined, "Limit to work area");
        actionUseWorkArea.value = false;
        actionUseWorkArea.helpTip = "Only include trigger events that occur within the composition work area.";

        actionSettingsPanel = addOptionsPanel(tab, "Action Settings");

        actionPreset = addLabeledControl(actionSettingsPanel, "Preset", "dropdownlist", [
            "Pump / Decay",
            "Toggle / Flip",
            "Interpolate A-B",
            "Integrate / Accumulate"
        ]);
        actionPreset.selection = 0 as unknown as ListItem;
        actionPreset.helpTip = "Select the trigger response logic (e.g., decaying pulse, state flip, accumulator).";
        baseValue = addLabeledControl(actionSettingsPanel, "Base value", "edittext", "0");
        baseValue.helpTip =
            "Specify the starting or resting value of the property (type 'value' to preserve the property's existing value).";

        actionSettingsPairGroup = actionSettingsPanel.add("group");
        actionSettingsPairGroup.orientation = "column";
        actionSettingsPairGroup.alignChildren = ["fill", "top"];
        actionSettingsPairGroup.alignment = ["fill", "top"];
        actionSettingsPairGroup.spacing = 8;
        actionSettingsPairGroup.margins = 0;
        activeValue = addLabeledControl(actionSettingsPairGroup, "Active value", "edittext", "100");
        activeValue.helpTip = "Specify the target active value for state flip or interpolation presets.";

        actionSettingsAmountGroup = actionSettingsPanel.add("group");
        actionSettingsAmountGroup.orientation = "column";
        actionSettingsAmountGroup.alignChildren = ["fill", "top"];
        actionSettingsAmountGroup.alignment = ["fill", "top"];
        actionSettingsAmountGroup.spacing = 8;
        actionSettingsAmountGroup.margins = 0;
        amountValue = addLabeledControl(actionSettingsAmountGroup, "Amount", "edittext", "20");
        amountValue.helpTip = "Specify the magnitude added to the property on each note trigger event.";
        durationValue = addLabeledControl(actionSettingsAmountGroup, "Duration", "edittext", "0.2");
        durationValue.helpTip =
            "Specify the time span in seconds over which the value returns to base or completes its transition.";

        actionSettingsFalloffGroup = actionSettingsPanel.add("group");
        actionSettingsFalloffGroup.orientation = "column";
        actionSettingsFalloffGroup.alignChildren = ["fill", "top"];
        actionSettingsFalloffGroup.alignment = ["fill", "top"];
        actionSettingsFalloffGroup.spacing = 8;
        actionSettingsFalloffGroup.margins = 0;
        falloff = addLabeledControl(actionSettingsFalloffGroup, "Falloff", "dropdownlist", [
            "instant",
            "linear",
            "ease",
            "exponential"
        ]);
        falloff.selection = 1 as unknown as ListItem;
        falloff.helpTip = "Select the interpolation curve used to transit between values.";

        actionPresetHint = addWrappedHintText(actionSettingsPanel, "");

        function selectedActionPresetIndex() {
            var selection;
            var index;
            var text;
            if (!actionPreset) {
                return lastActionPresetIndex >= 0 ? lastActionPresetIndex : 0;
            }
            selection = actionPreset.selection;
            if (!selection) {
                return lastActionPresetIndex >= 0 ? lastActionPresetIndex : 0;
            }
            text = String(selection.text || "");
            if (text.indexOf("Toggle") >= 0) {
                return 1;
            }
            if (text.indexOf("Interpolate") >= 0) {
                return 2;
            }
            if (text.indexOf("Accumulate") >= 0 || text.indexOf("Integrate") >= 0) {
                return 3;
            }
            if (text.indexOf("Pump") >= 0 || text.indexOf("Decay") >= 0) {
                return 0;
            }
            index = selection.index;
            if (typeof index === "number" && index >= 0 && index < 4) {
                return index;
            }
            if (lastActionPresetIndex >= 0 && lastActionPresetIndex < 4) {
                return lastActionPresetIndex;
            }
            return 0;
        }

        function selectedActionPresetId() {
            var presetIds = ["pump", "toggle", "interpolate", "accumulator"];
            return presetIds[selectedActionPresetIndex()];
        }

        function presetShowsActive(preset: string): boolean {
            return preset === "toggle" || preset === "interpolate";
        }

        function presetShowsAmountDuration(preset: string): boolean {
            return preset === "pump" || preset === "accumulator";
        }

        function presetShowsFalloff(preset: string): boolean {
            return preset === "pump" || preset === "interpolate" || preset === "accumulator";
        }

        function actionSettingsSectionHeight(preset: string): number {
            var rows = 3;
            if (presetShowsActive(preset)) {
                rows += 1;
            }
            if (presetShowsAmountDuration(preset)) {
                rows += 2;
            }
            if (presetShowsFalloff(preset)) {
                rows += 1;
            }
            return ACTION_SETTINGS_PANEL_BASE_HEIGHT + rows * ACTION_SETTINGS_PANEL_ROW_HEIGHT;
        }

        function relayoutActionSettingsPanel(preset?: string, recalculate?: boolean): void {
            var panelHeight = Math.max(80, actionSettingsSectionHeight(preset || selectedActionPresetId()));
            actionSettingsPanel.minimumSize = [0, panelHeight];
            actionSettingsPanel.preferredSize = [-1, panelHeight];
            if (actionSettingsPanel.layout && actionSettingsPanel.layout.layout) {
                actionSettingsPanel.layout.layout(recalculate !== false);
            }
            if (actionSettingsPanel.layout && actionSettingsPanel.layout.resize) {
                actionSettingsPanel.layout.resize();
            }
            if (tab.layout && tab.layout.layout) {
                tab.layout.layout(false);
            }
            if (tab.layout && tab.layout.resize) {
                tab.layout.resize();
            }
            repaintPreviewSubtree(tab as unknown as _Control);
        }

        function setActionSettingsBlockVisible(group: Group, control: _Control, visible: boolean): void {
            setScriptUiGroupVisible(group as unknown as _Control, visible);
            setLabeledControlVisible(control, visible);
        }

        function applyActionPresetDefaults(preset: string): void {
            var isInterpolate = preset === "interpolate";
            var pair;
            var basePair;
            var baseText = String(baseValue.text || "").replace(/^\s+|\s+$/g, "");

            if (preset === "toggle") {
                pair = String(activeValue.text || "")
                    .replace(/^\s+|\s+$/g, "")
                    .match(/^\[\s*([^,\]]+)\s*,\s*([^\]]+)\s*\]$/);
                if (pair) {
                    activeValue.text = pair[2].replace(/^\s+|\s+$/g, "");
                } else {
                    activeValue.text = "-1";
                }
                if (!baseText) {
                    baseValue.text = "1";
                }
                return;
            }
            if (isInterpolate) {
                basePair = baseText.match(/^\[\s*([^,\]]+)\s*,\s*([^\]]+)\s*\]$/);
                if (basePair) {
                    baseValue.text = basePair[1].replace(/^\s+|\s+$/g, "");
                    activeValue.text = basePair[2].replace(/^\s+|\s+$/g, "");
                    return;
                }
                pair = String(activeValue.text || "")
                    .replace(/^\s+|\s+$/g, "")
                    .match(/^\[\s*([^,\]]+)\s*,\s*([^\]]+)\s*\]$/);
                if (pair) {
                    if (!baseText || baseValue.text === "value") {
                        baseValue.text = pair[1].replace(/^\s+|\s+$/g, "");
                    }
                    activeValue.text = pair[2].replace(/^\s+|\s+$/g, "");
                } else if (!baseText) {
                    baseValue.text = "25";
                    activeValue.text = "100";
                } else {
                    activeValue.text = "100";
                }
                return;
            }
        }

        function refreshActionPresetFieldVisibility() {
            var preset = selectedActionPresetId();
            var isInterpolate = preset === "interpolate";
            var showActive = presetShowsActive(preset);
            var showAmountDuration = presetShowsAmountDuration(preset);
            var showFalloff = presetShowsFalloff(preset);

            setLabeledControlLabel(baseValue, isInterpolate ? "A value" : "Base value");
            setLabeledControlLabel(activeValue, isInterpolate ? "B value" : "Active value");
            setLabeledControlLabel(amountValue, "Amount");
            setLabeledControlLabel(durationValue, "Duration");
            setLabeledControlLabel(falloff, "Falloff");

            setActionSettingsBlockVisible(actionSettingsPairGroup, activeValue, showActive);
            setActionSettingsBlockVisible(actionSettingsAmountGroup, amountValue, showAmountDuration);
            setLabeledControlVisible(durationValue, showAmountDuration);
            setActionSettingsBlockVisible(actionSettingsFalloffGroup, falloff, showFalloff);
            relayoutActionSettingsPanel(preset, true);
        }

        function syncActionPresetUi() {
            var presetHints = {
                pump: "Pump / Decay jumps by Amount on each trigger, then falls back over Duration using the Falloff curve.",
                toggle: "Toggle / Flip alternates between Base and Active on each trigger (hold keyframes when baked).",
                interpolate:
                    "Interpolate A-B alternates between A and B on each trigger and blends between consecutive events using Falloff.",
                accumulator:
                    "Integrate / Accumulate adds Amount on each trigger and eases toward the running total over Duration."
            };
            var index = selectedActionPresetIndex();
            var preset = selectedActionPresetId();
            var presetChanged = index !== lastActionPresetIndex;

            lastActionPresetIndex = index;

            if (actionPresetHint) {
                actionPresetHint.text = presetHints[preset as MidiActionPreset] || "";
            }

            refreshActionPresetFieldVisibility();

            if (presetChanged) {
                applyActionPresetDefaults(preset);
            }
        }

        function relayoutActionPreviewHost() {
            runWithPreviewLayoutGuard(function () {
                relayoutPreviewTabHost(win, previewState, false);
            });
        }

        function setActionPreviewExpanded(expanded: boolean): void {
            var canvas = previewState.canvas;
            var wasExpanded = previewState.expanded;
            if (!previewState.container) {
                return;
            }
            runWithPreviewLayoutGuard(function () {
                previewState.expanded = expanded;
                if (!expanded) {
                    previewState.layoutPrimed = false;
                    globalState().actionPreviewCanvas = null;
                }
                applyPreviewHostExpandedLayout(previewState, expanded);
                relayoutPreviewTabHost(win, previewState, expanded && !wasExpanded);
                if (expanded) {
                    clearStaleScriptUiWidthLocks(
                        win as unknown as _Control,
                        win.size && win.size[0] > 0 ? win.size[0] : PANEL_WIDTH_DEFAULT
                    );
                }
                if (expanded && canvas) {
                    invokeCanvasOnDraw(canvas);
                }
            });
        }

        function hideActionPreviewPanel() {
            setActionPreviewExpanded(false);
        }

        function createActionPreviewPanel() {
            var toolbarGroup;
            var footerGroup;
            if (previewState.container) {
                return;
            }
            previewState.container = tab.add("group");
            previewState.container.orientation = "column";
            previewState.container.alignChildren = ["fill", "fill"];
            previewState.container.alignment = ["fill", "fill"];
            previewState.container.margins = 8;
            previewState.container.spacing = 6;
            previewState.containerMargins = previewState.container.margins;
            previewState.containerSpacing = previewState.container.spacing;
            previewState.panel = previewState.container;
            toolbarGroup = previewState.container.add("group");
            toolbarGroup.orientation = "row";
            toolbarGroup.alignChildren = ["right", "center"];
            toolbarGroup.alignment = ["fill", "top"];
            previewState.toolbarGroup = toolbarGroup;
            previewState.headerGroup = toolbarGroup;
            previewState.hideButton = toolbarGroup.add("button", undefined, "Hide") as unknown as _Control;
            previewState.hideButton.preferredSize = [52, 22];
            previewState.hideButton.onClick = hideActionPreviewPanel;
            previewState.canvas = previewState.container.add("group");
            previewState.canvas.alignment = ["fill", "fill"];
            bindMidiActionPreviewCanvas(previewState.canvas, {
                loading: false,
                points: [] as MidiActionSimulationPoint[],
                triggers: [] as MidiActionTrigger[],
                bounds: { left: 0, right: 1, top: 100, bottom: 0 },
                triggerCount: 0,
                preset: "pump" as MidiActionPreset,
                sourceLabel: "",
                description: ""
            });
            footerGroup = previewState.container.add("group");
            footerGroup.orientation = "column";
            footerGroup.alignChildren = ["fill", "top"];
            footerGroup.alignment = ["fill", "bottom"];
            previewState.footerGroup = footerGroup;
            previewState.summary = addWrappedHintText(
                footerGroup,
                "Preview curve appears here after you click Preview."
            );
            globalState().actionPreviewCanvas = null;
            globalState().actionPreviewCanvasRoot = win;
            setActionPreviewExpanded(false);
        }

        function ensureActionPreviewPanel() {
            createActionPreviewPanel();
            if (!previewState.expanded) {
                setActionPreviewExpanded(true);
            }
            return previewState;
        }

        previewHost = {
            ensure: ensureActionPreviewPanel,
            hide: hideActionPreviewPanel,
            relayout: relayoutActionPreviewHost,
            previewState: previewState,
            flushName: "flushActionPreviewCanvas",
            win: win
        };

        actionButtonGroup = tab.add("group");
        actionButtonGroup.orientation = "row";
        actionButtonGroup.alignChildren = ["fill", "center"];
        actionButtonGroup.spacing = 8;
        previewActionButton = actionButtonGroup.add("button", undefined, "Preview");
        previewActionButton.helpTip = "Simulate and plot the selected MIDI Action curve in the preview panel below.";

        actionOutputGroup = tab.add("group");
        actionOutputGroup.orientation = "row";
        actionOutputGroup.alignChildren = ["fill", "center"];
        actionOutputGroup.spacing = 8;
        copyActionButton = actionOutputGroup.add("button", undefined, "Copy Expression");
        copyActionButton.helpTip = "Generate the After Effects expression text and open a dialog to copy it.";
        createActionNullButton = actionOutputGroup.add("button", undefined, "Null + Expression");
        createActionNullButton.helpTip =
            "Create a new null layer with control sliders and a live expression linked to the MIDI null.";
        bakeActionNullButton = actionOutputGroup.add("button", undefined, "Null + Bake");
        bakeActionNullButton.helpTip =
            "Create a new null layer and bake the action curve into keyframes on a control slider.";

        createActionPreviewPanel();

        tab.add("group").alignment = ["fill", "fill"];

        (actionPreset as UiControl).onChange = function () {
            app.scheduleTask(
                "try { if (ReOmMIDI.__syncActionPresetUi) { ReOmMIDI.__syncActionPresetUi(); } } catch (e) {}",
                1,
                false
            );
        };
        syncActionPresetUi();

        return {
            tab: tab,
            actionMaxNotes: actionMaxNotes,
            actionPitchFilter: actionPitchFilter,
            actionUseWorkArea: actionUseWorkArea,
            actionPreset: actionPreset,
            baseValue: baseValue,
            activeValue: activeValue,
            amountValue: amountValue,
            durationValue: durationValue,
            falloff: falloff,
            previewActionButton: previewActionButton,
            copyActionButton: copyActionButton,
            createActionNullButton: createActionNullButton,
            bakeActionNullButton: bakeActionNullButton,
            previewState: previewState,
            previewHost: previewHost,
            syncActionPresetUi: syncActionPresetUi,
            refreshActionPresetFieldVisibility: refreshActionPresetFieldVisibility,
            relayoutActionSettingsPanel: relayoutActionSettingsPanel,
            selectedActionPresetId: selectedActionPresetId
        };
    }

    function wireActionsTabHandlers(ui: StringKeyedMap<unknown>, api: ReOmMIDIApi): void {
        var controls = ui as StringKeyedMap<UiControl> & {
            selectedActionPresetId: () => string;
            syncActionPresetUi?: () => void;
        };
        function midiActionExpressionOptions(): MidiActionOptionsInput {
            return {
                triggerMode: "pitch",
                preset: controls.selectedActionPresetId() as MidiActionPreset,
                pitchFilter: controls.actionPitchFilter.text,
                baseValue: controls.baseValue.text,
                activeValue: controls.activeValue.text,
                amount: controls.amountValue.text,
                duration: controls.durationValue.text,
                falloff: (controls.falloff.selection && typeof controls.falloff.selection !== "number"
                    ? controls.falloff.selection.text
                    : "linear") as FalloffMode
            };
        }

        function midiActionPreviewBakeOptions(): MidiActionOptionsInput {
            var options = midiActionExpressionOptions();
            options.maxNotes = controls.actionMaxNotes.text;
            options.useWorkArea = !!controls.actionUseWorkArea.value;
            options.limitTriggers = true;
            return options;
        }

        controls.previewActionButton.onClick = function () {
            if (api.__actionPreviewHost && api.__actionPreviewHost.selectTab) {
                api.__actionPreviewHost.selectTab();
            }
            api.runPreviewMidiAction(midiActionPreviewBakeOptions());
        };

        controls.copyActionButton.onClick = function () {
            api.runCopyMidiActionExpression(midiActionExpressionOptions());
        };

        controls.createActionNullButton.onClick = function () {
            api.runCreateMidiActionNullWithExpression(midiActionExpressionOptions());
        };

        controls.bakeActionNullButton.onClick = function () {
            api.runCreateMidiActionNullWithBake(midiActionPreviewBakeOptions());
        };
    }

    function buildDrumMachineTab(featureTabs: TabbedPanel) {
        var tab = featureTabs.add("tab", undefined, "Drum Machine");
        var drumHint;
        var drumSettingsPanel;
        var drumMaxNotes;
        var drumPitchFilter;
        var drumUseWorkArea;
        var drumSquareSize;
        var drumDuration;
        var drumAnimateScale;
        var drumAnimateOpacity;
        var drumAnimateRotation;
        var drumFalloff;
        var drumOutputGroup;
        var createDrumExpressionButton;
        var bakeDrumButton;

        tab.orientation = "column";
        tab.alignChildren = ["fill", "top"];
        tab.margins = 10;
        tab.spacing = 8;
        tab.alignment = ["fill", "fill"];

        drumHint = tab.add(
            "statictext",
            undefined,
            "Select one imported MIDI null layer, or multiple non-drum MIDI layers, configure the visual response, and create colored squares arranged in a grid. Pads are parented to a controller null (stroke and master opacity sliders, like Piano Roll). Drum layers with named import sliders get one pad per drum effect (e.g. T01 Ch10 d36 Bass Drum) so overlapping hits are preserved. A single melodic or pitch-only drum layer gets one pad per MIDI pitch. Multiple non-drum layers get one pad per layer — any note event on that layer triggers its pad, regardless of pitch.",
            { multiline: true }
        );
        drumHint.alignment = ["fill", "top"];

        drumSettingsPanel = addOptionsPanel(tab, "Drum Machine Settings");
        drumMaxNotes = addLabeledControl(drumSettingsPanel, "Max notes", "edittext", "-1");
        drumMaxNotes.helpTip =
            "Maximum hits to include in animation. Use -1 for all hits. Pads are created only for pitches that have hits on the layer (named drum sliders when present, otherwise pitch keyframes).";
        drumPitchFilter = addLabeledControl(drumSettingsPanel, "Drum pitches", "edittext", "");
        drumPitchFilter.helpTip =
            "Optional MIDI drum pitch numbers to include (comma-separated, e.g. 36, 38, 42). Leave empty for all drums.";
        drumUseWorkArea = drumSettingsPanel.add("checkbox", undefined, "Limit to work area");
        drumUseWorkArea.value = false;
        drumUseWorkArea.helpTip = "Only include drum hits that occur within the composition work area.";
        drumSquareSize = addLabeledControl(drumSettingsPanel, "Square size", "edittext", "20");
        drumSquareSize.helpTip = "Size in pixels of each drum hit square shape.";
        drumDuration = addLabeledControl(drumSettingsPanel, "Duration", "edittext", "0.2");
        drumDuration.helpTip = "Seconds for scale, opacity, and rotation to fall back after each drum hit.";

        drumAnimateScale = drumSettingsPanel.add("checkbox", undefined, "Animate Scale");
        drumAnimateScale.value = true;
        drumAnimateScale.helpTip = "Pulse square scale on each drum hit using the falloff curve.";
        drumAnimateOpacity = drumSettingsPanel.add("checkbox", undefined, "Animate Opacity");
        drumAnimateOpacity.value = true;
        drumAnimateOpacity.helpTip = "Pulse square opacity on each drum hit using the falloff curve.";
        drumAnimateRotation = drumSettingsPanel.add("checkbox", undefined, "Animate Rotation");
        drumAnimateRotation.value = false;
        drumAnimateRotation.helpTip = "Pulse square rotation on each drum hit using the falloff curve.";

        drumFalloff = addLabeledControl(drumSettingsPanel, "Falloff", "dropdownlist", [
            "instant",
            "linear",
            "ease",
            "exponential"
        ]);
        drumFalloff.selection = 1 as unknown as ListItem;
        drumFalloff.helpTip = "Interpolation curve for the drum hit response decay.";

        drumOutputGroup = tab.add("group");
        drumOutputGroup.orientation = "row";
        drumOutputGroup.alignChildren = ["fill", "center"];
        drumOutputGroup.spacing = 8;
        createDrumExpressionButton = drumOutputGroup.add("button", undefined, "Create with Expression");
        createDrumExpressionButton.helpTip =
            "Create one grid pad per pitch with live expressions driven by each pad's named drum slider (drum import) or the shared pitch slider (melodic or legacy drum import).";
        bakeDrumButton = drumOutputGroup.add("button", undefined, "Bake");
        bakeDrumButton.helpTip = "Create one grid pad per drum type and bake the drum response into keyframes.";

        tab.add("group").alignment = ["fill", "fill"];

        return {
            tab: tab,
            drumMaxNotes: drumMaxNotes,
            drumPitchFilter: drumPitchFilter,
            drumUseWorkArea: drumUseWorkArea,
            drumSquareSize: drumSquareSize,
            drumDuration: drumDuration,
            drumAnimateScale: drumAnimateScale,
            drumAnimateOpacity: drumAnimateOpacity,
            drumAnimateRotation: drumAnimateRotation,
            drumFalloff: drumFalloff,
            createDrumExpressionButton: createDrumExpressionButton,
            bakeDrumButton: bakeDrumButton
        };
    }

    function wireDrumMachineTabHandlers(ui: StringKeyedMap<unknown>, api: ReOmMIDIApi): void {
        var controls = ui as StringKeyedMap<UiControl>;
        function drumMachineOptions(): DrumMachineOptionsInput {
            return {
                maxNotes: controls.drumMaxNotes.text,
                pitchFilter: controls.drumPitchFilter.text,
                useWorkArea: !!controls.drumUseWorkArea.value,
                squareSize: controls.drumSquareSize.text,
                duration: controls.drumDuration.text,
                animateScale: !!controls.drumAnimateScale.value,
                animateOpacity: !!controls.drumAnimateOpacity.value,
                animateRotation: !!controls.drumAnimateRotation.value,
                falloff: (controls.drumFalloff.selection && typeof controls.drumFalloff.selection !== "number"
                    ? controls.drumFalloff.selection.text
                    : "linear") as FalloffMode
            };
        }

        controls.createDrumExpressionButton.onClick = function () {
            api.runCreateDrumMachineExpression(drumMachineOptions());
        };

        controls.bakeDrumButton.onClick = function () {
            api.runCreateDrumMachineBake(drumMachineOptions());
        };
    }

    function buildDrumSequencerTab(featureTabs: TabbedPanel) {
        var tab = featureTabs.add("tab", undefined, "Drum Sequencer");
        var drumSeqSummary: _Control;
        var drumSeqSettingsPanel;
        var drumSeqTotalFrames;
        var drumSeqButtonRow;
        var generateDrumSeqButton;
        var applyDrumSeqButton;
        var copyDrumSeqButton;
        var drumSeqExpressionText: _Control;
        var currentDrumSeqState: DrumSequencerState;
        var drumSequencerHost;

        tab.orientation = "column";
        tab.alignChildren = ["fill", "top"];
        tab.margins = 10;
        tab.spacing = 8;
        tab.alignment = ["fill", "fill"];

        addWrappedHintText(
            tab,
            "Select an imported drum MIDI null layer with named drum sliders, then select a footage or precomp layer with frame-based drum samples. " +
                "Generate a drum-to-frame expression (default pitch order in drumFrameList), reorder entries by editing drumFrameList in the expression box to set overlap priority, edit startFrame/endFrame as needed, then Apply to enable Time Remap. " +
                "Legacy layers without named drum sliders still use the pitch slider map. " +
                "Zone reference: Kick frames ~11\u201330, Snare ~33\u201352, Hats ~86\u2013128."
        );

        drumSeqSummary = tab.add("statictext", undefined, "No map generated yet.", {
            multiline: true
        }) as unknown as _Control;
        drumSeqSummary.alignment = ["fill", "top"];

        drumSeqSettingsPanel = addOptionsPanel(tab, "Drum Sequencer Settings");
        drumSeqTotalFrames = addLabeledControl(drumSeqSettingsPanel, "Total frames", "edittext", "0");
        drumSeqTotalFrames.helpTip =
            "Divide footage frames evenly across all drum pads on Generate. Use 0 for automatic incrementing zones (default kick/snare/hat spacing).";

        drumSeqButtonRow = tab.add("group");
        drumSeqButtonRow.orientation = "row";
        drumSeqButtonRow.alignChildren = ["fill", "center"];
        drumSeqButtonRow.spacing = 8;
        generateDrumSeqButton = drumSeqButtonRow.add("button", undefined, "Generate from Layer");
        generateDrumSeqButton.helpTip =
            "Analyze the selected drum MIDI null layer and build a Time Remap expression template.";
        applyDrumSeqButton = drumSeqButtonRow.add("button", undefined, "Apply to Selected Layer");
        applyDrumSeqButton.helpTip =
            "Enable Time Remap on the selected footage/precomp layer and apply the expression from the editor below.";
        copyDrumSeqButton = drumSeqButtonRow.add("button", undefined, "Copy Expression");
        copyDrumSeqButton.helpTip = "Open a dialog to copy the Drum Sequencer expression.";

        drumSeqExpressionText = tab.add("edittext", undefined, "", {
            multiline: true,
            scrollable: true,
            readonly: false
        }) as unknown as _Control;
        drumSeqExpressionText.minimumSize = [0, 340];
        drumSeqExpressionText.preferredSize = [-1, 400];
        drumSeqExpressionText.alignment = ["fill", "fill"];

        tab.add("group").alignment = ["fill", "fill"];

        currentDrumSeqState = {
            useNamedDrumSliders: false,
            pitches: [] as number[],
            pitchSliderName: "",
            durationSliderName: "",
            sourceLayerName: "",
            labelMode: "drums",
            totalFrames: 0,
            frameEntries: []
        };

        function getDrumSequencerState() {
            return currentDrumSeqState;
        }

        function setDrumSequencerExpression(expression: string, summary?: string): void {
            drumSeqExpressionText.text = String(expression || "");
            if (summary) {
                drumSeqSummary.text = summary;
            }
            if (tab.layout && tab.layout.resize) {
                tab.layout.resize();
            }
        }

        function getDrumSequencerExpression() {
            return drumSeqExpressionText.text;
        }

        drumSequencerHost = {
            setExpression: setDrumSequencerExpression,
            getExpression: getDrumSequencerExpression,
            setState: function (state: DrumSequencerState) {
                if (state) {
                    currentDrumSeqState = state;
                }
            },
            getState: getDrumSequencerState
        };

        return {
            tab: tab,
            drumSeqSummary: drumSeqSummary,
            drumSeqTotalFrames: drumSeqTotalFrames,
            generateDrumSeqButton: generateDrumSeqButton,
            applyDrumSeqButton: applyDrumSeqButton,
            copyDrumSeqButton: copyDrumSeqButton,
            drumSeqExpressionText: drumSeqExpressionText,
            getDrumSequencerState: getDrumSequencerState,
            getDrumSequencerExpression: getDrumSequencerExpression,
            drumSequencerHost: drumSequencerHost
        };
    }

    function wireDrumSequencerTabHandlers(ui: StringKeyedMap<unknown>, api: ReOmMIDIApi): void {
        var controls = ui as StringKeyedMap<UiControl> & {
            getDrumSequencerExpression: () => string;
        };
        controls.generateDrumSeqButton.onClick = function () {
            if (api.__drumSequencerHost && api.__drumSequencerHost.selectTab) {
                api.__drumSequencerHost.selectTab();
            }
            api.runGenerateDrumSequencer({
                existingExpression: controls.getDrumSequencerExpression(),
                totalFrames: controls.drumSeqTotalFrames.text
            });
        };

        controls.applyDrumSeqButton.onClick = function () {
            if (api.__drumSequencerHost && api.__drumSequencerHost.selectTab) {
                api.__drumSequencerHost.selectTab();
            }
            api.runApplyDrumSequencer(controls.getDrumSequencerExpression());
        };

        controls.copyDrumSeqButton.onClick = function () {
            api.runCopyDrumSequencerExpression(controls.getDrumSequencerExpression());
        };
    }

    function buildMapTab(featureTabs: TabbedPanel) {
        var tab = featureTabs.add("tab", undefined, "MIDI Map");
        var midiMapSummary: _Control;
        var midiMapLabelWarning;
        var midiMapButtonRow;
        var generateMidiMapButton;
        var switchMidiMapLabelsButton: Button;
        var midiMapExpressionText: _Control;
        var midiMapTextNullRow;
        var createMidiMapTextButton;
        var currentMidiMapState: MidiMapState;
        var midiMapHost;

        tab.orientation = "column";
        tab.alignChildren = ["fill", "top"];
        tab.margins = 10;
        tab.spacing = 8;
        tab.alignment = ["fill", "fill"];

        addWrappedHintText(
            tab,
            "Select an imported MIDI null layer in the timeline, detect its pitch range, and customize the string map values in the expression editor box below. " +
                "To copy the final expression, click inside the editor box, press Ctrl+A, then Ctrl+C, and paste it into the Source Text expression of any Text Layer."
        );

        midiMapSummary = tab.add("statictext", undefined, "No map generated yet.", {
            multiline: true
        }) as unknown as _Control;
        midiMapSummary.alignment = ["fill", "top"];

        midiMapLabelWarning = tab.add(
            "statictext",
            undefined,
            "Warning: Switching note/drum labels will overwrite any manual modifications made in the expression box.",
            { multiline: true }
        );
        midiMapLabelWarning.alignment = ["fill", "top"];

        midiMapButtonRow = tab.add("group");
        midiMapButtonRow.orientation = "row";
        midiMapButtonRow.alignChildren = ["fill", "center"];
        midiMapButtonRow.spacing = 8;
        generateMidiMapButton = midiMapButtonRow.add("button", undefined, "Generate from Layer");
        generateMidiMapButton.helpTip =
            "Analyze the selected MIDI null layer to find active pitches and build a text map expression.";
        switchMidiMapLabelsButton = midiMapButtonRow.add("button", undefined, "Use Drum Names") as unknown as Button;
        switchMidiMapLabelsButton.helpTip =
            "Toggle between Note Names (e.g., C4) and General MIDI Drum Names. Warning: Overwrites custom edits.";

        midiMapExpressionText = tab.add("edittext", undefined, "", {
            multiline: true,
            scrollable: true,
            readonly: false
        }) as unknown as _Control;
        midiMapExpressionText.minimumSize = [0, 340];
        midiMapExpressionText.preferredSize = [-1, 400];
        midiMapExpressionText.alignment = ["fill", "fill"];

        midiMapTextNullRow = tab.add("group");
        midiMapTextNullRow.orientation = "row";
        midiMapTextNullRow.alignChildren = ["left", "center"];
        midiMapTextNullRow.alignment = ["fill", "top"];
        midiMapTextNullRow.spacing = 8;
        createMidiMapTextButton = midiMapTextNullRow.add("button", undefined, "Create Text Layer with Expression");
        createMidiMapTextButton.helpTip =
            "Create a new text layer with the generated MIDI Map expression applied to its Source Text.";

        tab.add("group").alignment = ["fill", "fill"];

        currentMidiMapState = {
            pitches: [] as number[],
            pitchSliderName: "",
            sourceLayerName: "",
            labelMode: "notes"
        };

        function getMidiMapState() {
            return currentMidiMapState;
        }

        function syncMidiMapLabelButton() {
            switchMidiMapLabelsButton.text =
                currentMidiMapState.labelMode === "drums" ? "Use Note Names" : "Use Drum Names";
        }

        function setMidiMapExpression(expression: string, summary?: string): void {
            midiMapExpressionText.text = String(expression || "");
            if (summary) {
                midiMapSummary.text = summary;
            }
            if (tab.layout && tab.layout.resize) {
                tab.layout.resize();
            }
        }

        midiMapHost = {
            setExpression: setMidiMapExpression,
            setState: function (state: MidiMapState) {
                if (state) {
                    currentMidiMapState = state;
                    syncMidiMapLabelButton();
                }
            },
            win: featureTabs
        };

        syncMidiMapLabelButton();

        return {
            tab: tab,
            generateMidiMapButton: generateMidiMapButton,
            switchMidiMapLabelsButton: switchMidiMapLabelsButton,
            midiMapExpressionText: midiMapExpressionText,
            createMidiMapTextButton: createMidiMapTextButton,
            getMidiMapState: getMidiMapState,
            midiMapState: currentMidiMapState,
            midiMapHost: midiMapHost
        };
    }

    function wireMapTabHandlers(ui: StringKeyedMap<unknown>, api: ReOmMIDIApi): void {
        var controls = ui as StringKeyedMap<UiControl> & {
            getMidiMapState: () => MidiMapState;
        };
        controls.generateMidiMapButton.onClick = function () {
            if (api.__midiMapHost && api.__midiMapHost.selectTab) {
                api.__midiMapHost.selectTab();
            }
            api.runGenerateMidiMap({
                labelMode: controls.getMidiMapState().labelMode
            });
        };

        controls.switchMidiMapLabelsButton.onClick = function () {
            var nextMode = controls.getMidiMapState().labelMode === "drums" ? "notes" : "drums";
            api.runSwitchMidiMapLabels(nextMode);
        };

        controls.createMidiMapTextButton.onClick = function () {
            api.runCreateMidiMapTextNull(controls.midiMapExpressionText.text);
        };
    }

    function buildMiscTab(featureTabs: TabbedPanel) {
        var tab = featureTabs.add("tab", undefined, "Misc");
        var toneLayerSection;
        var toneWaveform;
        var toneLevel;
        var toneUseWorkArea;
        var toneQuantizeToFrames;
        var toneUseDrumLanes;
        var createToneLayerButton;
        var screenFlipSection;
        var screenFlipHorizontalRow;
        var screenFlipVerticalRow;
        var screenFlipApplyHorizontalButton;
        var screenFlipBakeHorizontalButton;
        var screenFlipApplyVerticalButton;
        var screenFlipBakeVerticalButton;
        var screenFlipMaxNotes;
        var screenFlipUseWorkArea;

        tab.orientation = "column";
        tab.alignChildren = ["fill", "top"];
        tab.margins = 10;
        tab.spacing = 8;
        tab.alignment = ["fill", "fill"];

        toneLayerSection = addOptionsPanel(tab, "Create Tone Layer");
        addWrappedHintText(
            toneLayerSection,
            "Select an imported MIDI null layer in the timeline, then bake note frequencies and volume levels onto a new null layer featuring After Effects' native 'Tone' audio effect. " +
                "Note: Live audio previewing is not supported by expressions, so this tool bakes static keyframes instead."
        );
        toneWaveform = addLabeledControl(toneLayerSection, "Waveform", "dropdownlist", api.TONE_WAVEFORM_OPTIONS);
        toneWaveform.selection = 0 as unknown as ListItem;
        toneWaveform.helpTip = "Select the audio waveform type generated by the Tone effect.";
        toneLevel = addLabeledControl(toneLayerSection, "Level", "edittext", "20");
        toneLevel.helpTip =
            "Specify the audio level percentage (0 to 100). Default 20 keeps combined multi-tone volumes from clipping.";
        toneUseWorkArea = toneLayerSection.add("checkbox", undefined, "Limit to current work area");
        toneUseWorkArea.value = false;
        toneUseWorkArea.helpTip = "Only process note events that fall within the composition work area.";
        toneQuantizeToFrames = toneLayerSection.add("checkbox", undefined, "Quantize keyframes to comp frames");
        toneQuantizeToFrames.value = false;
        toneQuantizeToFrames.helpTip = "Align generated audio tone keyframes to the composition frame boundary grid.";
        toneUseDrumLanes = toneLayerSection.add("checkbox", undefined, "Include MIDI channel 10 drum pitches");
        toneUseDrumLanes.value = true;
        toneUseDrumLanes.helpTip = "Include MIDI Channel 10 drum events when generating tone frequencies.";
        createToneLayerButton = toneLayerSection.add("button", undefined, "Create Tone Layer");
        createToneLayerButton.helpTip =
            "Generate a new null layer with the Tone effect and bake frequency/level keyframes.";

        screenFlipSection = addOptionsPanel(tab, "Screen Flip");
        addWrappedHintText(
            screenFlipSection,
            "Apply a toggle/hold transition that flips scale values between positive and negative on note trigger events. Select an imported MIDI null, then select the target non-MIDI layer " +
                "(or its Scale property) and apply a live expression or bake keyframes. Horizontal flips Scale X; vertical flips Scale Y."
        );
        screenFlipMaxNotes = addLabeledControl(screenFlipSection, "Max notes", "edittext", "10");
        screenFlipMaxNotes.helpTip =
            "Set the maximum trigger limit for the screen flip animation. Use -1 for no limit.";
        screenFlipUseWorkArea = screenFlipSection.add("checkbox", undefined, "Limit to work area");
        screenFlipUseWorkArea.value = false;
        screenFlipUseWorkArea.helpTip = "Only include flip trigger events that occur within the composition work area.";

        screenFlipHorizontalRow = screenFlipSection.add("group");
        screenFlipHorizontalRow.orientation = "row";
        screenFlipHorizontalRow.alignChildren = ["left", "center"];
        screenFlipHorizontalRow.spacing = 8;
        screenFlipApplyHorizontalButton = screenFlipHorizontalRow.add(
            "button",
            undefined,
            "Horizontal — Apply Expression"
        );
        screenFlipApplyHorizontalButton.helpTip =
            "Apply a live toggle/flip expression to the Scale X property of the selected target layer.";
        screenFlipBakeHorizontalButton = screenFlipHorizontalRow.add("button", undefined, "Horizontal — Bake");
        screenFlipBakeHorizontalButton.helpTip =
            "Bake toggle/flip keyframes onto the Scale X property of the selected target layer.";

        screenFlipVerticalRow = screenFlipSection.add("group");
        screenFlipVerticalRow.orientation = "row";
        screenFlipVerticalRow.alignChildren = ["left", "center"];
        screenFlipVerticalRow.spacing = 8;
        screenFlipApplyVerticalButton = screenFlipVerticalRow.add("button", undefined, "Vertical — Apply Expression");
        screenFlipApplyVerticalButton.helpTip =
            "Apply a live toggle/flip expression to the Scale Y property of the selected target layer.";
        screenFlipBakeVerticalButton = screenFlipVerticalRow.add("button", undefined, "Vertical — Bake");
        screenFlipBakeVerticalButton.helpTip =
            "Bake toggle/flip keyframes onto the Scale Y property of the selected target layer.";

        screenFlipApplyHorizontalButton.preferredSize = [180, 24];
        screenFlipApplyHorizontalButton.minimumSize = [180, 22];
        screenFlipBakeHorizontalButton.preferredSize = [120, 24];
        screenFlipBakeHorizontalButton.minimumSize = [120, 22];
        screenFlipApplyVerticalButton.preferredSize = [180, 24];
        screenFlipApplyVerticalButton.minimumSize = [180, 22];
        screenFlipBakeVerticalButton.preferredSize = [120, 24];
        screenFlipBakeVerticalButton.minimumSize = [120, 22];

        tab.add("group").alignment = ["fill", "fill"];

        return {
            tab: tab,
            toneWaveform: toneWaveform,
            toneLevel: toneLevel,
            toneUseWorkArea: toneUseWorkArea,
            toneQuantizeToFrames: toneQuantizeToFrames,
            toneUseDrumLanes: toneUseDrumLanes,
            createToneLayerButton: createToneLayerButton,
            screenFlipMaxNotes: screenFlipMaxNotes,
            screenFlipUseWorkArea: screenFlipUseWorkArea,
            screenFlipApplyHorizontalButton: screenFlipApplyHorizontalButton,
            screenFlipBakeHorizontalButton: screenFlipBakeHorizontalButton,
            screenFlipApplyVerticalButton: screenFlipApplyVerticalButton,
            screenFlipBakeVerticalButton: screenFlipBakeVerticalButton
        };
    }

    function wireMiscTabHandlers(ui: StringKeyedMap<unknown>, api: ReOmMIDIApi): void {
        var controls = ui as StringKeyedMap<UiControl>;
        function screenFlipOptions(axis: "horizontal" | "vertical"): ScreenFlipRunOptions {
            return {
                axis: axis,
                maxNotes: controls.screenFlipMaxNotes.text,
                useWorkArea: !!controls.screenFlipUseWorkArea.value
            };
        }

        controls.createToneLayerButton.onClick = function () {
            api.runCreateToneLayer({
                waveform:
                    controls.toneWaveform.selection && typeof controls.toneWaveform.selection !== "number"
                        ? controls.toneWaveform.selection.text
                        : "Sine",
                level: controls.toneLevel.text,
                useWorkArea: !!controls.toneUseWorkArea.value,
                quantizeToFrames: !!controls.toneQuantizeToFrames.value,
                useDrumLanes: !!controls.toneUseDrumLanes.value
            });
        };

        controls.screenFlipApplyHorizontalButton.onClick = function () {
            api.runApplyScreenFlip(screenFlipOptions("horizontal"));
        };

        controls.screenFlipBakeHorizontalButton.onClick = function () {
            api.runBakeScreenFlip(screenFlipOptions("horizontal"));
        };

        controls.screenFlipApplyVerticalButton.onClick = function () {
            api.runApplyScreenFlip(screenFlipOptions("vertical"));
        };

        controls.screenFlipBakeVerticalButton.onClick = function () {
            api.runBakeScreenFlip(screenFlipOptions("vertical"));
        };
    }

    function buildUI(thisObj?: Panel | Window): Window | Panel {
        api.resetGlobalState();
        var isPanel = thisObj instanceof Panel;
        var win: Window | Panel;
        if (isPanel) {
            if (!thisObj) {
                throw new Error("Panel host required.");
            }
            win = thisObj;
        } else {
            win = new Window("palette", "ReOm MIDI", undefined, { resizeable: true });
        }
        var panelWidth = PANEL_WIDTH_DEFAULT;
        var panelHeight = PANEL_HEIGHT_DEFAULT;
        var featureTabs: TabbedPanel;
        var mapPreviewState = createPreviewState();
        var actionPreviewState = createPreviewState();
        var importUi;
        var pianoRollUi: StringKeyedMap<unknown>;
        var actionsUi: StringKeyedMap<unknown>;
        var drumMachineUi: StringKeyedMap<unknown>;
        var drumSequencerUi: StringKeyedMap<unknown>;
        var mapUi: StringKeyedMap<unknown>;
        var miscUi;
        var footerGroup;
        var statusBar;
        var closeButtonRow;
        var closeButton;
        var selectFeatureTab: (tab: Tab) => void;

        win.orientation = "column";
        win.alignChildren = ["fill", "fill"];
        win.margins = 12;
        win.spacing = 8;
        if (!isPanel) {
            win.preferredSize = [panelWidth, panelHeight];
        }
        win.minimumSize = [PANEL_MIN_WIDTH, 360];

        var headerGroup = win.add("group");
        headerGroup.orientation = "row";
        headerGroup.alignment = ["fill", "top"];
        headerGroup.alignChildren = ["fill", "center"];
        headerGroup.spacing = 8;

        var titleText = headerGroup.add("statictext", undefined, "ReOm MIDI v" + api.VERSION, { multiline: false });
        titleText.alignment = ["left", "center"];

        var githubRepoName = "FuouM/AE-ReOm-MIDI";
        var githubRepoUrl = "https://github.com/" + githubRepoName;
        var githubLink = headerGroup.add("statictext", undefined, "GitHub: " + githubRepoName);
        githubLink.alignment = ["right", "center"];
        githubLink.helpTip = "Click to open " + githubRepoUrl + " in your default web browser.";
        try {
            var linkGraphics = githubLink.graphics;
            var linkGfx = asScriptUiPenHost(linkGraphics);
            var bluePen = linkGfx.newPen(linkGfx.PenType.SOLID_COLOR, [0.29, 0.56, 0.89, 1.0], 1);
            linkGfx.foregroundColor = bluePen;
        } catch (colorErr) {}

        githubLink.addEventListener("click", function () {
            var url = githubRepoUrl;
            try {
                if (($.os || "").indexOf("Windows") !== -1) {
                    system.callSystem("cmd.exe /c start " + url);
                } else {
                    system.callSystem("open " + url);
                }
            } catch (openErr) {
                alert("Could not open link automatically. Please visit:\n" + url);
            }
        });

        featureTabs = win.add("tabbedpanel");
        featureTabs.alignChildren = ["fill", "fill"];
        featureTabs.alignment = ["fill", "fill"];
        featureTabs.minimumSize = [0, 200];
        featureTabs.maximumSize = [10000, 10000];

        importUi = buildImportTab(featureTabs);
        pianoRollUi = buildPianoRollTab(win, featureTabs, mapPreviewState) as StringKeyedMap<unknown>;
        actionsUi = buildActionsTab(win, featureTabs, actionPreviewState) as StringKeyedMap<unknown>;
        drumMachineUi = buildDrumMachineTab(featureTabs) as StringKeyedMap<unknown>;
        drumSequencerUi = buildDrumSequencerTab(featureTabs) as StringKeyedMap<unknown>;
        mapUi = buildMapTab(featureTabs) as StringKeyedMap<unknown>;
        miscUi = buildMiscTab(featureTabs);

        footerGroup = win.add("group");
        footerGroup.orientation = "column";
        footerGroup.alignChildren = ["fill", "top"];
        footerGroup.alignment = ["fill", "bottom"];
        footerGroup.maximumSize = [10000, 76];
        statusBar = footerGroup.add(
            "statictext",
            undefined,
            "Open a comp and select an imported MIDI null for map and action tools."
        );
        statusBar.alignment = ["fill", "top"];
        closeButtonRow = footerGroup.add("group");
        closeButtonRow.orientation = "row";
        closeButtonRow.alignChildren = ["right", "center"];
        closeButtonRow.alignment = ["fill", "bottom"];
        closeButtonRow.maximumSize = [10000, 32];
        closeButtonRow.visible = !isPanel;
        closeButton = closeButtonRow.add("button", undefined, "Close");
        closeButton.alignment = ["right", "center"];
        closeButton.preferredSize = [72, 24];
        closeButton.maximumSize = [96, 26];

        selectFeatureTab = function (tab: Tab) {
            var alreadySelected;
            if (!featureTabs || !tab) {
                return;
            }
            alreadySelected = featureTabs.selection === tab;
            featureTabs.selection = tab;
            if (alreadySelected) {
                return;
            }
            if (tab === (actionsUi.tab as Tab) && actionsUi.syncActionPresetUi) {
                (actionsUi.syncActionPresetUi as unknown as () => void)();
            }
            layoutScriptUiHost(win, false, false);
            refreshExpandedPreviewHosts(win, mapPreviewState, actionPreviewState);
        };

        (pianoRollUi.previewHost as ReOmPreviewHost).selectTab = function () {
            selectFeatureTab(pianoRollUi.tab as Tab);
        };
        (actionsUi.previewHost as ReOmPreviewHost).selectTab = function () {
            if (featureTabs.selection !== (actionsUi.tab as Tab)) {
                selectFeatureTab(actionsUi.tab as Tab);
            }
        };
        (mapUi.midiMapHost as ReOmMidiMapHost).selectTab = function () {
            selectFeatureTab(mapUi.tab as Tab);
        };
        (mapUi.midiMapHost as ReOmMidiMapHost).win = win;
        (drumSequencerUi.drumSequencerHost as ReOmDrumSequencerHost).selectTab = function () {
            selectFeatureTab(drumSequencerUi.tab as Tab);
        };
        (drumSequencerUi.drumSequencerHost as ReOmDrumSequencerHost).win = win;

        api.__mapPreviewHost = pianoRollUi.previewHost as ReOmPreviewHost;
        api.__actionPreviewHost = actionsUi.previewHost as ReOmPreviewHost;
        api.__midiMapHost = mapUi.midiMapHost as ReOmMidiMapHost;
        api.__drumSequencerHost = drumSequencerUi.drumSequencerHost as ReOmDrumSequencerHost;

        wireImportTabHandlers(importUi, api);
        wirePianoRollTabHandlers(pianoRollUi, api);
        wireActionsTabHandlers(actionsUi, api);
        wireDrumMachineTabHandlers(drumMachineUi, api);
        wireDrumSequencerTabHandlers(drumSequencerUi, api);
        wireMapTabHandlers(mapUi, api);
        wireMiscTabHandlers(miscUi, api);

        featureTabs.onChange = function () {
            if (featureTabs.selection === (actionsUi.tab as Tab) && actionsUi.syncActionPresetUi) {
                (actionsUi.syncActionPresetUi as unknown as () => void)();
            }
        };

        api.__syncActionPresetUi = function () {
            var state = api.__panelUiState;
            if (state && state.syncActionPresetUi) {
                state.syncActionPresetUi();
            }
        };

        api.__panelUiState = {
            win: win,
            isPanel: isPanel,
            lockedWindowHeight: PANEL_LOCKED_HEIGHT,
            featureTabs: featureTabs,
            importTab: importUi.tab as unknown as Tab,
            pianoRollTab: pianoRollUi.tab as unknown as Tab,
            actionsTab: actionsUi.tab as unknown as Tab,
            drumMachineTab: drumMachineUi.tab as unknown as Tab,
            drumSequencerTab: drumSequencerUi.tab as unknown as Tab,
            mapTab: mapUi.tab as unknown as Tab,
            miscTab: miscUi.tab as unknown as Tab,
            mapPreviewState: mapPreviewState,
            actionPreviewState: actionPreviewState,
            syncActionPresetUi: actionsUi.syncActionPresetUi as unknown as () => void,
            refreshActionPresetFieldVisibility: actionsUi.refreshActionPresetFieldVisibility as unknown as () => void,
            relayoutActionSettingsPanel: actionsUi.relayoutActionSettingsPanel as unknown as () => void
        };
        api.selectFeatureTab = selectFeatureTab;
        api.refreshPanelLayout = function () {
            var state = api.__panelUiState;
            if (!state || !state.featureTabs) {
                return;
            }
            if (!state.featureTabs.selection && state.importTab) {
                state.featureTabs.selection = state.importTab;
            }
            resizeScriptUiHost(state.win);
            if (api.refreshPreviewPanels) {
                api.refreshPreviewPanels(false);
            }
        };

        closeButton.onClick = function () {
            if (win instanceof Window) {
                win.close();
            }
        };

        if (win.layout && win.layout.layout) {
            win.layout.layout(true);
        }
        featureTabs.selection = importUi.tab;
        refreshScriptUiHost(win);
        applyLockedWindowHeightFromState(api.__panelUiState);
        if (!isPanel) {
            win.preferredSize = [-1, -1];
        }
        app.scheduleTask(
            "try { if (ReOmMIDI.refreshPanelLayout) { ReOmMIDI.refreshPanelLayout(); } } catch (e) {}",
            1,
            false
        );
        if (isPanel) {
            app.scheduleTask(
                "try { if (ReOmMIDI.refreshPanelLayout) { ReOmMIDI.refreshPanelLayout(); } } catch (e) {}",
                100,
                false
            );
        }
        bindPanelResizeHandlers(win, api.__panelUiState, mapPreviewState, actionPreviewState);
        globalState().panelHostLiveWidth = win.size && win.size[0] > 0 ? win.size[0] : PANEL_WIDTH_DEFAULT;

        return win;
    }

    api.alertError = function (message) {
        alert("ReOm MIDI\n\n" + message);
    };

    var copyDialogState = {
        win: null as Window | null,
        hint: null as _Control | null,
        text: null as EditText | null
    };

    function closeMidiActionExpressionCopyDialog() {
        if (copyDialogState.win) {
            try {
                copyDialogState.win.close();
            } catch (closeErr) {}
            copyDialogState.win = null;
            copyDialogState.hint = null;
            copyDialogState.text = null;
        }
    }

    function createMidiActionExpressionCopyDialog(sourceLabel: string): Window {
        var win;
        var hint;
        var text;
        var closeButton;

        closeMidiActionExpressionCopyDialog();
        win = new Window("palette", "ReOm MIDI — Copy Expression", undefined, { resizeable: true });
        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.margins = 16;
        win.spacing = 8;
        win.preferredSize.width = 680;
        hint = win.add("statictext", undefined, "Source: " + (sourceLabel || "MIDI") + "\nBuilding expression...", {
            multiline: true
        });
        hint.preferredSize.width = 640;
        text = win.add("edittext", undefined, "", {
            multiline: true,
            scrollable: true,
            readonly: false
        });
        text.preferredSize = [640, 420];
        text.minimumSize = [480, 240];
        closeButton = win.add("button", undefined, "Close", { name: "ok" });
        closeButton.alignment = ["right", "center"];
        closeButton.onClick = function () {
            closeMidiActionExpressionCopyDialog();
        };
        copyDialogState.win = win;
        copyDialogState.hint = hint as unknown as _Control;
        copyDialogState.text = text;
        return win;
    }

    api.openMidiActionExpressionCopyDialog = function (sourceLabel: string) {
        var win = createMidiActionExpressionCopyDialog(sourceLabel);
        win.center();
        win.show();
    };

    api.completeMidiActionExpressionCopyDialog = function (expression, sourceLabel) {
        var expressionText = String(expression || "");
        if (!copyDialogState.win || !copyDialogState.text) {
            if (api.openMidiActionExpressionCopyDialog) {
                api.openMidiActionExpressionCopyDialog(sourceLabel || "MIDI");
            }
        }
        if (copyDialogState.hint) {
            copyDialogState.hint.text =
                "Source: " +
                (sourceLabel || "MIDI") +
                "\nSelect all (Ctrl+A), copy (Ctrl+C), then paste into an After Effects expression.";
        }
        if (copyDialogState.text) {
            copyDialogState.text.text = expressionText;
        }
        if (copyDialogState.win) {
            try {
                if (copyDialogState.win.layout && copyDialogState.win.layout.layout) {
                    copyDialogState.win.layout.layout(true);
                }
                if (copyDialogState.win.update) {
                    copyDialogState.win.update();
                }
            } catch (updateErr) {}
        }
        try {
            if (typeof $ !== "undefined" && $.global) {
                globalState().lastActionExpression = expressionText;
            }
        } catch (globalErr) {}
    };

    api.closeMidiActionExpressionCopyDialog = closeMidiActionExpressionCopyDialog;

    api.showMidiActionExpressionCopyDialog = function (expression: string, sourceLabel?: string) {
        if (api.openMidiActionExpressionCopyDialog) {
            api.openMidiActionExpressionCopyDialog(sourceLabel || "MIDI");
        }
        if (api.completeMidiActionExpressionCopyDialog) {
            api.completeMidiActionExpressionCopyDialog(expression, sourceLabel);
        }
    };

    var midiInfoDialogState: {
        win: Window | null;
        text: EditText | null;
    } = {
        win: null,
        text: null
    };

    function closeMidiInfoDialog() {
        if (midiInfoDialogState.win) {
            try {
                midiInfoDialogState.win.close();
            } catch (closeErr) {}
            midiInfoDialogState.win = null;
            midiInfoDialogState.text = null;
        }
    }

    api.showMidiInfoDialog = function (filePath, reportText) {
        var win;
        var hint;
        var text;
        var closeButton;
        var fileLabel = String(filePath || "MIDI file");
        var reportString = String(reportText || "");

        closeMidiInfoDialog();
        try {
            win = new Window("dialog", "ReOm MIDI — MIDI Info", undefined, { resizeable: true });
            win.orientation = "column";
            win.alignChildren = ["fill", "top"];
            win.margins = 16;
            win.spacing = 8;
            win.preferredSize.width = 620;
            hint = win.add("statictext", undefined, "Stats for:\n" + fileLabel, { multiline: true });
            hint.preferredSize.width = 580;
            text = win.add("edittext", undefined, "", {
                multiline: true,
                scrollable: true
            });
            text.text = reportString;
            try {
                text.readonly = true;
            } catch (readonlyErr) {}
            text.preferredSize = [580, 420];
            text.minimumSize = [420, 240];
            closeButton = win.add("button", undefined, "Close", { name: "ok" });
            closeButton.alignment = ["right", "center"];
            closeButton.onClick = closeMidiInfoDialog;
            midiInfoDialogState.win = win;
            midiInfoDialogState.text = text;
            win.center();
            win.show();
        } catch (dialogErr) {
            closeMidiInfoDialog();
            alert("ReOm MIDI Info\n\n" + reportString);
        }
    };

    api.closeMidiInfoDialog = closeMidiInfoDialog;

    api.showProgress = makeProgress;
    api.buildUI = buildUI;
})(ReOmMIDI);
