const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const VERSION_PLACEHOLDER = "__REOM_MIDI_VERSION__";
const VERSION = require(path.join(root, "package.json")).version;

// Fixture roles (files live in test_midis/):
// - Coolest MIDI.mid: primary integration fixture (channels, drums, MIDI info, effect names)
// - innocenttreasures.mid: many tempo/BPM changes; varied controllers; few full-range pitch bends
// - Cheap Shop.mid: many simple real pitch bends across channels (primary pitch-bend fixture)
// - gas_station_third_sanctuary.mid: large file, many time signature changes, parse-speed check
const FIXTURE_FILES = [
  "Coolest MIDI.mid",
  "innocenttreasures.mid",
  "Cheap Shop.mid",
  "gas_station_third_sanctuary.mid"
];
const PRIMARY_FIXTURE = "Coolest MIDI.mid";
const TEMPO_FIXTURE = "innocenttreasures.mid";
const PITCH_BEND_FIXTURE = "Cheap Shop.mid";
const LARGE_FIXTURE = "gas_station_third_sanctuary.mid";

function readSource(relativePath) {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  let text = fs.readFileSync(path.join(root, relativePath), "utf8");

  if (normalizedPath === "dist/compiled/core/namespace.jsx") {
    if (!text.includes(VERSION_PLACEHOLDER)) {
      throw new Error(
        "src/core/namespace.ts must define api.VERSION with " +
          VERSION_PLACEHOLDER +
          " (synced from package.json at build time)."
      );
    }
    text = text.replace(new RegExp(VERSION_PLACEHOLDER, "g"), VERSION);
  }

  return text;
}

module.exports = {
  root,
  VERSION,
  VERSION_PLACEHOLDER,
  readSource,
  FIXTURE_FILES,
  PRIMARY_FIXTURE,
  TEMPO_FIXTURE,
  PITCH_BEND_FIXTURE,
  LARGE_FIXTURE
};
