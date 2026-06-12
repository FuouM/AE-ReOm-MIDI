const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const {
  root,
  VERSION,
  readSource,
  FIXTURE_FILES,
  PRIMARY_FIXTURE,
  TEMPO_FIXTURE,
  PITCH_BEND_FIXTURE,
  LARGE_FIXTURE
} = require("./source-loader");
const TEST_MIDIS_DIR = path.join(root, "test_midis");
const LARGE_FIXTURE_MAX_PARSE_MS = 2000;

const context = {
  console
};
context.global = context;
vm.createContext(context);

["src/core/namespace.jsx", "src/core/midi-file.jsx", "src/ae/keyframes.jsx", "src/ae/timing-layers.jsx"].forEach(
  (relativePath) => {
    vm.runInContext(readSource(relativePath), context, { filename: relativePath });
  }
);

assert.strictEqual(context.ReOmMIDI.VERSION, VERSION, "api.VERSION should match package.json");

function fixturePath(fileName) {
  return path.join(TEST_MIDIS_DIR, fileName);
}

function loadMidiFile(fileName, options) {
  const midiPath = fixturePath(fileName);
  const data = fs.readFileSync(midiPath).toString("latin1");
  const bytes = fs.statSync(midiPath).size;
  const parseStarted = Date.now();
  const midi = new context.ReOmMIDI.MidiFile(data, midiPath);
  const parseMs = Date.now() - parseStarted;

  return {
    midi,
    midiPath,
    bytes,
    parseMs: options && options.recordParseMs ? parseMs : undefined
  };
}

function byteLength(value) {
  return encodeURIComponent(String(value || "")).replace(/%[A-F0-9]{2}/g, "x").length;
}

function sortedTempoEvents(midi) {
  return midi.tempoEvents.slice().sort((a, b) => a.ticks - b.ticks);
}

function sortedTimeSignatures(midi) {
  return midi.timeSignatures.slice().sort((a, b) => a.ticks - b.ticks);
}

function collectEventCounts(midi) {
  const channels = midi.channels.filter(Boolean);
  const controllerTypes = {};
  let pitchBends = 0;
  let controllers = 0;

  channels.forEach((channel) => {
    pitchBends += channel.pitchBends.length;
    Object.keys(channel.controllers).forEach((cc) => {
      const count = channel.controllers[cc].length;
      controllers += count;
      controllerTypes[cc] = (controllerTypes[cc] || 0) + count;
    });
  });

  return {
    pitchBends,
    controllers,
    controllerTypes,
    activeChannels: channels.length
  };
}

function collectPitchBends(midi) {
  const bends = [];

  midi.channels.filter(Boolean).forEach((channel) => {
    channel.pitchBends.forEach((bend) => {
      bends.push({
        channel: channel.midiChannel + 1,
        time: bend.time,
        value: bend.value
      });
    });
  });

  return bends;
}

function assertPitchBendFixture(midi, midiPath, label) {
  const bends = collectPitchBends(midi);
  const channels = Array.from(new Set(bends.map((bend) => bend.channel)));
  const values = bends.map((bend) => bend.value);
  const report = context.ReOmMIDI.buildMidiFileInfoReport(midi, midiPath);

  assert.ok(bends.length >= 2000, label + " should contain many pitch bend events");
  assert.ok(channels.length >= 8, label + " should spread pitch bends across multiple channels");
  assert.ok(Math.max(...values) <= 0, label + " pitch bends should stay in a simple downward range");
  assert.ok(Math.min(...values) >= -8192, label + " pitch bends should remain in MIDI range");
  assert.ok(report.indexOf("Pitch bends") >= 0, label + " MIDI info report should list pitch bends");
}

function assertAdvancedControllerFixture(midi, label) {
  const counts = collectEventCounts(midi);
  const bends = collectPitchBends(midi);

  assert.ok(counts.controllerTypes["11"] >= 50, label + " should include expression (CC 11) events");
  assert.ok(counts.controllerTypes["91"] >= 1, label + " should include reverb (CC 91) events");
  assert.ok(
    counts.pitchBends > 0 && counts.pitchBends < 50,
    label + " should keep pitch bends sparse compared with Cheap Shop"
  );
  assert.ok(
    bends.some((bend) => Math.abs(bend.value) >= 8000),
    label + " should include near-full-range pitch bend values"
  );
}

function assertBpmSeriesForMidi(midi, label) {
  const beatBarSeries = context.ReOmMIDI.buildBeatBarSeries(midi, {});
  const tempoEvents = sortedTempoEvents(midi);

  assert.ok(beatBarSeries.beat.times.length > 0, label + " should produce Beat keyframes");
  assert.ok(beatBarSeries.bar.times.length > 0, label + " should produce Bar keyframes");
  assert.strictEqual(
    beatBarSeries.bpm.times.length,
    tempoEvents.length,
    label + " BPM series should have one hold key per tempo change"
  );

  for (let i = 0; i < tempoEvents.length; i += 1) {
    const event = tempoEvents[i];
    const expectedBpm = context.ReOmMIDI.tempoToBpm(event.microsecondsPerQuarter);
    const expectedTime = midi.secondsAtTick(event.ticks);
    assert.ok(
      Math.abs(beatBarSeries.bpm.values[i] - expectedBpm) < 0.01,
      label + " BPM value at index " + i + " should match tempo event"
    );
    assert.ok(
      Math.abs(beatBarSeries.bpm.times[i] - expectedTime) < 0.0001,
      label + " BPM time at index " + i + " should match tempo event time"
    );
  }

  return beatBarSeries;
}

