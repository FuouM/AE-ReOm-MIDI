/**
 * ReOm-specific ScriptUI augmentations merged onto types-for-adobe/shared/ScriptUI.d.ts.
 * Base Window, Panel, Tab, and ScriptUIGraphics types come from types-for-adobe; only ReOm
 * host state and panel wiring live here.
 */

/** ExtendScript `this` in panel scripts — documented cast escape hatch (property-utils.ts). */
declare function reomScriptThis(thisObj: unknown): Panel | Window | undefined;

/** ScriptUIGraphics pen host — documented cast escape hatch (property-utils.ts). */
declare function asScriptUiPenHost(g: ScriptUIGraphics): ScriptUIGraphicsPenHost;

/** ScriptUIGraphics subset for link pen styling (types-for-adobe newPen type arg is incorrect). */
interface ScriptUIGraphicsPenHost {
    PenType: {
        SOLID_COLOR: number;
        THEME_COLOR: number;
    };
    newPen(type: number, color: number[], width: number): ScriptUIPen;
    foregroundColor: ScriptUIPen;
}

interface ScriptUIGraphics {
    BrushType: {
        SOLID_COLOR: number;
        THEME_COLOR: number;
    };
    PenType: {
        SOLID_COLOR: number;
        THEME_COLOR: number;
    };
}

interface Window {
    update?(): void;
    resizeable?: boolean;
    onResizing?: () => void;
    onResize?: () => void;
}

interface Panel {
    sectionShell?: Group;
    sectionCaption?: StaticText;
    update?(): void;
    onResizing?: () => void;
    onResize?: () => void;
}

interface EditText {
    readonly?: boolean;
    dropTarget?: boolean;
    onDragEnter?: () => boolean;
    onDrop?: (dragData: { type?: string; data?: unknown }) => void;
}

interface ScriptUiLayoutManager {
    layout(force?: boolean): void;
    resize(): void;
}

interface _Control {
    _reomSavedGroupSize?: {
        minimumSize?: Dimension | number[];
        preferredSize?: Dimension | number[];
        margins?: Margins | number | number[];
        spacing?: number;
    };
    _reomPreserveMinWidth?: boolean;
    text?: string;
    layout?: ScriptUiLayoutManager;
    children?: _Control[];
    parent?: _Control;
    margins?: Margins | number | number[];
    spacing?: number;
    alignment?: string | string[];
    orientation?: string;
    alignChildren?: string | string[];
    graphics?: ScriptUIGraphics;
    onDraw?: () => void;
    notify?: (event: string) => void;
    update?(): void;
    type?: string;
    visible?: boolean;
    size?: number[];
    helpTip?: string;
    value?: boolean | string | number;
    selection?: ListItem;
    onClick?: () => void;
    _pianoRollPreviewLayout?: PianoRollPreviewLayout & { loading?: boolean; loadingFrame?: number };
    _midiActionPreviewLayout?: MidiActionPreviewLayout & { loading?: boolean; loadingFrame?: number };
    _pianoRollPreviewRevision?: number;
    _midiActionPreviewRevision?: number;
}

interface TabbedPanel {
    alignChildren?: string | string[];
}

/** Common ScriptUI control surface used by ReOm panel wiring. */
interface UiControl extends _Control {
    text?: string;
    value?: boolean;
    selection?: ListItem | number;
    onClick?: () => void;
    onChange?: () => void;
    items?: ListItem[];
}

/** Progress dialog returned by showProgress. */
interface ProgressHandle {
    update(text: string, ratio: number): boolean;
    close(): void;
}

/** Preview canvas host state wired by the panel UI. */
interface ReOmPreviewState {
    container: Group | null;
    panel: Group | null;
    toolbarGroup: Group | null;
    headerGroup: Group | null;
    footerGroup: Group | null;
    summary: _Control | null;
    canvas: Group | null;
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
    relayoutActionSettingsPanel?: (preset?: string, recalculate?: boolean) => void;
}
