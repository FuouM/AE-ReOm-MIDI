const fs = require("fs");
const path = require("path");

const { root } = require("./source-loader");
const { createPreviewContext } = require("./create-preview-context");

const context = createPreviewContext();

const midiPath = process.argv[2]
  ? path.resolve(root, process.argv[2])
  : path.join(root, "test_midis", "Coolest MIDI.mid");
const outputPath = path.join(root, "dist", "midi-map-preview.html");
const midi = new context.ReOmMIDI.MidiFile(fs.readFileSync(midiPath).toString("latin1"), midiPath);
const svgWidth = 1400;
const svgHeight = 760;
const preview = context.ReOmMIDI.buildPianoRollPreviewHtml(
  midi,
  {
    width: svgWidth,
    height: svgHeight,
    duration: midi.durationSeconds
  },
  {
    maxNotes: 1800,
    noteHeight: 5,
    useDrumLanes: true,
    previewWidth: svgWidth,
    previewHeight: svgHeight,
    sourceLabel: path.basename(midiPath)
  }
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, preview.html, "utf8");
console.log(`Wrote ${path.relative(root, outputPath)} with ${preview.noteCount} note bars.`);