function assertTimeSignatureSeriesForMidi(midi, label) {
  const signatures = sortedTimeSignatures(midi);
  const signatureSeries = context.ReOmMIDI.buildMetronomeSignatureSeries(midi, {});

  assert.ok(signatures.length > 0, label + " should contain time signature events");
  assert.strictEqual(
    signatureSeries.x.times.length,
    signatures.length,
    label + " metronome X series should have one key per time signature change"
  );
  assert.strictEqual(
    signatureSeries.y.times.length,
    signatures.length,
    label + " metronome Y series should have one key per time signature change"
  );

  for (let i = 0; i < signatures.length; i += 1) {
    const signature = signatures[i];
    const expectedTime = midi.secondsAtTick(signature.ticks);
    assert.strictEqual(
      signatureSeries.x.values[i],
      signature.numerator,
      label + " metronome X value at index " + i + " should match numerator"
    );
    assert.strictEqual(
      signatureSeries.y.values[i],
      signature.denominator,
      label + " metronome Y value at index " + i + " should match denominator"
    );
    assert.ok(
      Math.abs(signatureSeries.x.times[i] - expectedTime) < 0.0001,
      label + " metronome X time at index " + i + " should match signature change time"
    );
    assert.ok(
      Math.abs(signatureSeries.y.times[i] - expectedTime) < 0.0001,
      label + " metronome Y time at index " + i + " should match signature change time"
    );
  }

  return { signatures, signatureSeries };
}

function summarizeMidi(fileName, midi, extra) {
  const activeChannels = midi.channels.filter(Boolean);
  const drumNotes = midi.notes.filter((note) => note.midiChannel === 9);
  const beatBarSeries = context.ReOmMIDI.buildBeatBarSeries(midi, {});
  const eventCounts = collectEventCounts(midi);

  return Object.assign(
    {
      file: fileName,
      format: midi.format,
      tracksDeclared: midi.trackCount,
      tracksParsed: midi.tracks.length,
      activeChannels: activeChannels.length,
      notes: midi.notes.length,
      noteEventCount: midi.noteEventCount,
      tempoEvents: midi.tempoEvents.length,
      timeSignatures: midi.timeSignatures.length,
      pitchBends: eventCounts.pitchBends,
      controllers: eventCounts.controllers,
      bpmKeyframes: beatBarSeries.bpm.times.length,
      beatKeyframes: beatBarSeries.beat.times.length,
      initialBpm: Number(context.ReOmMIDI.tempoToBpm(sortedTempoEvents(midi)[0].microsecondsPerQuarter).toFixed(2)),
      drumNotes: drumNotes.length,
      durationSeconds: Number(midi.durationSeconds.toFixed(3)),
      warnings: midi.warnings
    },
    extra || {}
  );
}

const { midi, midiPath } = loadMidiFile(PRIMARY_FIXTURE);

const activeChannels = midi.channels.filter(Boolean);
const controllerCount = activeChannels.reduce((sum, channel) => {
  return sum + Object.keys(channel.controllers).length;
}, 0);
const pitchBendCount = activeChannels.reduce((sum, channel) => {
  return sum + channel.pitchBends.length;
}, 0);
const drumNotes = midi.notes.filter((note) => note.midiChannel === 9);
const namedDrumNotes = drumNotes.filter((note) => note.drumName);

assert.strictEqual(midi.isMidi, true, "fixture should be a Standard MIDI file");
assert.strictEqual(
  context.ReOmMIDI.truncateNameBytes("日本語トラック", 9),
  "日本語",
  "truncateNameBytes should limit UTF-8 bytes, not characters"
);
assert.ok(
  byteLength(context.ReOmMIDI.limitEffectName("日本語トラック名テスト")) <= context.ReOmMIDI.AE_EFFECT_NAME_MAX_BYTES,
  "limitEffectName should respect UTF-8 byte limit"
);
assert.ok(midi.trackCount > 0, "fixture should contain tracks");
assert.ok(activeChannels.length > 0, "fixture should contain active channels");
assert.ok(midi.notes.length > 0, "fixture should contain notes");
assert.ok(midi.durationSeconds > 0, "fixture should have a positive duration");
assert.ok(drumNotes.length > 0, "fixture should contain channel 10 drum notes");
assert.strictEqual(namedDrumNotes.length, drumNotes.length, "drum notes should include GM instrument names");

