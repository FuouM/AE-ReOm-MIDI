const PREVIEW_MAX_TRIGGER_LINES = 220;
const PREVIEW_SIM_STEP_SEC = 1 / 24;
const PREVIEW_MAX_DURATION_SEC = 30;

const fs = require("fs");
const path = require("path");

const { root } = require("./source-loader");
const { createPreviewContext } = require("./create-preview-context");

const context = createPreviewContext();

const midiPath = process.argv[2]
  ? path.resolve(root, process.argv[2])
  : path.join(root, "test_midis", "Coolest MIDI.mid");
const outputPath = path.join(root, "dist", "midi-actions-preview.html");
const midi = new context.ReOmMIDI.MidiFile(fs.readFileSync(midiPath).toString("latin1"), midiPath);

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildGraph(title, simulation, options = {}) {
  const width = 960;
  const height = 260;
  const pad = 36;
  const points = simulation.points;
  const minTime = 0;
  const maxTime = Math.max(1, points.length ? points[points.length - 1].time : 0);
  const values = points.map((point) => point.value);
  const minValue = Math.min(...values, options.minValue ?? Infinity);
  const maxValue = Math.max(...values, options.maxValue ?? -Infinity);
  const range = maxValue - minValue || 1;
  const xFor = (time) => pad + ((time - minTime) / (maxTime - minTime)) * (width - pad * 2);
  const yFor = (value) => height - pad - ((value - minValue) / range) * (height - pad * 2);
  const polyline = points.map((point) => `${xFor(point.time).toFixed(2)},${yFor(point.value).toFixed(2)}`).join(" ");
  const triggerLines = simulation.triggers
    .slice(0, PREVIEW_MAX_TRIGGER_LINES)
    .map((trigger) => {
      const x = xFor(trigger.time).toFixed(2);
      return `<line x1="${x}" y1="${pad}" x2="${x}" y2="${height - pad}" class="trigger"><title>${escapeHtml(`${trigger.time.toFixed(3)}s ${trigger.label || trigger.pitch || trigger.source}`)}</title></line>`;
    })
    .join("\n");

  return `
    <section>
      <h2>${escapeHtml(title)}</h2>
      <p>${simulation.triggers.length} triggers, ${points.length} sampled points</p>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)} value graph">
        <line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" class="axis"></line>
        <line x1="${pad}" y1="${pad}" x2="${pad}" y2="${height - pad}" class="axis"></line>
        ${triggerLines}
        <polyline points="${polyline}" class="value"></polyline>
        <text x="${pad}" y="${pad - 12}">${maxValue.toFixed(2)}</text>
        <text x="${pad}" y="${height - 8}">${minValue.toFixed(2)}</text>
        <text x="${width - pad - 90}" y="${height - 8}">${maxTime.toFixed(2)}s</text>
      </svg>
    </section>`;
}

const common = {
  previewStep: PREVIEW_SIM_STEP_SEC,
  previewEndTime: Math.min(PREVIEW_MAX_DURATION_SEC, midi.durationSeconds),
  duration: 0.2,
  falloff: "linear"
};

const pump = context.ReOmMIDI.simulateMidiAction(midi, {
  ...common,
  preset: "pump",
  previewBaseValue: 100,
  amount: 30
});
const toggle = context.ReOmMIDI.simulateMidiAction(midi, {
  ...common,
  preset: "toggle",
  previewBaseValue: 100,
  previewActiveValue: -100
});
const interpolate = context.ReOmMIDI.simulateMidiAction(midi, {
  ...common,
  preset: "interpolate",
  previewBaseValue: 100,
  previewActiveValue: -100,
  falloff: "ease"
});
const accumulator = context.ReOmMIDI.simulateMidiAction(midi, {
  ...common,
  preset: "accumulator",
  previewBaseValue: 0,
  duration: 0.1,
  falloff: "linear"
});

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ReOm MIDI Actions Preview</title>
  <style>
    body { margin: 28px; background: #111318; color: #e8eaf0; font: 14px/1.45 system-ui, sans-serif; }
    h1, h2 { margin: 0 0 8px; }
    section { margin: 24px 0; padding: 18px; background: #1a1d24; border: 1px solid #2c313c; border-radius: 10px; }
    svg { width: 100%; height: auto; background: #101218; border-radius: 8px; }
    text { fill: #aeb6c6; font-size: 12px; }
    .axis { stroke: #657086; stroke-width: 1; }
    .trigger { stroke: #4f5d78; stroke-width: 1; opacity: 0.45; }
    .value { fill: none; stroke: #4cc9f0; stroke-width: 2; }
  </style>
</head>
<body>
  <h1>ReOm MIDI Actions Preview</h1>
  <p>Pitch-slider triggers from ${escapeHtml(path.basename(midiPath))}</p>
  ${buildGraph("Pump / Decay", pump)}
  ${buildGraph("Toggle / Flip", toggle)}
  ${buildGraph("Interpolate A-B", interpolate)}
  ${buildGraph("Integrate / Accumulate", accumulator)}
</body>
</html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);
console.log("Wrote", outputPath);
