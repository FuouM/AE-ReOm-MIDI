const fs = require("fs");
const path = require("path");
const vm = require("vm");

const { root, readSource, FIXTURE_FILES } = require("./source-loader");
const testMidiDir = path.join(root, "test_midis");
const sourceFiles = ["dist/compiled/core/namespace.jsx", "dist/compiled/core/midi-file.jsx"];

const context = { console };
context.global = context;
vm.createContext(context);

sourceFiles.forEach((file) => {
  vm.runInContext(readSource(file), context, { filename: file });
});

console.log("Starting MIDI Parser Benchmark (100 iterations per file)...");
FIXTURE_FILES.forEach((fileName) => {
  const midiPath = path.join(testMidiDir, fileName);
  const data = fs.readFileSync(midiPath).toString("latin1");

  // Warmup
  new context.ReOmMIDI.MidiFile(data, midiPath);

  const start = Date.now();
  const iterations = 100;
  for (let i = 0; i < iterations; i++) {
    new context.ReOmMIDI.MidiFile(data, midiPath);
  }
  const end = Date.now();
  const avg = (end - start) / iterations;
  console.log(`- ${fileName}: avg ${avg.toFixed(3)} ms per parse (total ${end - start} ms)`);
});
