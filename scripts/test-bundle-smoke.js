const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const { root, VERSION } = require("./source-loader");
const bundlePath = path.join(root, "re_om_midi.jsx");
const bundleSource = fs
  .readFileSync(bundlePath, "utf8")
  .replace(/^#targetengine[^\r\n]*[\r\n]+/m, "")
  .replace(/^#target[^\r\n]*[\r\n]+/m, "");
assert.strictEqual(
  bundleSource.indexOf("Object.assign"),
  -1,
  "bundle should not use Object.assign (ExtendScript incompatible)"
);
const context = {
  console,
  CompItem: function CompItem() {},
  KeyframeInterpolationType: {
    HOLD: "hold"
  },
  $: {
    global: {}
  },
  ReOmMIDI: {
    __NO_AUTO_LAUNCH__: true
  }
};
context.global = context;
context.$.global = context;
vm.createContext(context);

vm.runInContext(bundleSource, context, { filename: "re_om_midi.jsx" });

const panelContext = {
  console,
  CompItem: function CompItem() {},
  KeyframeInterpolationType: {
    HOLD: "hold"
  },
  $: {
    global: {}
  },
  ReOmMIDI: {
    __NO_AUTO_LAUNCH__: true
  }
};
panelContext.$.global = panelContext;
panelContext.global = panelContext;
vm.createContext(panelContext);
vm.runInContext(bundleSource, panelContext, { filename: "re_om_midi_panel.jsx" });
assert.ok(
  panelContext.ReOmMIDI && panelContext.ReOmMIDI.VERSION,
  "panel context should initialize ReOmMIDI on $.global"
);
assert.strictEqual(
  typeof panelContext.ReOmMIDI.buildUI,
  "function",
  "panel context should register buildUI on the shared api"
);

assert.ok(context.ReOmMIDI.VERSION, "bundle should expose a version");
assert.strictEqual(context.ReOmMIDI.VERSION, VERSION, "bundle VERSION should match package.json");
assert.strictEqual(typeof context.ReOmMIDI.MidiFile, "function", "bundle should expose MidiFile");
assert.strictEqual(typeof context.ReOmMIDI.importMidiToComp, "function", "bundle should expose importMidiToComp");
assert.strictEqual(typeof context.ReOmMIDI.buildUI, "function", "bundle should expose buildUI");
assert.strictEqual(typeof context.ReOmMIDI.runImport, "function", "bundle should expose runImport");
assert.strictEqual(
  typeof context.ReOmMIDI.buildMidiActionExpression,
  "function",
  "bundle should expose MIDI Action expressions"
);
assert.strictEqual(
  typeof context.ReOmMIDI.applyExpressionToSelectedProperties,
  "function",
  "bundle should expose expression application"
);
assert.strictEqual(typeof context.ReOmMIDI.simulateMidiAction, "function", "bundle should expose action simulator");
assert.strictEqual(
  typeof context.ReOmMIDI.simulateMidiActionFromLayer,
  "function",
  "bundle should expose layer action simulator"
);
assert.strictEqual(
  typeof context.ReOmMIDI.buildMidiActionPreviewLayout,
  "function",
  "bundle should expose action preview layout"
);
assert.strictEqual(typeof context.ReOmMIDI.previewMidiAction, "function", "bundle should expose action preview");
assert.strictEqual(
  typeof context.ReOmMIDI.bakeMidiActionToSelectedProperties,
  "function",
  "bundle should expose action baking"
);
assert.strictEqual(
  typeof context.ReOmMIDI.createMidiActionNullWithExpression,
  "function",
  "bundle should expose action null expression creator"
);
assert.strictEqual(
  typeof context.ReOmMIDI.createMidiActionNullWithBake,
  "function",
  "bundle should expose action null bake creator"
);
assert.strictEqual(
  typeof context.ReOmMIDI.runCreateMidiActionNullWithBake,
  "function",
  "bundle should wire Null + Bake button runner"
);
assert.strictEqual(
  typeof context.ReOmMIDI.buildMidiActionExpressionFromLayer,
  "function",
  "bundle should expose layer-based action expression builder"
);
assert.strictEqual(
  typeof context.ReOmMIDI.buildPianoRollRects,
  "function",
  "bundle should expose piano roll map builder"
);
assert.strictEqual(
  typeof context.ReOmMIDI.createPianoRollMapLayers,
  "function",
  "bundle should expose piano roll AE creator"
);
assert.strictEqual(
  typeof context.ReOmMIDI.frequencyForPitch,
  "function",
  "bundle should expose MIDI note frequency lookup"
);
assert.strictEqual(
  typeof context.ReOmMIDI.buildToneLayerKeyframePlan,
  "function",
  "bundle should expose tone keyframe planner"
);
assert.strictEqual(typeof context.ReOmMIDI.createToneLayer, "function", "bundle should expose tone layer creator");
assert.strictEqual(
  typeof context.ReOmMIDI.createMetronomeLayer,
  "function",
  "bundle should expose metronome layer creator"
);
assert.strictEqual(typeof context.ReOmMIDI.createBpmLayer, "function", "bundle should expose BPM layer creator");
assert.strictEqual(
  typeof context.ReOmMIDI.runCreateMetronomeLayer,
  "function",
  "bundle should wire Create Metronome Layer runner"
);
assert.strictEqual(typeof context.ReOmMIDI.applyScreenFlip, "function", "bundle should expose screen flip apply");
assert.strictEqual(typeof context.ReOmMIDI.bakeScreenFlip, "function", "bundle should expose screen flip bake");
assert.strictEqual(
  typeof context.ReOmMIDI.buildScreenFlipExpression,
  "function",
  "bundle should expose screen flip expression builder"
);
assert.strictEqual(
  typeof context.ReOmMIDI.runApplyScreenFlip,
  "function",
  "bundle should wire screen flip apply runner"
);
assert.strictEqual(typeof context.ReOmMIDI.runBakeScreenFlip, "function", "bundle should wire screen flip bake runner");
assert.strictEqual(typeof context.ReOmMIDI.runCreateBpmLayer, "function", "bundle should wire Create BPM Layer runner");
assert.strictEqual(
  typeof context.ReOmMIDI.runCreateToneLayer,
  "function",
  "bundle should wire Create Tone Layer runner"
);
assert.strictEqual(
  typeof context.ReOmMIDI.buildPianoRollPreviewHtml,
  "function",
  "bundle should expose piano roll preview html builder"
);
assert.strictEqual(
  typeof context.ReOmMIDI.buildPianoRollPreviewLayout,
  "function",
  "bundle should expose piano roll preview layout builder"
);
assert.strictEqual(typeof context.ReOmMIDI.previewPianoRollMap, "function", "bundle should expose piano roll preview");
assert.strictEqual(
  typeof context.ReOmMIDI.showPianoRollPreviewInPanel,
  "function",
  "bundle should expose in-panel piano roll preview"
);
assert.strictEqual(context.ReOmMIDI.quantizeTimeToFrame(0.049, 1 / 24), 1 / 24, "time should snap to nearest frame");
assert.strictEqual(context.ReOmMIDI.mapRange(15, 0, 10, 100, 200, true), 200, "mapRange should clamp high values");

function createFakeLayer() {
  const effectList = [];
  const effects = {};
  const transformValues = {};
  function makeTransformProp(initialValue) {
    return {
      value: initialValue,
      setValue(value) {
        this.value = value;
      }
    };
  }
  const transform = {
    property(name) {
      if (name === "ADBE Anchor Point" || name === "Anchor Point") {
        if (!transformValues.anchorPoint) {
          transformValues.anchorPoint = makeTransformProp([0, 0]);
        }
        return transformValues.anchorPoint;
      }
      if (name === "ADBE Position" || name === "Position") {
        if (!transformValues.position) {
          transformValues.position = makeTransformProp([0, 0]);
        }
        return transformValues.position;
      }
      return null;
    },
    _values: transformValues
  };
  function makeSliderProperty(store) {
    return {
      numKeys: 0,
      times: [],
      values: [],
      setValuesAtTimes(times, values) {
        this.times = Array.prototype.slice.call(times);
        this.values = Array.prototype.slice.call(values);
        this.numKeys = times.length;
      },
      setInterpolationTypeAtKey() {},
      key(index) {
        return {
          time: this.times[index - 1],
          value: this.values[index - 1]
        };
      },
      keyTime(index) {
        return this.times[index - 1];
      },
      keyValue(index) {
        return this.values[index - 1];
      },
      valueAtTime(time, preExpression) {
        let value = this.values.length ? this.values[0] : 0;
        for (let i = 0; i < this.times.length; i += 1) {
          if (this.times[i] <= time) {
            value = this.values[i];
          }
        }
        return value;
      }
    };
  }
  return {
    name: "",
    property(name) {
      if (name === "ADBE Transform Group") {
        return transform;
      }
      return null;
    },
    _transform: transform,
    effect(effectName) {
      const fx = effects[effectName];
      if (!fx) {
        throw new Error("missing effect " + effectName);
      }
      return function sliderAccessor() {
        return fx.valueProperty;
      };
    },
    Effects: {
      addProperty(matchName) {
        const effect = {
          matchName: matchName,
          property(name) {
            if (name === "Slider" || name === 1 || name === "ADBE Slider Control-0001") {
              return this.valueProperty;
            }
            if (name === "Color" || name === 1) {
              return this.colorProperty;
            }
            return this.valueProperty || this.colorProperty;
          }
        };
        if (matchName === "ADBE Color Control") {
          effect.colorProperty = {
            setValue(value) {
              this.value = value;
            }
          };
        } else if (matchName === "ADBE Aud Tone" || matchName === "Tone") {
          const tonePropertyAliases = {
            "ADBE Aud Tone-0001": "Waveform options",
            "ADBE Aud Tone-0002": "Frequency 1",
            "ADBE Aud Tone-0003": "Frequency 2",
            "ADBE Aud Tone-0004": "Frequency 3",
            "ADBE Aud Tone-0005": "Frequency 4",
            "ADBE Aud Tone-0006": "Frequency 5",
            "ADBE Aud Tone-0007": "Level"
          };
          const tonePropertyByIndex = [
            "Waveform options",
            "Frequency 1",
            "Frequency 2",
            "Frequency 3",
            "Frequency 4",
            "Frequency 5",
            "Level"
          ];
          effect.toneProperties = {};
          effect.property = function toneProperty(name) {
            let key = name;
            if (typeof name === "number") {
              key = tonePropertyByIndex[name - 1] || String(name);
            } else if (tonePropertyAliases[name]) {
              key = tonePropertyAliases[name];
            }
            if (!this.toneProperties[key]) {
              this.toneProperties[key] = makeSliderProperty();
            }
            return this.toneProperties[key];
          };
        } else {
          effect.valueProperty = makeSliderProperty();
        }
        Object.defineProperty(effect, "name", {
          get() {
            return this._name || "";
          },
          set(value) {
            this._name = value;
            if (!effects[value]) {
              effects[value] = effect;
              effectList.push(effect);
            }
          }
        });
        return effect;
      },
      get numProperties() {
        return effectList.length;
      },
      property(nameOrIndex) {
        if (typeof nameOrIndex === "number") {
          return effectList[nameOrIndex - 1];
        }
        return effects[nameOrIndex];
      },
      _effects: effects
    }
  };
}

const fakeLayers = [];
const fakeComp = {
  duration: 10,
  frameDuration: 1 / 24,
  layers: {
    addNull() {
      const layer = createFakeLayer();
      fakeLayers.push(layer);
      return layer;
    }
  }
};
const fakeMidi = {
  filePath: "fixture.mid",
  durationSeconds: 1,
  notes: [
    { time: 0.01, duration: 0.25, pitch: 60, velocity: 100, midiChannel: 0 },
    { time: 0.02, duration: 0.5, pitch: 62, velocity: 110, midiChannel: 0 },
    { time: 0.06, duration: 0.75, pitch: 64, velocity: 120, midiChannel: 0 },
    {
      time: 0.01,
      offTime: 0.04,
      duration: 0.03,
      pitch: 36,
      velocity: 100,
      midiChannel: 9,
      trackIndex: 1,
      drumName: "Bass Drum 1"
    }
  ],
  noteEvents: [
    { time: 0.01, pitch: 60, velocity: 100 },
    { time: 0.02, pitch: 62, velocity: 110 },
    { time: 0.06, pitch: 64, velocity: 120 },
    { time: 0.01, pitch: 36, velocity: 100, midiChannel: 9, trackIndex: 1, drumName: "Bass Drum 1" }
  ],
  channels: [
    {
      trackIndex: 0,
      midiChannel: 0,
      trackName: "",
      noteEvents: [
        { time: 0.01, pitch: 60, velocity: 100 },
        { time: 0.02, pitch: 62, velocity: 110 },
        { time: 0.06, pitch: 64, velocity: 120 }
      ],
      notes: [
        { time: 0.01, duration: 0.25 },
        { time: 0.02, duration: 0.5 },
        { time: 0.06, duration: 0.75 }
      ],
      controllers: {},
      pitchBends: []
    },
    {
      trackIndex: 1,
      midiChannel: 9,
      trackName: "",
      noteEvents: [{ time: 0.01, pitch: 36, velocity: 100, drumName: "Bass Drum 1" }],
      notes: [{ time: 0.01, offTime: 0.04, duration: 0.03, pitch: 36, velocity: 100, drumName: "Bass Drum 1" }],
      controllers: {},
      pitchBends: []
    }
  ]
};

const pianoRects = context.ReOmMIDI.buildPianoRollRects(
  fakeMidi,
  {
    width: 1000,
    height: 500,
    duration: 1
  },
  {
    maxNotes: 2,
    noteHeight: 8,
    useDrumLanes: true,
    xMin: 100,
    xMax: 900,
    yMin: 400,
    yMax: 100
  }
);
assert.strictEqual(pianoRects.length, 2, "piano roll builder should respect max notes");
assert.ok(pianoRects[0].x >= 100 && pianoRects[0].x <= 900, "piano roll x should map from time");
assert.ok(pianoRects[0].width > 0, "piano roll width should map from duration");
assert.ok(pianoRects[0].opacity >= 30 && pianoRects[0].opacity <= 100, "piano roll opacity should map from velocity");

const lowPitchY = context.ReOmMIDI.pianoRollYForPitch(60, 60, 400, 8);
const highPitchY = context.ReOmMIDI.pianoRollYForPitch(64, 60, 400, 8);
assert.ok(highPitchY < lowPitchY, "higher MIDI pitch should map to a higher lane on screen");

const widthTestNotes = [
  { index: 1, time: 0, duration: 0.1, pitch: 60, velocity: 100, label: "60", isDrum: false },
  { index: 2, time: 0, duration: 0.5, pitch: 62, velocity: 100, label: "62", isDrum: false }
];
const widthRects = context.ReOmMIDI.buildPianoRollRects({ notes: widthTestNotes, durationSeconds: 1 }, fakeComp, {
  maxNotes: 2,
  noteHeight: 8,
  xMin: 0,
  xMax: 1000,
  yMin: 400,
  yMax: 100,
  timeEnd: 1
});
assert.ok(widthRects[1].width > widthRects[0].width, "longer notes should produce wider piano roll bars");

const normalizeNotes = [
  { index: 1, time: 5, duration: 0.2, pitch: 60, velocity: 100, label: "60", isDrum: false },
  { index: 2, time: 6.5, duration: 0.5, pitch: 62, velocity: 100, label: "62", isDrum: false }
];
const normalizeRects = context.ReOmMIDI.buildPianoRollRects({ notes: normalizeNotes, durationSeconds: 10 }, fakeComp, {
  maxNotes: 2,
  noteHeight: 8,
  xMin: 100,
  xMax: 900,
  yMin: 400,
  yMax: 100
});
assert.ok(
  normalizeRects[0].left >= 100 && normalizeRects[1].right <= 900,
  "normalized piano roll should trim note bounds to the available x range"
);
assert.ok(
  normalizeRects[1].right - normalizeRects[0].left > 700,
  "normalized piano roll should span most of the available width"
);

const allMidiNotes = context.ReOmMIDI.collectPianoRollNotes(fakeMidi, { maxNotes: -1 });
assert.strictEqual(allMidiNotes.length, 4, "max notes -1 should include all notes");

const workComp = new context.CompItem();
workComp.workAreaStart = 0.015;
workComp.workAreaDuration = 0.035;
const workAreaRects = context.ReOmMIDI.buildPianoRollRects(fakeMidi, workComp, {
  maxNotes: 10,
  useWorkArea: true,
  noteHeight: 8,
  useDrumLanes: true,
  xMin: 100,
  xMax: 900,
  yMin: 400,
  yMax: 100
});
assert.strictEqual(workAreaRects.length, 3, "work area filter should keep overlapping notes only");
assert.ok(
  workAreaRects.every((rect) => rect.time < 0.05 && rect.time + rect.duration > 0.015),
  "work area rects should stay inside the requested time span"
);

const workAreaLayer = createFakeLayer();
workAreaLayer.name = "MIDI T01 Ch01";
const waPitch = workAreaLayer.Effects.addProperty("Slider Control");
waPitch.name = "T01 Ch01 pitch";
waPitch.valueProperty.setValuesAtTimes([0.01, 0.5, 1.0], [60, 62, 64]);
const waVel = workAreaLayer.Effects.addProperty("Slider Control");
waVel.name = "T01 Ch01 velocity";
waVel.valueProperty.setValuesAtTimes([0, 0.01, 0.5, 1.0], [0, 100, 100, 100]);
const waDur = workAreaLayer.Effects.addProperty("Slider Control");
waDur.name = "T01 Ch01 duration";
waDur.valueProperty.setValuesAtTimes([0.01, 0.5, 1.0], [0.1, 0.1, 0.1]);
const workAreaLayerNotes = context.ReOmMIDI.collectPianoRollNotesFromLayer(workAreaLayer, {
  maxNotes: 1,
  useWorkArea: true,
  timeStart: 0.2,
  timeEnd: 0.8
});
assert.strictEqual(workAreaLayerNotes.length, 1, "work area and max notes should cap mapped notes inside the range");
assert.strictEqual(workAreaLayerNotes[0].time, 0.5, "work area note cap should keep the first in-range note");

const previewHtml = context.ReOmMIDI.buildPianoRollPreviewHtml(fakeMidi, fakeComp, {
  maxNotes: 2,
  noteHeight: 8,
  useDrumLanes: true,
  previewWidth: 1000,
  previewHeight: 500,
  sourceLabel: "fixture.mid"
});
assert.ok(previewHtml.html.indexOf("<!doctype html>") === 0, "piano roll preview should return html document");
assert.strictEqual(previewHtml.noteCount, 2, "piano roll preview should respect max notes");
assert.ok(
  previewHtml.bounds && previewHtml.bounds.right > previewHtml.bounds.left,
  "piano roll preview should include draw bounds"
);
assert.ok(previewHtml.html.indexOf("fixture.mid") >= 0, "piano roll preview should include source label");
assert.ok(previewHtml.html.indexOf("<rect") >= 0, "piano roll preview should include svg bars");

const noteOffLayer = createFakeLayer();
noteOffLayer.name = "MIDI T01 Ch01";
const noteOffPitch = noteOffLayer.Effects.addProperty("Slider Control");
noteOffPitch.name = "T01 Ch01 pitch";
noteOffPitch.valueProperty.setValuesAtTimes([0.01, 0.51], [60, 60]);
const noteOffVel = noteOffLayer.Effects.addProperty("Slider Control");
noteOffVel.name = "T01 Ch01 velocity";
noteOffVel.valueProperty.setValuesAtTimes([0, 0.01, 0.51], [0, 100, 0]);
const noteOffDur = noteOffLayer.Effects.addProperty("Slider Control");
noteOffDur.name = "T01 Ch01 duration";
noteOffDur.valueProperty.setValuesAtTimes([0.01], [0.5]);
const noteOffNotes = context.ReOmMIDI.collectPianoRollNotesFromLayer(noteOffLayer, { maxNotes: 10 });
assert.strictEqual(noteOffNotes.length, 1, "note-off pitch keyframes should not create duplicate piano roll notes");
assert.strictEqual(noteOffNotes[0].duration, 0.5, "piano roll note width should use duration slider at note-on");

context.ReOmMIDI.importMidiToComp(fakeComp, fakeMidi, {
  layerMode: "per-channel",
  layerNamePrefix: "MIDI",
  quantizeToFrames: true,
  importNamedDrumSliders: true,
  includeControllers: false,
  includePitchBends: false
});

fakeLayers[0].name = "MIDI T01 Ch01";
fakeLayers[0].index = 1;
fakeLayers[1].name = "MIDI T02 Ch10 Drums";
fakeLayers[1].index = 2;

assert.strictEqual(
  context.ReOmMIDI.channelPrefixFromLayer(fakeLayers[0]),
  "T01 Ch01",
  "layer name should expose channel prefix"
);

const aeStyleLayer = createFakeLayer();
aeStyleLayer.name = "MIDI T01 Ch01";
const aePitch = aeStyleLayer.Effects.addProperty("Slider Control");
aePitch.name = "T01 Ch01 pitch";
aePitch.valueProperty.setValuesAtTimes([0.01, 0.5], [60, 72]);
const aeVel = aeStyleLayer.Effects.addProperty("Slider Control");
aeVel.name = "T01 Ch01 velocity";
aeVel.valueProperty.setValuesAtTimes([0, 0.01, 0.5], [0, 100, 110]);
const aeDur = aeStyleLayer.Effects.addProperty("Slider Control");
aeDur.name = "T01 Ch01 duration";
aeDur.valueProperty.setValuesAtTimes([0.01, 0.5], [0.1, 0.2]);
delete aePitch.valueProperty.key;
delete aeVel.valueProperty.key;
delete aeDur.valueProperty.key;
const aeNotes = context.ReOmMIDI.collectPianoRollNotesFromLayer(aeStyleLayer, { maxNotes: 10 });
assert.strictEqual(
  aeNotes.length,
  2,
  "layer note collection should work with keyTime/keyValue when key() is unavailable"
);

const pitch = fakeLayers[0].Effects._effects["T01 Ch01 pitch"].valueProperty;
assert.deepStrictEqual(pitch.times, [0, 1 / 24], "same-frame pitch events should coalesce on frame times");
assert.deepStrictEqual(pitch.values, [62, 64], "last pitch event in a frame should win");

const kick = fakeLayers[1].Effects._effects["T02 Ch10 d36 Bass Drum 1"].valueProperty;
assert.deepStrictEqual(kick.times, [0, 1 / 24], "drum slider should use frame-quantized hit and release times");
assert.deepStrictEqual(kick.values, [100, 0], "named drum slider should pulse velocity then return to zero");

const layerNotes = context.ReOmMIDI.collectPianoRollNotesFromLayer(fakeLayers[0], { maxNotes: 10 });
assert.strictEqual(layerNotes.length, 2, "melodic layer should expose one piano-roll note per pitch keyframe");
assert.strictEqual(layerNotes[1].pitch, 64, "layer piano-roll notes should read pitch slider values");

const drumLayerNotes = context.ReOmMIDI.collectPianoRollNotesFromLayer(fakeLayers[1], {
  maxNotes: 10,
  useDrumLanes: true
});
assert.strictEqual(drumLayerNotes.length, 1, "drum layer should prefer named drum sliders over pitch duplicates");
assert.strictEqual(drumLayerNotes[0].label, "Bass Drum 1", "drum layer notes should keep GM drum labels");

assert.strictEqual(
  context.ReOmMIDI.layerHasNamedDrumSliders(fakeLayers[1]),
  true,
  "drum layer with named sliders should report named drum sliders"
);
assert.strictEqual(
  context.ReOmMIDI.layerHasNamedDrumSliders(fakeLayers[0]),
  false,
  "melodic layer should not report named drum sliders"
);

const drumPadGroups = context.ReOmMIDI.collectNamedDrumPadGroupsFromLayer(fakeLayers[1], {});
assert.strictEqual(drumPadGroups.length, 1, "named drum pad collection should create one pad group per effect");
assert.strictEqual(
  drumPadGroups[0].effectName,
  "T02 Ch10 d36 Bass Drum 1",
  "named drum pad group should retain the effect slider name"
);
assert.strictEqual(drumPadGroups[0].hits.length, 1, "named drum pad group should count velocity keyframes above zero");

const drumMachineGroups = context.ReOmMIDI.collectDrumMachinePitchGroups(fakeLayers[1], {});
assert.strictEqual(
  drumMachineGroups[0].effectName,
  "T02 Ch10 d36 Bass Drum 1",
  "drum machine should discover pads from named drum sliders"
);

const melodicDrumMachineGroups = context.ReOmMIDI.collectDrumMachinePitchGroups(fakeLayers[0], {});
assert.strictEqual(
  melodicDrumMachineGroups.length,
  2,
  "melodic layer should use pitch mode and group pads by pitch keyframes"
);
assert.strictEqual(
  melodicDrumMachineGroups[0].effectName,
  "",
  "pitch-mode drum machine pads should not use named drum effects"
);
assert.strictEqual(melodicDrumMachineGroups[0].pitch, 62, "pitch-mode drum machine should preserve MIDI pitch values");

const overlappingDrumLayer = createFakeLayer();
overlappingDrumLayer.name = "MIDI T02 Ch10 Drums";
const overlapKick = overlappingDrumLayer.Effects.addProperty("Slider Control");
overlapKick.name = "T02 Ch10 d36 Bass Drum 1";
overlapKick.valueProperty.setValuesAtTimes([0.01, 0.04, 0.2, 0.24], [100, 0, 100, 0]);
const overlapSnare = overlappingDrumLayer.Effects.addProperty("Slider Control");
overlapSnare.name = "T02 Ch10 d38 Acoustic Snare";
overlapSnare.valueProperty.setValuesAtTimes([0.1, 0.14], [90, 0]);
const overlapPitch = overlappingDrumLayer.Effects.addProperty("Slider Control");
overlapPitch.name = "T02 Ch10 pitch";
overlapPitch.valueProperty.setValuesAtTimes([0.01, 0.1, 0.2], [36, 38, 36]);
const overlapGroups = context.ReOmMIDI.collectDrumMachinePitchGroups(overlappingDrumLayer, {});
assert.strictEqual(overlapGroups.length, 2, "drum machine should create one pad per named drum slider");
assert.strictEqual(overlapGroups[0].hits.length, 2, "named drum slider should preserve multiple hits on the same pad");
assert.strictEqual(
  context.ReOmMIDI.collectDrumHitNotesFromLayer(overlappingDrumLayer, { maxNotes: -1 }).length,
  3,
  "drum hit collection should read named sliders instead of the shared pitch slider"
);

const drumPadExpression = context.ReOmMIDI.buildDrumMachinePadExpression({
  sourceLayerName: "MIDI T02 Ch10 Drums",
  drumEffectName: "T02 Ch10 d36 Bass Drum 1",
  baseValue: "0",
  amount: "100",
  duration: "0.2",
  falloff: "linear"
});
assert.ok(
  drumPadExpression.includes('var drumEffectName = "T02 Ch10 d36 Bass Drum 1"'),
  "drum pad expression should reference the named drum slider"
);
assert.ok(
  drumPadExpression.includes("midiLayer.effect(drumEffectName)"),
  "drum pad expression should read slider via drum effect name"
);
assert.ok(
  drumPadExpression.indexOf("pitchSlider") < 0 && drumPadExpression.indexOf("pitchFilter") < 0,
  "drum pad expression should not use pitch slider filtering"
);
assert.ok(drumPadExpression.includes("function latestDrumHit"), "drum pad expression should scan drum slider hits");
assert.ok(drumPadExpression.includes("var base = 0;"), "drum pad expression should emit numeric base literal");
assert.ok(drumPadExpression.includes("var amount = 100;"), "drum pad expression should emit numeric amount literal");
assert.ok(
  !/var base = undefined;/.test(drumPadExpression) && !/var amount = undefined;/.test(drumPadExpression),
  "drum pad expression should not assign undefined to base or amount"
);

const brokenPadExpression = context.ReOmMIDI.buildDrumMachinePadExpression({
  sourceLayerName: "MIDI T02 Ch10 Drums",
  drumEffectName: "T02 Ch10 d36 Bass Drum 1"
});
assert.ok(brokenPadExpression.includes("var base = 0;"), "missing base options should fall back to 0");
assert.ok(brokenPadExpression.includes("var amount = 100;"), "missing amount options should fall back to 100");
assert.ok(
  !/var base = undefined;/.test(brokenPadExpression) && !/var amount = undefined;/.test(brokenPadExpression),
  "drum pad expression with missing options should not assign undefined to base or amount"
);

const layerRects = context.ReOmMIDI.buildPianoRollRects(fakeLayers[0], fakeComp, { maxNotes: 3, noteHeight: 8 });
assert.strictEqual(layerRects.length, 2, "layer-based piano roll builder should map imported keyframes");

const selectionComp = {
  numLayers: 2,
  selectedLayers: [],
  layer(index) {
    return fakeLayers[index - 1];
  }
};
fakeLayers[0].selected = true;
assert.strictEqual(
  context.ReOmMIDI.resolveMidiSourceLayer(selectionComp).index,
  fakeLayers[0].index,
  "resolveMidiSourceLayer should use layer.selected"
);
assert.strictEqual(
  context.ReOmMIDI.resolveDrumMachineSourceLayer(selectionComp).index,
  fakeLayers[0].index,
  "drum machine should accept any imported MIDI layer"
);

const melodicLayer2 = createFakeLayer();
melodicLayer2.name = "MIDI T03 Ch02";
melodicLayer2.index = 3;
const melodicLayer2Pitch = melodicLayer2.Effects.addProperty("Slider Control");
melodicLayer2Pitch.name = "T03 Ch02 pitch";
melodicLayer2Pitch.valueProperty.setValuesAtTimes([0, 1 / 24], [60, 67]);
const melodicLayer2Vel = melodicLayer2.Effects.addProperty("Slider Control");
melodicLayer2Vel.name = "T03 Ch02 velocity";
melodicLayer2Vel.valueProperty.setValuesAtTimes([0, 1 / 24], [100, 100]);
const melodicLayer2Dur = melodicLayer2.Effects.addProperty("Slider Control");
melodicLayer2Dur.name = "T03 Ch02 duration";
melodicLayer2Dur.valueProperty.setValuesAtTimes([0, 1 / 24], [0.1, 0.1]);

const multiMelodicComp = {
  numLayers: 3,
  selectedLayers: [fakeLayers[0], melodicLayer2],
  layer(index) {
    if (index === 1) {
      return fakeLayers[0];
    }
    if (index === 2) {
      return fakeLayers[1];
    }
    if (index === 3) {
      return melodicLayer2;
    }
    throw new Error(`Missing layer index ${index}`);
  }
};

const multiMelodicLayers = context.ReOmMIDI.resolveDrumMachineSourceLayers(multiMelodicComp);
assert.strictEqual(multiMelodicLayers.length, 2, "drum machine should accept multiple non-drum MIDI layers");
const multiMelodicGroups = context.ReOmMIDI.collectDrumMachinePitchGroupsFromLayers(multiMelodicLayers, {});
assert.strictEqual(
  multiMelodicGroups.length,
  2,
  "multi-layer drum machine should create one pad group per selected layer"
);
assert.strictEqual(
  multiMelodicGroups[0].label,
  "MIDI T01 Ch01",
  "multi-layer drum machine should label pads with layer names"
);
assert.strictEqual(
  multiMelodicGroups[0].layerInstrument,
  true,
  "multi-layer drum machine groups should use per-layer instrument mode"
);
assert.strictEqual(
  multiMelodicGroups[0].hits.length,
  2,
  "per-layer drum machine pad should merge all note hits on that layer"
);
assert.strictEqual(
  multiMelodicGroups[1].hits.length,
  2,
  "per-layer drum machine pad should merge all note hits on the second layer"
);
assert.strictEqual(
  multiMelodicGroups[0].sourceRefs.length,
  1,
  "per-layer drum machine pad should reference a single source layer"
);
assert.strictEqual(
  multiMelodicGroups[0].sourceRefs[0].sourceLayerName,
  "MIDI T01 Ch01",
  "per-layer drum machine pad should retain its source layer ref"
);

const multiMelodicRects = context.ReOmMIDI.buildDrumMachineRects(multiMelodicLayers, fakeComp, {});
assert.strictEqual(multiMelodicRects.length, 2, "multi-layer drum machine should build one grid pad per layer");
assert.ok(
  multiMelodicRects.every((rect) => rect.color && rect.color.length === 3),
  "multi-layer drum machine pads should keep per-layer colors"
);
assert.ok(
  multiMelodicRects.every((rect) => rect.layerInstrument),
  "multi-layer drum machine rects should mark layer instrument mode"
);
assert.ok(
  multiMelodicRects[0].x !== multiMelodicRects[1].x || multiMelodicRects[0].y !== multiMelodicRects[1].y,
  "multi-layer drum machine pads should use grid positions"
);

function makeDrumMachineTestGroups(count) {
  const groups = [];
  let i;
  for (i = 0; i < count; i += 1) {
    groups.push({
      pitch: 36 + i,
      label: "Pad " + (i + 1),
      hits: [{ time: 0, duration: 0, velocity: 100 }]
    });
  }
  return groups;
}

const fourPadGridRects = context.ReOmMIDI.buildDrumMachineGridRects(makeDrumMachineTestGroups(4), fakeComp, {
  squareSize: 20,
  gridGap: 12,
  gridMargin: 80
});
const fourPadGridCenter = context.ReOmMIDI.computeDrumMachineGridCenter(fourPadGridRects);
assert.strictEqual(fourPadGridCenter.x, 106, "4-pad grid center X should be the bounding-box midpoint");
assert.strictEqual(fourPadGridCenter.y, 106, "4-pad grid center Y should be the bounding-box midpoint");

const fivePadGridRects = context.ReOmMIDI.buildDrumMachineGridRects(makeDrumMachineTestGroups(5), fakeComp, {
  squareSize: 20,
  gridGap: 12,
  gridMargin: 80
});
const fivePadGridCenter = context.ReOmMIDI.computeDrumMachineGridCenter(fivePadGridRects);
assert.strictEqual(fivePadGridCenter.x, 122, "5-pad grid center X should include the wider third column");
assert.strictEqual(fivePadGridCenter.y, 106, "5-pad grid center Y should match the two-row bounding box");

assert.strictEqual(
  typeof context.ReOmMIDI.computeDrumMachineGridCenter,
  "function",
  "bundle should expose drum machine grid center helper"
);

assert.strictEqual(
  context.ReOmMIDI.isMidiImportSourceLayer(fakeLayers[1]),
  true,
  "imported drum layer should still qualify as a MIDI import source"
);
const multiDrumComp = {
  numLayers: 2,
  selectedLayers: [fakeLayers[0], fakeLayers[1]],
  layer(index) {
    return fakeLayers[index - 1];
  }
};
assert.throws(
  () => context.ReOmMIDI.resolveDrumMachineSourceLayers(multiDrumComp),
  /named sliders/,
  "drum machine should reject multi-select when a named drum layer is included"
);

assert.throws(
  () => context.ReOmMIDI.resolveDrumSourceLayer(selectionComp),
  /not a drum MIDI layer/,
  "drum sequencer should still require a drum MIDI layer"
);
fakeLayers[0].selected = false;
selectionComp.selectedLayers = [fakeLayers[1]];
assert.strictEqual(
  context.ReOmMIDI.resolveMidiSourceLayer(selectionComp).index,
  fakeLayers[1].index,
  "resolveMidiSourceLayer should use comp.selectedLayers"
);
assert.strictEqual(
  context.ReOmMIDI.resolvePitchSliderName(fakeLayers[0], {}),
  "T01 Ch01 pitch",
  "should detect pitch slider from imported melodic layer"
);

context.$ = { global: {} };
context.ReOmMIDI.getGlobalState().actionSourceLayerName = "MIDI T01 Ch01";
const generatedActionLayer = createFakeLayer();
generatedActionLayer.name = "MIDI Action Pump MIDI T01 Ch01";
const rememberedSourceComp = {
  numLayers: 2,
  selectedLayers: [generatedActionLayer],
  layer(nameOrIndex) {
    if (typeof nameOrIndex === "number") {
      if (nameOrIndex === 1) {
        return fakeLayers[0];
      }
      if (nameOrIndex === 2) {
        return generatedActionLayer;
      }
      throw new Error(`Missing layer index ${nameOrIndex}`);
    }
    if (nameOrIndex === "MIDI T01 Ch01") {
      return fakeLayers[0];
    }
    throw new Error(`Missing layer ${nameOrIndex}`);
  }
};
assert.strictEqual(
  context.ReOmMIDI.resolveMidiSourceLayer(rememberedSourceComp).index,
  fakeLayers[0].index,
  "copy/null should reuse the remembered imported MIDI source when an action null is selected"
);

const pumpExpression = context.ReOmMIDI.buildMidiActionExpression({
  sourceLayerName: "MIDI T01 Ch01",
  preset: "pump",
  pitchSliderName: "T01 Ch01 pitch",
  baseValue: "value",
  amount: "20",
  duration: "0.2",
  falloff: "exponential"
});
assert.ok(pumpExpression.includes('thisComp.layer("MIDI T01 Ch01")'), "expression should reference source MIDI layer");
assert.ok(pumpExpression.includes("T01 Ch01 pitch"), "expression should reference the pitch slider");
assert.ok(pumpExpression.indexOf("drumRules") < 0, "expression should not declare drum rules");
assert.ok(pumpExpression.includes("Math.pow"), "exponential pump should use exponential falloff");
assert.ok(pumpExpression.includes("function addDelta"), "pump expression should handle scalar and vector properties");
assert.ok(
  !pumpExpression.includes("function pitchHitCountAt"),
  "pump expression should not include pitch hit counting"
);
assert.ok(pumpExpression.includes("var pitchFilter = [];"), "default expression should trigger on all notes");
assert.ok(
  pumpExpression.includes("// pitchFilter: MIDI note numbers 1-127. [] = all notes. Example: [60, 64, 67]"),
  "expression should document the pitch filter format"
);
assert.ok(pumpExpression.includes("function pitchAllowed"), "shared runtime should expose pitchAllowed helper");
assert.ok(pumpExpression.includes("function falloffFactor"), "shared runtime should expose falloffFactor");

const filteredPumpExpression = context.ReOmMIDI.buildMidiActionExpression({
  sourceLayerName: "MIDI T01 Ch01",
  preset: "pump",
  pitchSliderName: "T01 Ch01 pitch",
  pitchFilter: "60, 64, 67"
});
assert.ok(
  filteredPumpExpression.includes("var pitchFilter = [60, 64, 67];"),
  "expression should emit normalized multi-note pitch filter"
);

const allLayerTriggers = context.ReOmMIDI.collectMidiActionTriggersFromLayer(fakeLayers[0], {});
const filteredLayerTriggers = context.ReOmMIDI.collectMidiActionTriggersFromLayer(fakeLayers[0], {
  pitchFilter: [64]
});
assert.strictEqual(allLayerTriggers.length, 2, "unfiltered layer should include every pitch keyframe");
assert.strictEqual(filteredLayerTriggers.length, 1, "pitch filter should limit layer triggers");
assert.strictEqual(filteredLayerTriggers[0].value, 64, "pitch filter should keep only matching pitches");
assert.ok(pumpExpression.indexOf("hit.amount") < 0, "pump should use Amount only, not pitch map amounts");

// --- Drum channel pitch filter tests ---
const drumFilterLayer = createFakeLayer();
drumFilterLayer.name = "MIDI T03 Ch10 Drums";
const dfKick = drumFilterLayer.Effects.addProperty("Slider Control");
dfKick.name = "T03 Ch10 d36 Kick";
dfKick.valueProperty.setValuesAtTimes([0.01, 0.5], [100, 0]);
const dfSnare = drumFilterLayer.Effects.addProperty("Slider Control");
dfSnare.name = "T03 Ch10 d38 Snare";
dfSnare.valueProperty.setValuesAtTimes([0.02, 0.6], [100, 0]);
const dfHat = drumFilterLayer.Effects.addProperty("Slider Control");
dfHat.name = "T03 Ch10 d42 Hi-Hat";
dfHat.valueProperty.setValuesAtTimes([0.03, 0.7], [100, 0]);
delete dfKick.valueProperty.key;
delete dfSnare.valueProperty.key;
delete dfHat.valueProperty.key;

assert.strictEqual(
  context.ReOmMIDI.layerHasNamedDrumSliders(drumFilterLayer),
  true,
  "multi-drum layer should report named drum sliders"
);

const drumAllTriggers = context.ReOmMIDI.collectMidiActionTriggersFromLayer(drumFilterLayer, {});
assert.strictEqual(drumAllTriggers.length, 3, "unfiltered drum layer should collect triggers from all drum sliders");

const drumKickOnly = context.ReOmMIDI.collectMidiActionTriggersFromLayer(drumFilterLayer, {
  pitchFilter: [36]
});
assert.strictEqual(drumKickOnly.length, 1, "drum pitch filter should keep only matching drum slider");
assert.strictEqual(drumKickOnly[0].value, 36, "drum pitch filter should return the correct pitch");

const drumKickSnare = context.ReOmMIDI.collectMidiActionTriggersFromLayer(drumFilterLayer, {
  pitchFilter: [36, 38]
});
assert.strictEqual(drumKickSnare.length, 2, "multi-note drum pitch filter should keep matching drum sliders");

const drumExpressionFromLayer = context.ReOmMIDI.buildMidiActionExpressionFromLayer(fakeComp, drumFilterLayer, {
  preset: "pump",
  pitchFilter: "36, 42"
});
assert.ok(
  drumExpressionFromLayer.indexOf("var drumSliders") >= 0,
  "drum layer expression should emit drumSliders array"
);
assert.ok(
  drumExpressionFromLayer.indexOf("d36 Kick") >= 0,
  "drum layer expression should list kick slider in drumSliders"
);
assert.ok(
  drumExpressionFromLayer.indexOf("d42 Hi-Hat") >= 0,
  "drum layer expression should list hi-hat slider in drumSliders"
);
assert.ok(
  drumExpressionFromLayer.indexOf("pitchFilter = [36, 42]") >= 0,
  "drum layer expression should include the pitch filter"
);
assert.ok(
  drumExpressionFromLayer.indexOf("ds.name") >= 0,
  "drum layer expression runtime should iterate drum sliders by name"
);

const highMapPump = context.ReOmMIDI.simulateMidiAction(fakeMidi, {
  preset: "pump",
  previewBaseValue: 100,
  amount: 20,
  duration: 0.2,
  previewStep: 1 / 24,
  previewEndTime: 0.25,
  limitTriggers: true
});
const highMapPeak = highMapPump.points.reduce((best, point) => Math.max(best, point.value), -Infinity);
assert.strictEqual(highMapPeak, 120, "pump should ignore pitch map amounts and use Amount only");

const pitchPumpFromLayer = context.ReOmMIDI.buildMidiActionExpressionFromLayer(fakeComp, fakeLayers[0], {
  preset: "pump",
  baseValue: "value",
  amount: "20",
  duration: "0.2",
  falloff: "linear",
  useOutputSliders: false
});
assert.ok(pitchPumpFromLayer.indexOf("pitchRules") < 0, "expression should not declare pitch hit rules");
assert.ok(pitchPumpFromLayer.indexOf("T01 Ch01 pitch") >= 0, "expression should reference the source pitch slider");
assert.ok(
  pitchPumpFromLayer.indexOf("falloffFactor") >= 0,
  "pump expression should decay through shared falloffFactor helper"
);
assert.ok(
  pitchPumpFromLayer.indexOf("fitPropertyValue") >= 0,
  "pump expression should coerce output to the target property dimension"
);
assert.ok(pitchPumpFromLayer.indexOf("pitchRuleFor") < 0, "expression should not filter hits through a pitch map");

const instantExpression = context.ReOmMIDI.buildMidiActionExpression({
  sourceLayerName: "MIDI",
  preset: "pump",
  pitchSliderName: "T01 Ch01 pitch",
  falloff: "instant"
});
assert.ok(instantExpression.includes("thisComp.frameDuration"), "instant falloff should last one comp frame");

const interpolateExpression = context.ReOmMIDI.buildMidiActionExpression({
  sourceLayerName: "MIDI",
  preset: "interpolate",
  pitchSliderName: "T01 Ch01 pitch",
  baseValue: "25",
  activeValue: "100",
  falloff: "linear"
});
assert.ok(interpolateExpression.includes("function mixValue"), "interpolate expression should mix A-B values");
assert.ok(
  interpolateExpression.includes("targetForEvent"),
  "interpolate expression should alternate base and active targets"
);
assert.ok(
  interpolateExpression.includes("pitchEventTimes"),
  "interpolate expression should read pitch event times from shared helper"
);
assert.ok(
  interpolateExpression.includes("segmentProgress"),
  "interpolate expression should ramp through shared segmentProgress helper"
);
assert.ok(
  interpolateExpression.includes("fitPropertyValue"),
  "interpolate expression should coerce results to the target property dimension"
);

const splitPairExpression = context.ReOmMIDI.buildMidiActionExpression({
  preset: "interpolate",
  baseValue: "value",
  activeValue: "[-100, 100]",
  falloff: "linear"
});
assert.ok(splitPairExpression.includes("-100"), "interpolate should treat bracket pairs as scalar A/B endpoints");
assert.ok(splitPairExpression.includes("100"), "interpolate should treat bracket pairs as scalar A/B endpoints");
assert.ok(!splitPairExpression.includes("[-100, 100]"), "interpolate should not emit bracket-pair literals as vectors");

const easeExpression = context.ReOmMIDI.buildMidiActionExpression({
  sourceLayerName: "MIDI",
  preset: "pump",
  pitchSliderName: "T01 Ch01 pitch",
  falloff: "ease"
});
assert.ok(easeExpression.includes("falloffFactor"), "ease falloff should use shared falloffFactor helper");
assert.ok(easeExpression.includes("ease(t, hitTime"), "ease falloff should call After Effects ease()");

const fakeSelectedComp = new context.CompItem();
const appliedProperty = { canSetExpression: true, expression: "", expressionEnabled: false };
const skippedProperty = { canSetExpression: false, expression: "" };
fakeSelectedComp.selectedProperties = [appliedProperty, skippedProperty];
const applyResult = context.ReOmMIDI.applyExpressionToSelectedProperties(fakeSelectedComp, {
  sourceLayerName: "MIDI",
  preset: "toggle",
  baseValue: "value",
  activeValue: "[-100, 100]"
});
assert.strictEqual(applyResult.applied, 1, "one selected property should receive an expression");
assert.strictEqual(applyResult.skipped, 1, "non-expression property should be skipped");
assert.strictEqual(appliedProperty.expressionEnabled, true, "applied property should enable expression");
assert.ok(appliedProperty.expression.includes("count % 2"), "toggle expression should be assigned");
assert.ok(!appliedProperty.expression.includes("[-100, 100]"), "toggle expression should use scalar flip values");
assert.ok(
  appliedProperty.expression.includes("100"),
  "toggle expression should coerce legacy bracket pairs to a scalar active value"
);

const toggleExpression = context.ReOmMIDI.buildMidiActionExpression({
  preset: "toggle",
  useOutputSliders: false
});
assert.ok(toggleExpression.includes("-1"), "toggle expression should default to scalar active -1");
assert.ok(toggleExpression.includes("1"), "toggle expression should default to scalar base 1");
assert.ok(toggleExpression.includes("function pitchHitCountAt"), "toggle expression should include pitch hit counting");
assert.ok(!toggleExpression.includes("function latestHit"), "toggle expression should not include latestHit helper");

const toggleSliderExpression = context.ReOmMIDI.buildMidiActionExpression({
  preset: "toggle",
  useOutputSliders: true
});
assert.ok(
  toggleSliderExpression.includes('thisLayer.effect("Base")'),
  "toggle expression should read Base slider when sliderized"
);
assert.ok(
  toggleSliderExpression.includes('thisLayer.effect("Active")'),
  "toggle expression should read Active slider when sliderized"
);

const simulation = context.ReOmMIDI.simulateMidiAction(fakeMidi, {
  preset: "pump",
  previewBaseValue: 100,
  amount: 20,
  duration: 0.2,
  previewStep: 1 / 24,
  previewEndTime: 0.25
});
assert.ok(simulation.triggers.length > 0, "simulator should collect triggers");
assert.ok(simulation.points.length > 0, "simulator should produce graph points");
assert.strictEqual(simulation.triggers[0].source, "pitch", "simulator should collect pitch note-on triggers");

const easePlan = context.ReOmMIDI.buildMidiActionBakePlan(
  [{ time: 0 }, { time: 1 }],
  { value: 0 },
  { frameDuration: 0.5 },
  {
    preset: "interpolate",
    baseValue: "0",
    activeValue: "100",
    falloff: "ease"
  }
);
assert.strictEqual(easePlan.values[1], 50, "ease interpolation should produce a smooth midpoint value");

const interpolateSim = context.ReOmMIDI.simulateMidiAction(fakeMidi, {
  preset: "interpolate",
  baseValue: "25",
  activeValue: "100",
  previewStep: 1 / 24,
  previewEndTime: 0.25,
  falloff: "linear",
  limitTriggers: true,
  maxNotes: 10
});
assert.ok(interpolateSim.points.length > 0, "interpolate simulator should produce graph points");
assert.ok(
  interpolateSim.points.some((point) => point.value === 25),
  "interpolate preview should include the A endpoint"
);
assert.ok(
  interpolateSim.points.some((point) => point.value < 100 && point.value > 25),
  "interpolate preview should ramp between A and B"
);
assert.ok(
  interpolateSim.points.every((point) => !Number.isNaN(point.value)),
  "interpolate preview should not produce NaN values"
);
interpolateSim.triggers.forEach((trigger, index) => {
  const expected = index % 2 ? 100 : 25;
  const atTrigger = interpolateSim.points.find(
    (point) => Math.abs(point.time - trigger.time) < 0.00001 && point.value === expected
  );
  assert.ok(atTrigger, "interpolate preview should sample alternating A/B values at trigger time " + trigger.time);
});

const twoHitPumpPlan = context.ReOmMIDI.buildMidiActionBakePlan(
  [
    { time: 0, amount: 20 },
    { time: 1, amount: 20 }
  ],
  { value: 100 },
  { frameDuration: 1 / 24 },
  {
    preset: "pump",
    baseValue: "100",
    amount: "20",
    duration: "0.1",
    falloff: "linear",
    frameDuration: 1 / 24
  }
);
const pumpHoldIndex = twoHitPumpPlan.times.findIndex(
  (time, index) => time > 0.1 && time < 1 && twoHitPumpPlan.values[index] === 100
);
assert.ok(pumpHoldIndex >= 0, "pump bake should add a rest keyframe before the next trigger");
assert.ok(
  twoHitPumpPlan.holdAtTimes && twoHitPumpPlan.holdAtTimes.length >= 2,
  "pump bake should mark decay-end and rest segments for hold interpolation"
);
assert.ok(
  twoHitPumpPlan.holdAtTimes.some((time) => Math.abs(time - 0.1) < 0.0001),
  "pump bake should hold after each trigger window ends"
);

const pumpBakeTarget = createBakeTarget(100);
assert.ok(
  context.ReOmMIDI.applyMidiActionBakePlan(pumpBakeTarget, twoHitPumpPlan),
  "applyMidiActionBakePlan should write pump keyframes"
);
assert.ok(pumpBakeTarget.interpolationCalls.length >= 2, "pump bake should apply hold interpolation on rest segments");

function createFakeSlider(keys) {
  return {
    numKeys: keys.length,
    key(index) {
      return keys[index - 1];
    }
  };
}

function createFakeMidiSourceLayer() {
  const effects = {
    "T02 Ch10 d36 Bass Drum 1": createFakeSlider([
      { time: 0.01, value: 100 },
      { time: 0.04, value: 0 },
      { time: 0.2, value: 100 },
      { time: 0.24, value: 0 }
    ]),
    "T01 Ch01 pitch": createFakeSlider([
      { time: 0.01, value: 60 },
      { time: 0.2, value: 68 }
    ])
  };
  return {
    effect(name) {
      return function getEffectProperty() {
        if (!effects[name]) {
          throw new Error(`Missing effect ${name}`);
        }
        return effects[name];
      };
    }
  };
}

function createBakeTarget(value) {
  return {
    value,
    canSetExpression: true,
    expressionEnabled: true,
    numKeys: 0,
    times: [],
    values: [],
    interpolationCalls: [],
    setValuesAtTimes(times, values) {
      this.times = Array.prototype.slice.call(times);
      this.values = Array.prototype.slice.call(values);
      this.numKeys = times.length;
    },
    nearestKeyIndex(time) {
      var bestIndex = 1;
      var bestDistance = Infinity;
      var i;
      var distance;
      for (i = 0; i < this.times.length; i += 1) {
        distance = Math.abs(this.times[i] - time);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = i + 1;
        }
      }
      return bestIndex;
    },
    keyTime(index) {
      return this.times[index - 1];
    },
    setInterpolationTypeAtKey(index, type) {
      this.interpolationCalls.push({ index, type });
    }
  };
}

const bakeComp = new context.CompItem();
const bakeTarget = createBakeTarget(100);
bakeComp.frameDuration = 1 / 24;
bakeComp.selectedLayers = [fakeLayers[0]];
bakeComp.selectedProperties = [bakeTarget, {}];

const bakeResult = context.ReOmMIDI.bakeMidiActionToSelectedProperties(bakeComp, {
  preset: "pump",
  baseValue: "value",
  amount: "20",
  duration: "0.1",
  falloff: "linear"
});
assert.strictEqual(bakeResult.applied, 1, "one selected property should receive baked keyframes");
assert.strictEqual(bakeResult.skipped, 1, "non-keyframeable property should be skipped");
assert.strictEqual(bakeResult.triggers, 2, "pitch slider should drive bake triggers");
assert.strictEqual(bakeTarget.expressionEnabled, false, "baking should disable an existing expression");
assert.ok(bakeTarget.times.length > 2, "pump bake should sample more than just trigger points");
assert.ok(
  bakeTarget.values.some((value) => value > 100),
  "pump bake should create values above the base"
);

function createActionNullComp() {
  const createdNulls = [];
  const comp = new context.CompItem();
  comp.layers = {
    addNull() {
      const sliderProp = {
        canSetExpression: true,
        expression: "",
        expressionEnabled: false,
        numKeys: 0,
        times: [],
        values: [],
        setValue(value) {
          this.values = [value];
        },
        setValuesAtTimes(times, values) {
          this.times = Array.prototype.slice.call(times);
          this.values = Array.prototype.slice.call(values);
          this.numKeys = times.length;
        },
        setValueAtTime(time, value) {
          this.times.push(time);
          this.values.push(value);
          this.numKeys = this.times.length;
        },
        setInterpolationTypeAtKey() {}
      };
      const effectList = [];
      const layer = {
        name: "",
        comment: "",
        _effects: [],
        Effects: {
          addProperty() {
            const effect = {
              _name: "",
              property(name) {
                if (name === 1 || name === "Slider" || name === "ADBE Slider Control-0001") {
                  return sliderProp;
                }
                return null;
              }
            };
            Object.defineProperty(effect, "name", {
              get() {
                return effect._name;
              },
              set(value) {
                effect._name = value;
                layer._effects.push(value);
              }
            });
            effectList.push(effect);
            return effect;
          },
          get numProperties() {
            return effectList.length;
          },
          property(index) {
            return effectList[index - 1];
          }
        },
        _slider: sliderProp
      };
      createdNulls.push(layer);
      return layer;
    }
  };
  comp._createdNulls = createdNulls;
  return comp;
}

const actionNullComp = createActionNullComp();
const actionNullExpression = context.ReOmMIDI.createMidiActionNullWithExpression(actionNullComp, fakeLayers[0], {
  preset: "pump",
  baseValue: "100",
  amount: "20",
  duration: "0.1",
  falloff: "linear",
  maxNotes: 1,
  useWorkArea: true
});
assert.ok(actionNullExpression.layerName.indexOf("MIDI Action") === 0, "action null should be named clearly");
assert.ok(actionNullExpression.expression.includes("latestHit"), "action null should receive the generated expression");
assert.ok(
  actionNullExpression.expression.includes('thisLayer.effect("Base")'),
  "action null expression should read Base slider"
);
assert.ok(
  actionNullExpression.expression.includes('thisLayer.effect("Amount")'),
  "action null expression should read Amount slider"
);
assert.ok(
  actionNullExpression.expression.includes('thisLayer.effect("Duration")'),
  "action null expression should read Duration slider"
);
assert.strictEqual(actionNullComp._createdNulls.length, 1, "action null creator should add one null layer");
assert.deepStrictEqual(
  actionNullComp._createdNulls[0]._effects,
  ["Value", "Base", "Amount", "Duration"],
  "action null should add tuning sliders for pump"
);
assert.strictEqual(
  actionNullComp._createdNulls[0]._slider.expressionEnabled,
  true,
  "action null slider should enable the expression"
);
assert.ok(
  actionNullComp._createdNulls[0]._slider.expression.includes("latestHit"),
  "action null slider should store the expression"
);

const sharedActionOptions = {
  preset: "pump",
  baseValue: "100",
  amount: "20",
  duration: "0.1",
  falloff: "linear"
};
const copiedExpression = context.ReOmMIDI.buildMidiActionExpressionFromLayer(
  fakeComp,
  fakeLayers[0],
  sharedActionOptions
);
const nullExpressionResult = context.ReOmMIDI.createMidiActionNullWithExpression(
  createActionNullComp(),
  fakeLayers[0],
  sharedActionOptions
);
assert.ok(copiedExpression.includes('thisLayer.effect("Base")'), "copy expression should read Base slider");
assert.ok(copiedExpression.includes('thisLayer.effect("Amount")'), "copy expression should read Amount slider");
assert.ok(copiedExpression.includes('thisLayer.effect("Duration")'), "copy expression should read Duration slider");
assert.ok(
  nullExpressionResult.expression.includes('thisLayer.effect("Base")'),
  "null expression should use Base slider"
);
assert.ok(
  nullExpressionResult.expression.includes('thisLayer.effect("Amount")'),
  "null expression should use Amount slider"
);
assert.ok(
  nullExpressionResult.expression.includes('thisLayer.effect("Duration")'),
  "null expression should use Duration slider"
);
assert.strictEqual(
  copiedExpression,
  nullExpressionResult.expression,
  "copy and null expression should match when both use output sliders"
);

const actionNullBakeComp = createActionNullComp();
const actionNullBake = context.ReOmMIDI.createMidiActionNullWithBake(actionNullBakeComp, fakeLayers[0], {
  preset: "pump",
  baseValue: "100",
  amount: "20",
  duration: "0.1",
  falloff: "linear",
  limitTriggers: true,
  maxNotes: 1
});
assert.strictEqual(actionNullBake.triggers, 1, "action null bake should honor preview/bake trigger limits");
assert.ok(
  actionNullBakeComp._createdNulls[0]._slider.times.length > 1,
  "action null bake should write keyframes to the slider"
);
assert.deepStrictEqual(
  actionNullBakeComp._createdNulls[0]._effects,
  ["Value"],
  "action null bake should not add tuning sliders"
);

const layerActionSimulation = context.ReOmMIDI.simulateMidiActionFromLayer(fakeLayers[0], bakeComp, {
  preset: "pump",
  baseValue: "100",
  amount: "20",
  duration: "0.1",
  falloff: "linear",
  limitTriggers: true,
  maxNotes: 1
});
assert.strictEqual(
  layerActionSimulation.triggers.length,
  1,
  "max notes should cap layer action triggers when preview limits are enabled"
);

const unlimitedMidiTriggers = context.ReOmMIDI.collectMidiActionTriggers(fakeMidi, {});
const limitedMidiTriggers = context.ReOmMIDI.collectMidiActionTriggers(fakeMidi, {
  limitTriggers: true,
  maxNotes: 1
});
assert.ok(
  unlimitedMidiTriggers.length > limitedMidiTriggers.length,
  "expressions should ignore max notes unless preview/bake limits are enabled"
);
assert.strictEqual(limitedMidiTriggers.length, 1, "preview/bake limits should cap trigger collection");
assert.ok(layerActionSimulation.points.length > 0, "layer action simulator should produce curve points");

const actionPreviewLayout = context.ReOmMIDI.buildMidiActionPreviewLayout(fakeLayers[0], bakeComp, {
  preset: "pump",
  baseValue: "100",
  amount: "20",
  duration: "0.1",
  falloff: "linear"
});
assert.ok(actionPreviewLayout.points.length > 0, "action preview layout should include curve points");
assert.ok(actionPreviewLayout.bounds.right > actionPreviewLayout.bounds.left, "action preview bounds should span time");

const sharpHitTime = actionPreviewLayout.triggers[0].time;
const sharpHitPoint = actionPreviewLayout.points
  .filter((point) => Math.abs(point.time - sharpHitTime) < 0.00005)
  .sort((a, b) => b.value - a.value)[0];
const sharpLeadPoint = actionPreviewLayout.points
  .filter((point) => point.time <= sharpHitTime + 0.000001 && point.value < sharpHitPoint.value - 0.001)
  .sort((a, b) => b.time - a.time)[0];
const sharpPreTriggerValues = actionPreviewLayout.points
  .filter((point) => point.time < sharpHitTime - 0.000001)
  .map((point) => point.value);
assert.ok(sharpHitPoint, "pump preview should include a peak sample at the trigger");
assert.ok(sharpLeadPoint, "pump preview should include a flat sample at or before the trigger");
assert.ok(sharpHitPoint.value > sharpLeadPoint.value, "pump preview should jump up at the trigger");
if (sharpPreTriggerValues.length) {
  assert.ok(
    sharpPreTriggerValues.every((value) => value === sharpPreTriggerValues[0]),
    "pump preview should stay flat before each trigger"
  );
}

const melodicLayerPreview = context.ReOmMIDI.simulateMidiActionFromLayer(fakeLayers[0], bakeComp, {
  preset: "pump",
  baseValue: "100",
  amount: "20",
  duration: "0.1",
  falloff: "linear"
});
assert.ok(melodicLayerPreview.triggers.length > 0, "should collect triggers from the source layer pitch slider");

const trackSixLayer = createFakeLayer();
trackSixLayer.name = "MIDI6 T07 Ch05";
const trackSixPitch = trackSixLayer.Effects.addProperty("Slider Control");
trackSixPitch.name = "T07 Ch05 pitch";
trackSixPitch.valueProperty.setValuesAtTimes([0.01, 0.5], [72, 74]);
const trackSixVel = trackSixLayer.Effects.addProperty("Slider Control");
trackSixVel.name = "T07 Ch05 velocity";
trackSixVel.valueProperty.setValuesAtTimes([0, 0.01, 0.5], [0, 100, 100]);
const trackSixDur = trackSixLayer.Effects.addProperty("Slider Control");
trackSixDur.name = "T07 Ch05 duration";
trackSixDur.valueProperty.setValuesAtTimes([0.01, 0.5], [0.1, 0.1]);
assert.strictEqual(
  context.ReOmMIDI.channelPrefixFromLayer(trackSixLayer),
  "T07 Ch05",
  "track-indexed layer names should still expose channel prefix"
);
const trackSixPreview = context.ReOmMIDI.simulateMidiActionFromLayer(trackSixLayer, bakeComp, {
  preset: "pump",
  baseValue: "100",
  amount: "20",
  duration: "0.1",
  falloff: "linear"
});
assert.strictEqual(trackSixPreview.triggers.length, 2, "melodic null layers should preview from pitch keyframes");
assert.strictEqual(
  context.ReOmMIDI.resolvePitchSliderName(trackSixLayer, {}),
  "T07 Ch05 pitch",
  "should detect pitch slider on track-indexed melodic layer"
);

const instantTarget = createBakeTarget(100);
bakeComp.selectedProperties = [instantTarget];
const instantBake = context.ReOmMIDI.bakeMidiActionToSelectedProperties(bakeComp, {
  preset: "pump",
  baseValue: "value",
  amount: "20",
  duration: "0.5",
  falloff: "instant"
});
assert.strictEqual(instantBake.applied, 1, "instant pump bake should apply");
assert.ok(
  instantTarget.values.some((value) => value === 120),
  "instant pump bake should include one-frame hit value"
);
assert.ok(
  instantTarget.values.some((value) => value === 100),
  "instant pump bake should return to base"
);

const toggleTarget = createBakeTarget(1);
bakeComp.selectedLayers = [fakeLayers[0]];
bakeComp.selectedProperties = [toggleTarget];
const toggleBake = context.ReOmMIDI.bakeMidiActionToSelectedProperties(bakeComp, {
  preset: "toggle",
  baseValue: "1",
  activeValue: "-1"
});
assert.strictEqual(toggleBake.applied, 1, "toggle bake should apply");
assert.ok(
  toggleTarget.values.some((value) => value === -1),
  "toggle bake should flip to the scalar active value after a trigger"
);
assert.strictEqual(
  toggleTarget.values[toggleTarget.values.length - 1],
  1,
  "toggle bake should end on the scalar base value"
);
assert.ok(toggleTarget.interpolationCalls.length > 0, "toggle bake should set hold interpolation");

const interpolateTarget = createBakeTarget(100);
bakeComp.selectedLayers = [fakeLayers[0]];
bakeComp.selectedProperties = [interpolateTarget];
const interpolateBake = context.ReOmMIDI.bakeMidiActionToSelectedProperties(bakeComp, {
  preset: "interpolate",
  baseValue: "value",
  activeValue: "200",
  falloff: "linear"
});
assert.strictEqual(interpolateBake.applied, 1, "interpolate bake should apply");
assert.ok(
  interpolateTarget.values.some((value) => value === 100),
  "interpolate bake should include base value"
);
assert.strictEqual(
  interpolateTarget.values[interpolateTarget.values.length - 1],
  200,
  "interpolate bake should hold the final target value"
);

const interpolateScalarTarget = createBakeTarget(100);
bakeComp.selectedProperties = [interpolateScalarTarget];
const interpolateVectorBake = context.ReOmMIDI.bakeMidiActionToSelectedProperties(bakeComp, {
  preset: "interpolate",
  baseValue: "value",
  activeValue: "[-100, 100]",
  falloff: "linear"
});
assert.strictEqual(interpolateVectorBake.applied, 1, "interpolate bake should apply to 1D properties");
assert.ok(
  interpolateScalarTarget.values.some((value) => value === -100),
  "interpolate bake should split legacy bracket pairs into scalar A/B endpoints on 1D properties"
);
assert.ok(
  interpolateScalarTarget.values.every((value) => typeof value === "number" && !Number.isNaN(value)),
  "interpolate bake should only write scalar keyframes to 1D properties"
);

function createShapePropertyGroup() {
  return {
    values: {},
    children: [],
    value: undefined,
    expression: "",
    expressionEnabled: false,
    canSetExpression: true,
    get numProperties() {
      return this.children.length;
    },
    setValue(value) {
      this.value = value;
    },
    property(name) {
      if (!this.values[name]) {
        this.values[name] = createShapePropertyGroup();
      }
      return this.values[name];
    },
    addProperty(name) {
      const child = createShapePropertyGroup();
      child.name = name;
      child.matchName = name;
      this.children.push(child);
      this.values[name] = child;
      return child;
    }
  };
}

function createShapeLayer() {
  const root = createShapePropertyGroup();
  const transform = createShapePropertyGroup();
  return {
    name: "",
    comment: "",
    parent: null,
    property(nameOrIndex) {
      if (nameOrIndex === "ADBE Root Vectors Group") return root;
      if (nameOrIndex === "ADBE Transform Group") return transform;
      if (typeof nameOrIndex === "number") {
        return root.children[nameOrIndex - 1] || createShapePropertyGroup();
      }
      return createShapePropertyGroup();
    },
    _root: root,
    _transform: transform
  };
}

const mapLayers = [];
const mapControllers = [];
const mapComp = new context.CompItem();
mapComp.width = 1000;
mapComp.height = 500;
mapComp.duration = 1;
mapComp.layers = {
  addNull() {
    const layer = createFakeLayer();
    mapControllers.push(layer);
    return layer;
  },
  addShape() {
    const layer = createShapeLayer();
    mapLayers.push(layer);
    return layer;
  }
};
mapComp.layer = function (name) {
  let i;
  for (i = 0; i < mapControllers.length; i += 1) {
    if (mapControllers[i].name === name) {
      return mapControllers[i];
    }
  }
  throw new Error("missing layer " + name);
};
const mapResult = context.ReOmMIDI.createPianoRollMapLayers(mapComp, fakeLayers[0], {
  maxNotes: 3,
  noteHeight: 9,
  useDrumLanes: true
});
assert.strictEqual(mapResult.created, 2, "piano roll AE creator should create capped note layers");
assert.strictEqual(mapResult.notes, 2, "piano roll AE creator should report mapped note count");
assert.ok(mapControllers.length >= 1, "piano roll AE creator should create a controller null");
assert.ok(
  mapResult.controller && mapResult.controller.indexOf("MIDI Piano Roll") === 0,
  "controller null should be named clearly"
);
assert.strictEqual(mapLayers[0].parent, mapControllers[0], "note layers should parent to the controller null");
assert.ok(mapLayers[0].name.indexOf("MIDI Note") === 0, "piano roll layer should be named clearly");
assert.ok(mapLayers[0].comment.includes("velocity"), "piano roll layer comment should include metadata");
const noteOpacity = mapLayers[0]._transform.property("ADBE Opacity");
assert.ok(noteOpacity.expression.indexOf("thisLayer.parent") >= 0, "note opacity should follow controller via parent");

assert.strictEqual(
  typeof context.ReOmMIDI.createDrumMachineShapes,
  "function",
  "bundle should expose drum machine shape creator"
);

const drumMachineControllers = [];
const drumMachineLayers = [];
const drumMachineComp = new context.CompItem();
drumMachineComp.width = 1000;
drumMachineComp.height = 500;
drumMachineComp.duration = 1;
drumMachineComp.frameDuration = 1 / 24;
drumMachineComp.layers = {
  addNull() {
    const layer = createFakeLayer();
    drumMachineControllers.push(layer);
    return layer;
  },
  addShape() {
    const layer = createShapeLayer();
    drumMachineLayers.push(layer);
    return layer;
  }
};
const singleMelodicDrumResult = context.ReOmMIDI.createDrumMachineShapes(drumMachineComp, fakeLayers[0], {
  useExpression: true
});
assert.ok(singleMelodicDrumResult.created >= 1, "drum machine should create shape layers from a melodic layer");
assert.ok(drumMachineControllers.length >= 1, "drum machine should create a controller null");
assert.ok(
  drumMachineControllers[0].comment.includes("Source: MIDI T01 Ch01"),
  "drum machine controller comment should name the single source layer"
);
assert.ok(
  drumMachineControllers[0].comment.indexOf("undefined") < 0,
  "drum machine controller comment should not contain undefined source label"
);
const drumMachineGridRects = context.ReOmMIDI.buildDrumMachineRects(fakeLayers[0], drumMachineComp, {});
const drumMachineGridCenter = context.ReOmMIDI.computeDrumMachineGridCenter(drumMachineGridRects);
const drumMachineControllerPosition = drumMachineControllers[0]._transform._values.position;
assert.ok(drumMachineControllerPosition, "drum machine controller should expose a Position transform");
assert.strictEqual(
  drumMachineControllerPosition.value[0],
  drumMachineGridCenter.x,
  "drum machine controller null should sit at the grid center X"
);
assert.strictEqual(
  drumMachineControllerPosition.value[1],
  drumMachineGridCenter.y,
  "drum machine controller null should sit at the grid center Y"
);

const drumLayerControllers = [];
const drumLayerPads = [];
const drumLayerComp = new context.CompItem();
drumLayerComp.width = 1000;
drumLayerComp.height = 500;
drumLayerComp.duration = 1;
drumLayerComp.frameDuration = 1 / 24;
drumLayerComp.layers = {
  addNull() {
    const layer = createFakeLayer();
    drumLayerControllers.push(layer);
    return layer;
  },
  addShape() {
    const layer = createShapeLayer();
    drumLayerPads.push(layer);
    return layer;
  }
};
const singleDrumLayerResult = context.ReOmMIDI.createDrumMachineShapes(drumLayerComp, fakeLayers[1], {
  useExpression: true
});
assert.ok(singleDrumLayerResult.created >= 1, "drum machine should create shape layers from a drum layer");
assert.ok(
  drumLayerControllers[0].comment.includes("Source: MIDI T02 Ch10 Drums"),
  "drum machine controller comment should name the drum source layer"
);

const multiDrumMachineControllers = [];
const multiDrumMachinePads = [];
const multiDrumMachineComp = new context.CompItem();
multiDrumMachineComp.width = 1000;
multiDrumMachineComp.height = 500;
multiDrumMachineComp.duration = 1;
multiDrumMachineComp.frameDuration = 1 / 24;
multiDrumMachineComp.layers = {
  addNull() {
    const layer = createFakeLayer();
    multiDrumMachineControllers.push(layer);
    return layer;
  },
  addShape() {
    const layer = createShapeLayer();
    multiDrumMachinePads.push(layer);
    return layer;
  }
};
const multiLayerDrumResult = context.ReOmMIDI.createDrumMachineShapes(multiDrumMachineComp, multiMelodicLayers, {
  useExpression: true
});
assert.ok(multiLayerDrumResult.created >= 1, "drum machine should create shape layers from multiple melodic layers");
assert.strictEqual(multiLayerDrumResult.types, 2, "multi-layer drum machine should create one pad per selected layer");
assert.ok(
  multiDrumMachineControllers[0].comment.includes("Source: MIDI T01 Ch01, MIDI T03 Ch02"),
  "multi-layer drum machine controller comment should list all source layers"
);
assert.ok(
  multiDrumMachineControllers[0].comment.indexOf("undefined") < 0,
  "multi-layer drum machine controller comment should not contain undefined source label"
);

assert.strictEqual(
  typeof context.ReOmMIDI.buildMidiMapExpression,
  "function",
  "bundle should expose MIDI Map expression builder"
);
assert.strictEqual(
  typeof context.ReOmMIDI.prepareMidiMapExpression,
  "function",
  "bundle should expose MIDI Map preparation"
);
assert.strictEqual(
  typeof context.ReOmMIDI.createMidiMapTextLayer,
  "function",
  "bundle should expose MIDI Map text layer creator"
);
assert.strictEqual(typeof context.ReOmMIDI.noteNameForPitch, "function", "bundle should expose note name lookup");
assert.strictEqual(context.ReOmMIDI.noteNameForPitch(60), "C4", "note name lookup should return standard pitch names");
assert.strictEqual(context.ReOmMIDI.noteNameForPitch(999), "999", "note name lookup should fall back to pitch number");

const pitchRange = context.ReOmMIDI.collectPitchValuesFromLayer(fakeLayers[0], {});
assert.ok(pitchRange.pitches.length >= 2, "pitch range detection should collect unique pitch slider values");
assert.ok(pitchRange.min <= pitchRange.max, "pitch range should report min and max");

const midiMapPrepared = context.ReOmMIDI.prepareMidiMapExpression(fakeComp, fakeLayers[0], {
  labelMode: "notes"
});
assert.ok(
  midiMapPrepared.expression.includes("Generated by ReOm MIDI Map"),
  "MIDI Map expression should include header"
);
assert.ok(midiMapPrepared.expression.includes("labelForPitch"), "MIDI Map expression should resolve labels at runtime");
assert.ok(midiMapPrepared.range.pitches.length >= 2, "MIDI Map preparation should detect pitches");

const explicitNoteLabels = context.ReOmMIDI.buildMidiMapDefaultLabels([60, 68], "notes");
assert.strictEqual(explicitNoteLabels[0][1], "C4", "note label defaults should use midi-note-freq names");
assert.strictEqual(explicitNoteLabels[1][1], "G#4/Ab4", "note label defaults should use midi-note-freq names");

const drumLabels = context.ReOmMIDI.buildMidiMapDefaultLabels([36, 42], "drums");
assert.strictEqual(drumLabels[0][1], context.ReOmMIDI.GM_DRUM_NAMES[36], "drum label mode should use GM drum names");
assert.strictEqual(drumLabels[1][1], context.ReOmMIDI.GM_DRUM_NAMES[42], "drum label mode should use GM drum names");

const parsedLabels = context.ReOmMIDI.parseMidiMapNoteLabelsFromExpression(midiMapPrepared.expression);
assert.ok(
  parsedLabels && parsedLabels.length === midiMapPrepared.noteLabels.length,
  "MIDI Map parser should read note labels from expression text"
);
assert.strictEqual(
  parsedLabels[0][0],
  midiMapPrepared.noteLabels[0][0],
  "MIDI Map parser should preserve pitch numbers"
);

const textLayers = [];
const textComp = new context.CompItem();
textComp.layers = {
  addText() {
    const sourceText = {
      canSetExpression: true,
      expression: "",
      expressionEnabled: false
    };
    const layer = {
      name: "",
      comment: "",
      property(name) {
        if (name === "ADBE Text Document" || name === "Source Text") {
          return sourceText;
        }
        return null;
      },
      _sourceText: sourceText
    };
    textLayers.push(layer);
    return layer;
  }
};
const textResult = context.ReOmMIDI.createMidiMapTextLayer(textComp, fakeLayers[0], midiMapPrepared.expression);
assert.strictEqual(textResult.layerName.indexOf("MIDI Map"), 0, "MIDI Map text layer should be named clearly");
assert.ok(
  textLayers[0]._sourceText.expression.includes("noteLabels"),
  "MIDI Map text layer should store the expression"
);
assert.strictEqual(
  textLayers[0]._sourceText.expressionEnabled,
  true,
  "MIDI Map text layer should enable the expression"
);

assert.strictEqual(
  context.ReOmMIDI.frequencyForPitch(60),
  261.63,
  "A4/C4 frequency lookup should match baked midi-note-freq data"
);
assert.strictEqual(
  context.ReOmMIDI.frequencyForPitch(69),
  440,
  "A4 frequency lookup should match baked midi-note-freq data"
);

const tonePlan = context.ReOmMIDI.buildToneLayerKeyframePlan(
  [
    { time: 1, duration: 0.5, pitch: 60, velocity: 127 },
    { time: 1.2, duration: 0.5, pitch: 72, velocity: 64 }
  ],
  { level: 100 }
);
assert.ok(tonePlan.frequency.values.indexOf(261.63) >= 0, "tone plan should include C4 frequency");
assert.ok(
  tonePlan.frequency.values.indexOf(523.25) >= 0,
  "tone plan should include C5 frequency when a higher note takes over"
);
assert.ok(tonePlan.level.values.indexOf(100) >= 0, "tone plan should use the configured level while a note is active");
assert.strictEqual(
  tonePlan.level.values.indexOf(50.393700787401575),
  -1,
  "tone plan should ignore MIDI velocity when setting level"
);
assert.strictEqual(
  tonePlan.level.values[tonePlan.level.values.length - 1],
  0,
  "tone plan should end silent after the last note off"
);

const toneLayers = [];
const toneComp = new context.CompItem();
toneComp.frameDuration = 1 / 24;
toneComp.layers = {
  addNull() {
    const layer = createFakeLayer();
    toneLayers.push(layer);
    return layer;
  }
};
const toneResult = context.ReOmMIDI.createToneLayer(toneComp, fakeLayers[0], {
  waveform: "Triangle",
  level: "80"
});
assert.strictEqual(toneResult.notes, 2, "tone layer creation should bake all collected notes");
assert.ok(toneResult.layerName.indexOf("MIDI Tone") === 0, "tone layer should be named clearly");
const toneEffect = toneLayers[0].Effects._effects.Tone;
assert.ok(toneEffect, "tone layer should add a Tone effect");
assert.deepStrictEqual(
  toneEffect.toneProperties["Frequency 1"].values,
  toneEffect.toneProperties["Frequency 5"].values,
  "all Tone frequency properties should share the same baked values"
);
assert.ok(toneEffect.toneProperties.Level.values.length >= 2, "tone layer should bake level keyframes");

const horizontalFlipExpression = context.ReOmMIDI.buildScreenFlipExpression({
  sourceLayerName: "MIDI T01 Ch01",
  pitchSliderName: "T01 Ch01 pitch",
  screenFlipAxis: "horizontal",
  screenFlipDimensions: 2
});
assert.ok(horizontalFlipExpression.includes("out[0]"), "horizontal screen flip should target Scale X");
assert.ok(horizontalFlipExpression.includes("count % 2"), "screen flip should use toggle behavior");

const verticalFlipExpression = context.ReOmMIDI.buildScreenFlipExpression({
  sourceLayerName: "MIDI T01 Ch01",
  pitchSliderName: "T01 Ch01 pitch",
  screenFlipAxis: "vertical",
  screenFlipDimensions: 1
});
assert.ok(verticalFlipExpression.includes("Math.abs(value)"), "1D screen flip should preserve magnitude from value");

function createFakeScaleLayer(scaleValue) {
  const scaleProperty = createBakeTarget(Array.isArray(scaleValue) ? scaleValue.slice() : [scaleValue, scaleValue]);
  scaleProperty.matchName = "ADBE Scale";
  scaleProperty.name = "Scale";
  const layer = createFakeLayer();
  layer.name = "Screen Flip Target";
  const transformGroup = {
    propertyDepth: 1,
    property(propName) {
      if (propName === "ADBE Scale" || propName === "Scale") {
        return scaleProperty;
      }
      return null;
    },
    propertyGroup() {
      return layer;
    }
  };
  scaleProperty.propertyDepth = 2;
  scaleProperty.propertyGroup = function propertyGroup() {
    return transformGroup;
  };
  layer.property = function property(name) {
    if (name === "ADBE Transform Group") {
      return transformGroup;
    }
    return null;
  };
  layer._scaleProperty = scaleProperty;
  return layer;
}

const screenFlipTargetLayer = createFakeScaleLayer([100, 100]);
const screenFlipComp = new context.CompItem();
screenFlipComp.frameDuration = 1 / 24;
screenFlipComp.selectedLayers = [fakeLayers[0]];
screenFlipComp.selectedProperties = [screenFlipTargetLayer._scaleProperty];

const screenFlipApplyResult = context.ReOmMIDI.applyScreenFlip(screenFlipComp, "horizontal", {
  maxNotes: 10
});
assert.strictEqual(
  screenFlipApplyResult.sourceLayerName,
  "MIDI T01 Ch01",
  "screen flip apply should use the MIDI source layer"
);
assert.strictEqual(
  screenFlipApplyResult.targetLayerName,
  "Screen Flip Target",
  "screen flip apply should target the non-MIDI layer"
);
assert.ok(
  screenFlipTargetLayer._scaleProperty.expression.includes("out[0]"),
  "screen flip apply should write a horizontal expression"
);

const screenFlipBakeTarget = createFakeScaleLayer([100, 100]);
const screenFlipBakeComp = new context.CompItem();
screenFlipBakeComp.frameDuration = 1 / 24;
screenFlipBakeComp.selectedLayers = [fakeLayers[0]];
screenFlipBakeComp.selectedProperties = [screenFlipBakeTarget._scaleProperty];
const screenFlipBakeResult = context.ReOmMIDI.bakeScreenFlip(screenFlipBakeComp, "horizontal", {
  maxNotes: 10
});
assert.strictEqual(screenFlipBakeResult.triggers, 2, "screen flip bake should use MIDI pitch triggers");
assert.ok(
  screenFlipBakeTarget._scaleProperty.values.some((value) => Array.isArray(value) && value[0] === -100),
  "screen flip bake should flip Scale X to the negative magnitude"
);
assert.ok(
  screenFlipBakeTarget._scaleProperty.interpolationCalls.length > 0,
  "screen flip bake should set hold interpolation"
);

assert.strictEqual(
  typeof context.ReOmMIDI.prepareDrumSequencerExpression,
  "function",
  "bundle should expose drum sequencer preparation"
);

const drumSeqNamed = context.ReOmMIDI.prepareDrumSequencerExpression(fakeComp, overlappingDrumLayer, {});
assert.strictEqual(drumSeqNamed.frameEntries.length, 2, "named drum sequencer should map one entry per pad");
assert.strictEqual(drumSeqNamed.frameEntries[0].startFrame, 11, "first drum pad should default to kick zone start");
assert.strictEqual(drumSeqNamed.frameEntries[0].endFrame, 30, "first drum pad should default to a 20-frame block");
assert.strictEqual(
  drumSeqNamed.frameEntries[1].startFrame,
  33,
  "second drum pad should increment by block size plus gap"
);
assert.strictEqual(drumSeqNamed.frameEntries[1].endFrame, 52, "second drum pad should get the next 20-frame block");
assert.ok(
  drumSeqNamed.expression.includes("startFrame: 11, endFrame: 30"),
  "named drum sequencer expression should emit incrementing frame defaults"
);

const legacyDrumLayer = createFakeLayer();
legacyDrumLayer.name = "MIDI T02 Ch10 Drums";
const legacyPitch = legacyDrumLayer.Effects.addProperty("Slider Control");
legacyPitch.name = "T02 Ch10 pitch";
legacyPitch.valueProperty.setValuesAtTimes([0.01, 0.1, 0.2], [36, 38, 42]);
const legacyDur = legacyDrumLayer.Effects.addProperty("Slider Control");
legacyDur.name = "T02 Ch10 duration";
legacyDur.valueProperty.setValuesAtTimes([0.01, 0.1, 0.2], [0.05, 0.05, 0.05]);
const drumSeqLegacy = context.ReOmMIDI.prepareDrumSequencerExpression(fakeComp, legacyDrumLayer, {});
assert.strictEqual(drumSeqLegacy.frameEntries.length, 3, "legacy drum sequencer should map one entry per pitch");
assert.strictEqual(
  drumSeqLegacy.frameEntries[0].startFrame,
  11,
  "legacy pitch map should default first pitch to kick zone"
);
assert.strictEqual(
  drumSeqLegacy.frameEntries[2].startFrame,
  55,
  "legacy pitch map should increment defaults for each pitch"
);
assert.ok(
  drumSeqLegacy.expression.includes("42: { startFrame: 55, endFrame: 74"),
  "legacy drum sequencer expression should emit incrementing pitch map defaults"
);

function drumSequencerRangesOverlap(entries) {
  for (let i = 0; i < entries.length - 1; i += 1) {
    if (entries[i].endFrame >= entries[i + 1].startFrame) {
      return true;
    }
  }
  return false;
}

function assertDrumSequencerRangesExclusive(entries, label) {
  for (let i = 0; i < entries.length - 1; i += 1) {
    assert.ok(
      entries[i].endFrame < entries[i + 1].startFrame,
      label +
        " pad " +
        i +
        " endFrame " +
        entries[i].endFrame +
        " should be before pad " +
        (i + 1) +
        " startFrame " +
        entries[i + 1].startFrame
    );
  }
}

assert.strictEqual(
  drumSequencerRangesOverlap(drumSeqNamed.frameEntries),
  false,
  "default named pads should not overlap"
);
assertDrumSequencerRangesExclusive(drumSeqNamed.frameEntries, "default named");
assert.strictEqual(
  drumSequencerRangesOverlap(drumSeqLegacy.frameEntries),
  false,
  "default legacy pads should not overlap"
);
assertDrumSequencerRangesExclusive(drumSeqLegacy.frameEntries, "default legacy");

assert.strictEqual(
  context.ReOmMIDI.frameRangeForPadIndex(0, 4, 100).startFrame,
  0,
  "even division should start first pad at frame 0"
);
assert.strictEqual(
  context.ReOmMIDI.frameRangeForPadIndex(0, 4, 100).endFrame,
  24,
  "even division should give first pad 25 frames when total is 100 across 4 pads"
);
assert.strictEqual(
  context.ReOmMIDI.frameRangeForPadIndex(3, 4, 100).startFrame,
  75,
  "even division should place last pad after prior slices"
);
assert.strictEqual(
  context.ReOmMIDI.frameRangeForPadIndex(3, 4, 100).endFrame,
  99,
  "even division should end last pad at totalFrames - 1"
);
assert.strictEqual(
  context.ReOmMIDI.frameRangeForPadIndex(1, 2, 0).startFrame,
  33,
  "total frames 0 should fall back to incrementing defaults"
);

const drumSeqEvenNamed = context.ReOmMIDI.prepareDrumSequencerExpression(fakeComp, overlappingDrumLayer, {
  totalFrames: 100
});
assert.strictEqual(
  drumSeqEvenNamed.frameEntries[0].startFrame,
  0,
  "named sequencer with total frames should start pad 0 at 0"
);
assert.strictEqual(
  drumSeqEvenNamed.frameEntries[0].endFrame,
  49,
  "named sequencer with 2 pads and 100 frames should split evenly"
);
assert.strictEqual(
  drumSeqEvenNamed.frameEntries[1].startFrame,
  50,
  "named sequencer second pad should start after first slice"
);
assert.strictEqual(
  drumSeqEvenNamed.frameEntries[1].endFrame,
  99,
  "named sequencer second pad should end at last frame"
);
assert.strictEqual(
  drumSequencerRangesOverlap(drumSeqEvenNamed.frameEntries),
  false,
  "even named pads should not overlap"
);
assertDrumSequencerRangesExclusive(drumSeqEvenNamed.frameEntries, "even named");

const drumSeqEvenLegacy = context.ReOmMIDI.prepareDrumSequencerExpression(fakeComp, legacyDrumLayer, {
  totalFrames: 100
});
assert.strictEqual(
  drumSeqEvenLegacy.frameEntries[0].startFrame,
  0,
  "legacy sequencer with total frames should start first pitch at 0"
);
assert.strictEqual(
  drumSeqEvenLegacy.frameEntries[0].endFrame,
  33,
  "legacy sequencer with 3 pitches and 100 frames should give first pad 34 frames"
);
assert.strictEqual(
  drumSeqEvenLegacy.frameEntries[2].endFrame,
  99,
  "legacy sequencer last pitch should end at totalFrames - 1"
);
assert.strictEqual(
  drumSequencerRangesOverlap(drumSeqEvenLegacy.frameEntries),
  false,
  "even legacy pads should not overlap"
);
assertDrumSequencerRangesExclusive(drumSeqEvenLegacy.frameEntries, "even legacy");

for (let i = 0; i < 3; i += 1) {
  const evenRange = context.ReOmMIDI.frameRangeForPadIndex(i, 3, 100);
  const defaultRange = context.ReOmMIDI.frameRangeForPadIndex(i, 3, 0);
  if (i > 0) {
    const prevEven = context.ReOmMIDI.frameRangeForPadIndex(i - 1, 3, 100);
    const prevDefault = context.ReOmMIDI.frameRangeForPadIndex(i - 1, 3, 0);
    assert.ok(prevEven.endFrame < evenRange.startFrame, "frameRangeForPadIndex even slices should not overlap");
    assert.ok(
      prevDefault.endFrame < defaultRange.startFrame,
      "frameRangeForPadIndex default slices should not overlap"
    );
  }
}

const preservedEvenNamed = context.ReOmMIDI.prepareDrumSequencerExpression(fakeComp, overlappingDrumLayer, {
  totalFrames: 100,
  previousTotalFrames: 100,
  existingExpression: drumSeqEvenNamed.expression.replace("startFrame: 0", "startFrame: 5")
});
assert.strictEqual(
  preservedEvenNamed.frameEntries[0].startFrame,
  5,
  "unchanged total frames should preserve user-edited frame ranges from the expression"
);

console.log("Bundle smoke test passed.");
