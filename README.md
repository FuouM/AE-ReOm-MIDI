# ReOm MIDI

A modernized, high-performance After Effects MIDI import and animation script based on the original Omino `om_midi.jsx`.

The original script was announced on the [Omino Pixel Blog](https://omino.com/pixelblog/2011/12/26/ae-hello-again-midi/). The download linked from that post is dead, or at least not findable at this time, so `om_midi_original.jsx` in this repository is an archived copy.

ReOm MIDI parses Standard MIDI files and translates MIDI note, velocity, duration, tempo, time signature, pitch bend, and controller (CC) data into After Effects keyframes and dynamic expressions. It allows animators to drive visual properties directly from musical files.

The installable script is `re_om_midi.jsx`, generated from smaller modular source files under `src/` to separate parser logic, After Effects host logic, and UI code.

---

## Key Features & Capabilities

ReOm MIDI is organized into a tabbed interface in After Effects, offering seven functional panels:

### 1. Import Tab

Import MIDI files into your active composition as Null layers containing slider controls.

* **Get MIDI Info**: Read any MIDI file and display format, tracks, ticks, channels, time signatures, and note count statistics before importing.
* **Flexible Layer Modes**:
  * *One layer per channel*: Creates a separate control Null for each active MIDI channel.
  * *Combined layer*: Merges all channels into a single control Null.
* **Custom Prefix**: Add custom prefixes to imported Null layer names.
* **Frame Quantization**: Snaps keyframe times directly to the active composition's frame grid.
* **Named Drums**: Automatically maps MIDI Channel 10 notes to sliders named after the General MIDI drum list (e.g., Kick, Snare, Hi-Hat) instead of generic pitch numbers.
* **Pitch Bends & CC Data**: Toggle the import of pitch wheel events and CC automation sliders.
* **Timing Layers**:
  * **Metronome**: Generates a Null layer with `X` (numerator) and `Y` (denominator) sliders representing time signature changes over the timeline.
  * **BPM Layer**: Generates a Null layer with `Beat` (beat index in current bar) and `Bar` (overall bar index) sliders keyed to the MIDI tempo map.

### 2. Piano Roll Map Tab

Generate visual piano-roll style shapes in your timeline from a selected MIDI control layer.

* Renders each note as a Shape Layer path where `X` represents time, `Y` represents pitch lane (from MIDI pitch 21 to 128, mapping low notes to the bottom and high notes to the top), width matches duration, and opacity reflects velocity.
* Includes options to set note height, cap the maximum number of shape layers created, include/exclude Channel 10 drum hits, and limit rendering to the composition work area.

### 3. MIDI Actions Tab

Apply live expressions or bake keyframes onto selected properties based on imported MIDI note events.

* **Preset Action Curves**:
  * **Pump / Decay**: Jumps by a specified *Amount* on each trigger and decays to *Base Value* over *Duration*.
  * **Toggle / Flip**: Alternates between *Base Value* and *Active Value* on each note trigger.
  * **Interpolate A-B**: Alternates between *A Value* and *B Value*, blending values between consecutive notes.
  * **Integrate / Accumulate**: Adds *Amount* on each trigger and eases toward the running total over *Duration*.
* **Curve Customization**: Adjust parameters including Base/Active values, amount, duration, and falloff profiles (instant, linear, ease, exponential).
* **Bake Keyframes**: Instead of live expressions, you can write hold keyframes (for toggle/interpolate) or sampled values on the comp frame grid (for pump/accumulate).

### 4. Drum Machine Tab

Build a visual drum-pad grid from imported MIDI null layers.

* Select one imported MIDI null layer, or multiple non-drum MIDI layers. Each selection mode maps hits to pads differently:
  * *Named drum import sliders*: One pad per drum effect (e.g., T01 Ch10 d36 Bass Drum), preserving overlapping hits.
  * *Single melodic or pitch-only drum layer*: One pad per MIDI pitch.
  * *Multiple non-drum layers*: One pad per layer — any note on that layer triggers its pad, regardless of pitch.
* Pads are colored squares arranged in a grid and parented to a controller Null with stroke and master opacity sliders (similar to Piano Roll Map).
* **Response Settings**: Configure square size, hit duration, and optional animation of Scale, Opacity, and Rotation with falloff curves (instant, linear, ease, exponential).
* **Filtering**: Limit to the composition work area, cap the maximum number of hits, and optionally restrict to specific drum pitches.
* **Create with Expression** or **Bake** keyframes onto the pad shapes.

### 5. Drum Sequencer Tab

Map drum MIDI hits to frame-based sample footage using Time Remap expressions.

* Select an imported drum MIDI null layer with named drum sliders, plus a footage or precomp layer containing frame-based drum samples.
* **Generate from Layer** analyzes the drum null and builds a Time Remap expression template with per-drum frame zones.
* Edit the generated expression to reorder `drumFrameList` entries (overlap priority) and adjust `startFrame` / `endFrame` ranges as needed.
* **Apply to Selected Layer** enables Time Remap on the footage layer and installs the expression.
* **Total Frames** option divides footage frames evenly across all drum pads on generate; use `0` for automatic incrementing zones (default kick/snare/hat spacing).
* Legacy layers without named drum sliders still use the pitch-slider map.
* Zone reference: Kick frames ~11–30, Snare ~33–52, Hats ~86–128.

### 6. MIDI Map Tab

Quickly set up dynamic text layers that display MIDI note labels.

* Scan a selected MIDI control Null to discover the pitch range.
* Generate a customizable text expression that translates active pitch sliders into string labels.
* Switch between Note Names (e.g., C4, D#4) and General MIDI Drum Names.
* Create a Text Null with the expression pre-applied or copy the expression to your clipboard.

### 7. Misc Tab

Contains utility tools to quickly generate audio and screen animations:

* **Create Tone Layer**: Translates MIDI note keyframes into frequency and level values, baking them onto a Null layer containing After Effects' native **Tone** audio effect. Plays back the MIDI notes as audio tones directly in After Effects. Options include waveform (Sine, Triangle, Saw, Square, White Noise), volume level, frame quantization, and work area boundaries.
* **Screen Flip**: A shortcut for flipping Scale X (horizontal) or Scale Y (vertical) between positive and negative on note triggers. Supports live expressions or baking keyframes to target layers.

---

## Repository Layout

* `src/core/`: Host-independent logic (e.g., MIDI file parser) that runs in both Node.js and ExtendScript.
* `src/ae/`: After Effects-specific code, including ScriptUI interface code, expressions, and keyframe generation scripts.
* `src/main.jsx`: Script entry point.
* `scripts/build.js`: Concatenates and bundles the modular source files into `re_om_midi.jsx`.
* `test_midis/`: Standard MIDI fixtures used by parser tests and preview scripts.
* `scripts/test-midi.js`: Tests the MIDI parser in a Node environment by parsing files in `test_midis/`.
* `scripts/preview-actions.js`: Renders MIDI Actions curves to a browser preview.
* `scripts/preview-map.js`: Renders note maps to a browser preview.

---

## Development & Testing

Requires **Node.js 18** or newer. No third-party npm dependencies are required to run builds or tests.

### Commands

* **Build the After Effects script**:

  ```sh
  npm run build
  ```

  This generates `re_om_midi.jsx` in the root directory.

* **Run parser and bundle tests**:

  ```sh
  npm test
  ```

* **Build and run tests**:

  ```sh
  npm run check
  ```

* **Preview MIDI Actions (Web Mock)**:

  ```sh
  npm run preview:actions
  ```

  Generates `dist/midi-actions-preview.html`, displaying simulated graphs of the action curves (pump, toggle, accumulator) in a static browser page.

* **Preview Piano Roll (Web Mock)**:

  ```sh
  npm run preview:map
  ```

  Generates `dist/midi-map-preview.html`, displaying a static SVG piano roll map in a browser page.

  Both preview commands default to `test_midis/Coolest MIDI.mid`. Pass a path relative to the repo root to use another file, e.g. `node scripts/preview-map.js test_midis/innocenttreasures.mid`.

---

## Credits

* MIDI note names baked into the script from [stoyan/midi-note-freq](https://github.com/stoyan/midi-note-freq)

---

## License

This project is licensed under the **GNU General Public License v3 (GPLv3)**. See the [LICENSE](file:///k:/REALAI/ReOmMIDI/LICENSE) file for the full text.

### Our Stance on Source Code Obfuscation (JSXBIN)

In keeping with the spirit of the GPLv3, **we are strongly against the obfuscation or binarization of this script** (such as publishing it strictly as a compiled `.jsxbin` file). Under the GPLv3, "Source Code" is defined as the *preferred form of the work for making modifications to it*.

If you fork, modify, or distribute this script:

1. You **must** make your modifications open-source under the GPLv3.
2. You **must** provide the fully readable, un-obfuscated and un-minified `.jsx` source files to anyone you distribute the script to. Distributing only a `.jsxbin` version without the original source is a direct violation of this license.