activeChannels.forEach((channel) => {
  ["pitch", "velocity", "duration", "CC 1", "pitch bend"].forEach((suffix) => {
    const name = context.ReOmMIDI.formatStandardEffectName(channel, suffix);
    assert.ok(
      byteLength(name) <= context.ReOmMIDI.AE_EFFECT_NAME_MAX_BYTES,
      "standard effect name should fit AE limit: " + name
    );
  });
  if (context.ReOmMIDI.isDrumChannel(channel.midiChannel)) {
    channel.notes.forEach((note) => {
      const name = context.ReOmMIDI.formatDrumEffectName(channel, note.pitch, note.drumName);
      assert.ok(
        byteLength(name) <= context.ReOmMIDI.AE_EFFECT_NAME_MAX_BYTES,
        "drum effect name should fit AE limit: " + name
      );
    });
  }
});

const report = context.ReOmMIDI.buildMidiFileInfoReport(midi, midiPath);
assert.ok(report.indexOf("Notes: " + midi.notes.length) >= 0, "MIDI info report should include note count");
assert.ok(
  report.indexOf("Active channels: " + activeChannels.length) >= 0,
  "MIDI info report should include channel count"
);
if (pitchBendCount) {
  assert.ok(report.indexOf("Pitch bends") >= 0, "MIDI info report should include pitch bend section when bends exist");
}
if (midi.timeSignatures.length) {
  assert.ok(report.indexOf("Time signatures") >= 0, "MIDI info report should list time signatures");
}

const primarySignatureSeries = assertTimeSignatureSeriesForMidi(midi, PRIMARY_FIXTURE);
assert.strictEqual(primarySignatureSeries.signatureSeries.x.values[0], 4, "fixture initial X should be 4");
assert.strictEqual(primarySignatureSeries.signatureSeries.y.values[0], 4, "fixture initial Y should be 4");

const beatBarSeries = assertBpmSeriesForMidi(midi, PRIMARY_FIXTURE);
assert.strictEqual(beatBarSeries.beat.values[0], 1, "fixture first beat index should be 1");
assert.strictEqual(beatBarSeries.bar.values[0], 1, "fixture first bar index should be 1");

const fixtureSummaries = [];
for (const fileName of FIXTURE_FILES) {
  const recordParseMs = fileName === LARGE_FIXTURE;
  const loaded =
    fileName === PRIMARY_FIXTURE
      ? Object.assign({ midi, midiPath, bytes: fs.statSync(midiPath).size }, { parseMs: undefined })
      : loadMidiFile(fileName, { recordParseMs: recordParseMs });

  assert.strictEqual(loaded.midi.isMidi, true, fileName + " should parse as a Standard MIDI file");
  assert.ok(loaded.midi.notes.length > 0, fileName + " should contain notes");
  assertBpmSeriesForMidi(loaded.midi, fileName);

  if (fileName === TEMPO_FIXTURE) {
    assert.ok(loaded.midi.tempoEvents.length > 1, TEMPO_FIXTURE + " should contain multiple tempo changes");
    assert.ok(loaded.midi.tempoEvents.length >= 80, TEMPO_FIXTURE + " should expose many BPM keyframes");
    assertAdvancedControllerFixture(loaded.midi, TEMPO_FIXTURE);
  }

  if (fileName === PITCH_BEND_FIXTURE) {
    assertPitchBendFixture(loaded.midi, loaded.midiPath, PITCH_BEND_FIXTURE);
  }

  if (fileName === LARGE_FIXTURE) {
    const largeSignatures = assertTimeSignatureSeriesForMidi(loaded.midi, LARGE_FIXTURE);
    assert.ok(loaded.bytes >= 50000, LARGE_FIXTURE + " should remain a large-file parse fixture");
    assert.ok(loaded.midi.notes.length >= 10000, LARGE_FIXTURE + " should contain a high note count for size coverage");
    assert.ok(largeSignatures.signatures.length >= 30, LARGE_FIXTURE + " should contain many time signature changes");
    assert.strictEqual(largeSignatures.signatures[0].numerator, 9, LARGE_FIXTURE + " should open in 9/4");
    assert.strictEqual(largeSignatures.signatures[0].denominator, 4, LARGE_FIXTURE + " should open in 9/4");
    assert.ok(
      loaded.parseMs <= LARGE_FIXTURE_MAX_PARSE_MS,
      LARGE_FIXTURE + " should parse within " + LARGE_FIXTURE_MAX_PARSE_MS + "ms (got " + loaded.parseMs + "ms)"
    );
    const largeBeatBarSeries = context.ReOmMIDI.buildBeatBarSeries(loaded.midi, {});
    assert.ok(
      largeBeatBarSeries.beat.times.length >= 1000,
      LARGE_FIXTURE + " should produce a large beat series under changing signatures"
    );
  }

  fixtureSummaries.push(
    summarizeMidi(fileName, loaded.midi, {
      bytes: loaded.bytes,
      parseMs: loaded.parseMs
    })
  );
}

console.log(
  JSON.stringify(
    {
      primary: summarizeMidi(PRIMARY_FIXTURE, midi),
      controllers: controllerCount,
      pitchBends: pitchBendCount,
      drumNames: Array.from(new Set(namedDrumNotes.map((note) => note.drumName))).sort(),
      fixtures: fixtureSummaries
    },
    null,
    2
  )
);
