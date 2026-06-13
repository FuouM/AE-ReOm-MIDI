/**
 * ReOm-specific ScriptUI augmentations merged onto types-for-adobe/shared/ScriptUI.d.ts.
 * Base Window, Panel, Tab, and ScriptUIGraphics types come from types-for-adobe; only ReOm
 * host state and panel wiring live here.
 */

/** ScriptUIGraphics subset for link pen styling (types-for-adobe newPen type arg is incorrect). */
interface ScriptUIGraphicsPenHost {
    PenType: {
        SOLID_COLOR: number;
        THEME_COLOR: number;
    };
    newPen(type: number, color: number[], width: number): ScriptUIPen;
    foregroundColor: ScriptUIPen;
}

interface Window {
    update?(): void;
    resizeable?: boolean;
}

interface _Control {
    _reomSavedGroupSize?: {
        minimumSize?: Dimension | number[];
        preferredSize?: Dimension | number[];
        margins?: Margins | number | number[];
        spacing?: number;
    };
    _reomPreserveMinWidth?: boolean;
}

/** Progress dialog returned by showProgress. */
interface ProgressHandle {
    update(text: string, ratio: number): boolean;
    close(): void;
}

/** Preview canvas host state wired by the panel UI. */
interface ReOmPreviewState {
    container: _Control | null;
    panel: _Control | null;
    toolbarGroup: _Control | null;
    headerGroup: _Control | null;
    footerGroup: _Control | null;
    summary: _Control | null;
    canvas: _Control | null;
    hideButton: _Control | null;
    expanded: boolean;
    layoutPrimed: boolean;
    containerMargins?: Margins | number | number[];
    containerSpacing?: number;
}

/** Piano-roll / action preview host object stored on the API. */
interface ReOmPreviewHost {
    ensure?: () => ReOmPreviewState;
    hide?: () => void;
    relayout?: () => void;
    previewState?: ReOmPreviewState;
    flushName?: string;
    win?: Window | Panel;
    selectTab?: () => void;
}

/** MIDI Map tab host for expression editor updates. */
interface ReOmMidiMapHost {
    setExpression(expression: string, summary?: string): void;
    setState(state: MidiMapState): void;
    selectTab?: () => void;
    win?: Window | Panel | TabbedPanel;
}

/** Drum Sequencer tab host for expression editor updates. */
interface ReOmDrumSequencerHost {
    setExpression(expression: string, summary?: string): void;
    getExpression(): string;
    setState(state: DrumSequencerState): void;
    getState(): DrumSequencerState;
    selectTab?: () => void;
    win?: Window | Panel;
}

/** Root panel state stored on api.__panelUiState. */
interface ReOmPanelUiState {
    win: Window | Panel;
    isPanel: boolean;
    lockedWindowHeight: number;
    featureTabs: TabbedPanel;
    importTab: Tab;
    pianoRollTab: Tab;
    actionsTab: Tab;
    drumMachineTab: Tab;
    drumSequencerTab: Tab;
    mapTab: Tab;
    miscTab: Tab;
    mapPreviewState: ReOmPreviewState;
    actionPreviewState: ReOmPreviewState;
    syncActionPresetUi?: () => void;
    refreshActionPresetFieldVisibility?: () => void;
}
