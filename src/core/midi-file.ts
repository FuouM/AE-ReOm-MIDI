(function (api: ReOmMIDIApi) {
    var MAX_TICK = 2147483647; // INT32_MAX — sentinel for "end of file"

    function readByte(data: string, offset: number): number {
        if (offset >= data.length) {
            return 0;
        }
        return data.charCodeAt(offset) & 0xff;
    }

    function readU16(data: string, offset: number): number {
        return (readByte(data, offset) << 8) | readByte(data, offset + 1);
    }

    function readU24(data: string, offset: number): number {
        return (readByte(data, offset) << 16) | (readByte(data, offset + 1) << 8) | readByte(data, offset + 2);
    }

    function readU32(data: string, offset: number): number {
        return (
            readByte(data, offset) * 0x1000000 +
            (readByte(data, offset + 1) << 16) +
            (readByte(data, offset + 2) << 8) +
            readByte(data, offset + 3)
        );
    }

    function readVar(data: string, offset: number): VarIntResult {
        var value = 0;
        var length = 0;
        var b;
        do {
            b = readByte(data, offset + length);
            value = (value << 7) | (b & 0x7f);
            length += 1;
        } while (b & 0x80);
        return { value: value, consumed: length };
    }

    function readText(data: string, offset: number, length: number): string {
        return data.substring(offset, offset + length);
    }

    function createTrack(index: number): MidiTrack {
        return {
            index: index,
            name: "",
            channels: []
        };
    }

    function createChannel(trackIndex: number, midiChannel: number, trackName?: string): MidiChannel {
        return {
            index: trackIndex * 16 + midiChannel,
            trackIndex: trackIndex,
            midiChannel: midiChannel,
            trackName: trackName || "",
            notes: [],
            noteEvents: [],
            controllers: {},
            pitchBends: [],
            programs: []
        };
    }

    function MidiFile(this: MidiFileData, data?: string, filePath?: string) {
        this.filePath = filePath || "";
        this.data = data || "";
        this.isMidi = this.data.substring(0, 4) === "MThd";
        this.format = 0;
        this.trackCount = 0;
        this.timeDivision = 0;
        this.ticksPerBeat = 0;
        this.framesPerSecond = 0;
        this.ticksPerFrame = 0;
        this.tracks = [];
        this.channels = [];
        this.notes = [];
        this.noteEvents = [];
        this.noteEventCount = 0;
        this.tempoEvents = [];
        this.timeSignatures = [];
        this.warnings = [];
        this.durationSeconds = 0;

        if (this.isMidi) {
            this.parse();
        }
    }

    MidiFile.fromFile = function (filePath: string): MidiFileData {
        var f = new File(filePath);
        var result;
        f.encoding = "BINARY";
        if (!f.open("r")) {
            throw new Error("Could not open MIDI file: " + filePath);
        }
        result = f.read(f.length);
        f.close();
        return new (MidiFile as MidiFileConstructor)(result, filePath);
    };

    MidiFile.prototype.getChannel = function (this: MidiFileData, trackIndex: number, midiChannel: number): MidiChannel {
        var index = trackIndex * 16 + midiChannel;
        var channel = this.channels[index];
        var track = this.tracks[trackIndex];
        if (!channel) {
            channel = createChannel(trackIndex, midiChannel, track ? track.name : "");
            this.channels[index] = channel;
            if (track) {
                track.channels.push(channel);
            }
        }
        return channel;
    };

    MidiFile.prototype.parse = function () {
        var data = this.data;
        var offset = 14;
        var currentTrack = 0;

        this.format = readU16(data, 8);
        this.trackCount = readU16(data, 10);
        this.timeDivision = readU16(data, 12);

        if (this.timeDivision & 0x8000) {
            this.framesPerSecond = 256 - ((this.timeDivision >> 8) & 0xff);
            this.ticksPerFrame = this.timeDivision & 0xff;
        } else {
            this.ticksPerBeat = this.timeDivision;
        }

        while (offset + 8 <= data.length && currentTrack < this.trackCount) {
            var chunkLength = readU32(data, offset + 4);
            var chunkStart = offset + 8;
            var chunkEnd = chunkStart + chunkLength;

            if (isTrackChunk(data, offset)) {
                this.parseTrack(currentTrack, chunkStart, chunkEnd);
                currentTrack += 1;
            }

            offset = chunkEnd;
        }

        if (this.tempoEvents.length === 0) {
            this.tempoEvents.push({ ticks: 0, microsecondsPerQuarter: 500000 });
        }
        this.notes.sort(function (a: MidiNote, b: MidiNote) {
            return a.ticks - b.ticks || a.pitch - b.pitch;
        });
        this.resolveTimes();
    };

    function isTrackChunk(data: string, offset: number): boolean {
        return (
            readByte(data, offset) === 0x4d &&
            readByte(data, offset + 1) === 0x54 &&
            readByte(data, offset + 2) === 0x72 &&
            readByte(data, offset + 3) === 0x6b
        );
    }

    function buildTimeSegments(midi: MidiFileData, tempoMap: TempoEvent[]): TimeSegmentCollection {
        var items = [];
        var seconds = 0;
        var previousTick = 0;
        var tempo = 500000;
        var i;
        var secPerTick;

        if (!midi.ticksPerBeat) {
            secPerTick = 1 / (midi.framesPerSecond * midi.ticksPerFrame);
            items.push({
                startTick: 0,
                endTick: MAX_TICK,
                startSeconds: 0,
                secPerTick: secPerTick
            });
            return { items: items, lastIndex: 0 };
        }

        for (i = 0; i < tempoMap.length; i += 1) {
            secPerTick = tempo / midi.ticksPerBeat / 1000000;
            items.push({
                startTick: previousTick,
                endTick: tempoMap[i].ticks,
                startSeconds: seconds,
                secPerTick: secPerTick
            });
            seconds += (tempoMap[i].ticks - previousTick) * secPerTick;
            previousTick = tempoMap[i].ticks;
            tempo = tempoMap[i].microsecondsPerQuarter;
        }

        secPerTick = tempo / midi.ticksPerBeat / 1000000;
        items.push({
            startTick: previousTick,
            endTick: MAX_TICK,
            startSeconds: seconds,
            secPerTick: secPerTick
        });
        return { items: items, lastIndex: 0 };
    }

    function secondsFromSegments(ticks: number, segments: TimeSegmentCollection): number {
        ticks = ticks || 0;
        var items = segments.items;
        var lastSegmentIndex = segments.lastIndex || 0;
        var cached = items[lastSegmentIndex];
        if (cached && ticks >= cached.startTick && ticks < cached.endTick) {
            return cached.startSeconds + (ticks - cached.startTick) * cached.secPerTick;
        }

        var lo = 0;
        var hi = items.length - 1;
        var mid;
        var segment;

        while (lo <= hi) {
            mid = (lo + hi) >> 1;
            segment = items[mid];
            if (ticks < segment.startTick) {
                hi = mid - 1;
            } else if (ticks >= segment.endTick && mid < items.length - 1) {
                lo = mid + 1;
            } else {
                segments.lastIndex = mid;
                return segment.startSeconds + (ticks - segment.startTick) * segment.secPerTick;
            }
        }

        segment = items[items.length - 1];
        if (!segment) {
            return 0;
        }
        return segment.startSeconds + (ticks - segment.startTick) * segment.secPerTick;
    }

    function ensureTimeSegments(midi: MidiFileData, tempoMap?: TempoEvent[]): TimeSegmentCollection {
        if (midi._timeSegments) {
            return midi._timeSegments;
        }

        if (!tempoMap) {
            tempoMap = midi._tempoMap;
        }
        if (!tempoMap || !tempoMap.length) {
            tempoMap = (midi.tempoEvents || []).slice().sort(function (a, b) {
                return a.ticks - b.ticks;
            });
            if (!tempoMap.length) {
                tempoMap = [{ ticks: 0, microsecondsPerQuarter: 500000 }];
            }
        } else if (tempoMap !== midi._tempoMap) {
            tempoMap = tempoMap.slice().sort(function (a, b) {
                return a.ticks - b.ticks;
            });
        }

        midi._timeSegments = buildTimeSegments(midi, tempoMap);
        midi._tempoMap = tempoMap;
        return midi._timeSegments;
    }

    MidiFile.prototype.parseTrack = function (this: MidiFileData, trackIndex: number, start: number, end: number): void {
        var data = this.data;
        var offset = start;
        var ticks = 0;
        var runningStatus = 0;
        var midiChannelPrefix = 0;
        var track = createTrack(trackIndex);
        var openNotes: StringKeyedMap<MidiNote[]> = {};
        this.tracks[trackIndex] = track;

        while (offset < end && offset < data.length) {
            var deltaResult = readVar(data, offset);
            var delta = deltaResult.value;
            var status;
            var statusTop;
            var midiChannel;
            var b1;
            var b2;
            var length;

            ticks += delta;
            offset += deltaResult.consumed;
            status = readByte(data, offset);

            if (status & 0x80) {
                offset += 1;
                if (status < 0xf0) {
                    runningStatus = status;
                }
            } else {
                status = runningStatus;
            }

            statusTop = status & 0xf0;
            midiChannel = status & 0x0f;
            b1 = readByte(data, offset);
            b2 = readByte(data, offset + 1);

            if (status === 0xff) {
                length = this.parseMetaEvent(track, ticks, offset, midiChannelPrefix);
                if (b1 === 0x20) {
                    midiChannelPrefix = readByte(data, offset + 2);
                }
                offset += length;
            } else if (status === 0xf0 || status === 0xf7) {
                var sysexVar = readVar(data, offset);
                var sysexLength = sysexVar.value;
                if (sysexVar.consumed + sysexLength === 0) {
                    offset += 1;
                    continue;
                }
                offset += sysexVar.consumed + sysexLength;
            } else if (statusTop === 0x80 || (statusTop === 0x90 && b2 === 0)) {
                this.addNoteEvent(trackIndex, midiChannel, ticks, b1, 0, openNotes);
                offset += 2;
            } else if (statusTop === 0x90) {
                this.addNoteEvent(trackIndex, midiChannel, ticks, b1, b2, openNotes);
                offset += 2;
            } else if (statusTop === 0xb0) {
                this.addController(trackIndex, midiChannel, ticks, b1, b2);
                offset += 2;
            } else if (statusTop === 0xc0) {
                this.addProgram(trackIndex, midiChannel, ticks, b1);
                offset += 1;
            } else if (statusTop === 0xe0) {
                this.addPitchBend(trackIndex, midiChannel, ticks, ((b2 << 7) | b1) - 8192);
                offset += 2;
            } else if (statusTop === 0xa0 || statusTop === 0xd0) {
                offset += statusTop === 0xd0 ? 1 : 2;
            } else {
                this.warnings.push("Unknown MIDI status 0x" + status.toString(16) + " at " + offset);
                offset += 1;
            }
        }
    };

    MidiFile.prototype.parseMetaEvent = function (
        this: MidiFileData,
        track: MidiTrack,
        ticks: number,
        offset: number,
        midiChannelPrefix: number
    ): number {
        var data = this.data;
        var type = readByte(data, offset);
        var lengthResult = readVar(data, offset + 1);
        var length = lengthResult.value;
        var lengthLen = lengthResult.consumed;
        var valueOffset = offset + 1 + lengthLen;
        var channel;

        if (type === 0x03) {
            track.name = readText(data, valueOffset, length);
        } else if (type === 0x04) {
            channel = this.getChannel(track.index, midiChannelPrefix);
            channel.instrumentName = readText(data, valueOffset, length);
        } else if (type === 0x51 && length === 3) {
            this.tempoEvents.push({
                ticks: ticks,
                microsecondsPerQuarter: readU24(data, valueOffset)
            });
        } else if (type === 0x58 && length >= 4) {
            this.timeSignatures.push({
                ticks: ticks,
                numerator: readByte(data, valueOffset),
                denominator: 1 << readByte(data, valueOffset + 1),
                metronome: readByte(data, valueOffset + 2),
                thirtySeconds: readByte(data, valueOffset + 3)
            });
        }

        return 1 + lengthLen + length;
    };

    MidiFile.prototype.addNoteEvent = function (
        this: MidiFileData,
        trackIndex: number,
        midiChannel: number,
        ticks: number,
        pitch: number,
        velocity: number,
        openNotes: StringKeyedMap<MidiNote[]>
    ): void {
        var channel = this.getChannel(trackIndex, midiChannel);
        var key = midiChannel + ":" + pitch;
        var stack = openNotes[key] || [];
        var event;
        var note;

        if (velocity > 0) {
            this.noteEventCount += 1;
            event = {
                ticks: ticks,
                trackIndex: trackIndex,
                midiChannel: midiChannel,
                channelIndex: channel.index,
                pitch: pitch,
                velocity: velocity,
                drumName: api.isDrumChannel(midiChannel) ? api.getDrumName(pitch) : ""
            };

            channel.noteEvents.push(event);
            stack.push(event);
            openNotes[key] = stack;
            channel.notes.push(event);
            this.notes.push(event);
            this.noteEvents.push(event);
        } else if (stack.length) {
            note = stack.shift();
            note.offTicks = ticks;
            note.durationTicks = ticks - note.ticks;
        }
    };

    MidiFile.prototype.addController = function (
        this: MidiFileData,
        trackIndex: number,
        midiChannel: number,
        ticks: number,
        controller: number,
        value: number
    ): void {
        var channel = this.getChannel(trackIndex, midiChannel);
        if (!channel.controllers[controller]) {
            channel.controllers[controller] = [];
        }
        channel.controllers[controller].push({ ticks: ticks, controller: controller, value: value });
    };

    MidiFile.prototype.addProgram = function (
        this: MidiFileData,
        trackIndex: number,
        midiChannel: number,
        ticks: number,
        program: number
    ): void {
        this.getChannel(trackIndex, midiChannel).programs.push({ ticks: ticks, program: program });
    };

    MidiFile.prototype.addPitchBend = function (
        this: MidiFileData,
        trackIndex: number,
        midiChannel: number,
        ticks: number,
        value: number
    ): void {
        this.getChannel(trackIndex, midiChannel).pitchBends.push({ ticks: ticks, value: value });
    };

    MidiFile.prototype.secondsAtTick = function (this: MidiFileData, ticks: number, tempoMap?: TempoEvent[]): number {
        return secondsFromSegments(ticks, ensureTimeSegments(this, tempoMap));
    };

    MidiFile.prototype.resolveTimes = function () {
        var tempoMap = this.tempoEvents.sort(function (a: TempoEvent, b: TempoEvent) {
            return a.ticks - b.ticks;
        });
        var i;
        var c;
        var controller;
        var note;
        var event;
        var time;
        var offTime;
        var segments;

        this._timeSegments = buildTimeSegments(this, tempoMap);
        this._tempoMap = tempoMap;
        segments = this._timeSegments;
        segments.lastIndex = 0;

        for (i = 0; i < this.notes.length; i += 1) {
            note = this.notes[i];
            time = secondsFromSegments(note.ticks, segments);
            note.time = time;
            if (typeof note.offTicks !== "undefined") {
                offTime = secondsFromSegments(note.offTicks, segments);
                note.offTime = offTime;
                note.duration = offTime - time;
                if (time > this.durationSeconds) {
                    this.durationSeconds = time;
                }
                if (offTime > this.durationSeconds) {
                    this.durationSeconds = offTime;
                }
            } else if (time > this.durationSeconds) {
                this.durationSeconds = time;
            }
        }

        for (c = 0; c < this.channels.length; c += 1) {
            if (!this.channels[c]) {
                continue;
            }
            for (controller in this.channels[c].controllers) {
                if (this.channels[c].controllers.hasOwnProperty(controller)) {
                    for (i = 0; i < this.channels[c].controllers[controller].length; i += 1) {
                        event = this.channels[c].controllers[controller][i];
                        time = secondsFromSegments(event.ticks, segments);
                        event.time = time;
                        if (time > this.durationSeconds) {
                            this.durationSeconds = time;
                        }
                    }
                }
            }
            for (i = 0; i < this.channels[c].pitchBends.length; i += 1) {
                event = this.channels[c].pitchBends[i];
                time = secondsFromSegments(event.ticks, segments);
                event.time = time;
                if (time > this.durationSeconds) {
                    this.durationSeconds = time;
                }
            }
        }
    };

    function midiFormatLabel(format: number): string {
        if (format === 0) {
            return "0 (single track)";
        }
        if (format === 1) {
            return "1 (simultaneous tracks)";
        }
        if (format === 2) {
            return "2 (sequential tracks)";
        }
        return String(format);
    }

    function formatMidiDuration(seconds: number): string {
        var mins;
        var secs;
        seconds = Number(seconds) || 0;
        if (seconds < 60) {
            return seconds.toFixed(3) + " s";
        }
        mins = Math.floor(seconds / 60);
        secs = seconds - mins * 60;
        return mins + "m " + secs.toFixed(2) + "s";
    }

    api.tempoToBpm = function (microsecondsPerQuarter) {
        return 60000000 / (Number(microsecondsPerQuarter) || 500000);
    };

    function countChannelControllers(channel: MidiChannel | null | undefined): number {
        var total = 0;
        var controller;
        if (!channel || !channel.controllers) {
            return 0;
        }
        for (controller in channel.controllers) {
            if (channel.controllers.hasOwnProperty(controller)) {
                total += channel.controllers[controller].length;
            }
        }
        return total;
    }

    function uniqueSorted(values: string[]): string[] {
        var seen: StringKeyedMap<boolean> = {};
        var result: string[] = [];
        var i;
        var value;
        for (i = 0; i < values.length; i += 1) {
            value = values[i];
            if (value !== undefined && value !== null && !seen[value]) {
                seen[value] = true;
                result.push(value);
            }
        }
        result.sort();
        return result;
    }

    function summarizeList(items: string[], maxItems?: number): string {
        var shown;
        if (!items || !items.length) {
            return "none";
        }
        shown = items.slice(0, maxItems || 8);
        if (items.length > shown.length) {
            return shown.join(", ") + " (+" + (items.length - shown.length) + " more)";
        }
        return shown.join(", ");
    }

    function formatReportTime(seconds: number): string {
        var mins;
        var secs;
        seconds = Math.max(0, Number(seconds) || 0);
        mins = Math.floor(seconds / 60);
        secs = seconds - mins * 60;
        if (mins > 0) {
            return mins + ":" + (secs < 10 ? "0" : "") + secs.toFixed(2);
        }
        return secs.toFixed(3) + "s";
    }

    function formatChannelInfoLabel(channel: MidiChannel): string {
        var label = api.formatChannelEffectPrefix(channel);
        if (api.isDrumChannel(channel.midiChannel)) {
            label += " (Drums)";
        } else if (channel.instrumentName) {
            label += " — " + channel.instrumentName;
        } else if (channel.trackName) {
            label += " — " + channel.trackName;
        }
        return label;
    }

    function summarizePitchBends(bends: PitchBendEvent[]): {
        count: number;
        min: number;
        max: number;
        kind: string;
    } {
        var summary = {
            count: bends.length,
            min: 0,
            max: 0,
            kind: "none"
        };
        var i;
        var value;
        if (!bends.length) {
            return summary;
        }
        summary.min = bends[0].value;
        summary.max = bends[0].value;
        for (i = 0; i < bends.length; i += 1) {
            value = bends[i].value;
            if (value < summary.min) {
                summary.min = value;
            }
            if (value > summary.max) {
                summary.max = value;
            }
        }
        if (summary.min !== summary.max) {
            summary.kind = "animated";
        } else if (summary.min === 0) {
            summary.kind = "centerOnly";
        } else {
            summary.kind = "constantOffset";
        }
        return summary;
    }

    function appendConstantOffsetSummary(lines: string[], offsetCounts: StringKeyedMap<number>): void {
        var offsets = [];
        var offset;
        var j;
        for (offset in offsetCounts) {
            if (offsetCounts.hasOwnProperty(offset)) {
                offsets.push({ value: Number(offset), count: offsetCounts[offset] });
            }
        }
        offsets.sort(function (a, b) {
            return a.value - b.value;
        });
        for (j = 0; j < offsets.length; j += 1) {
            lines.push(
                offsets[j].count +
                    " channel(s): constant wheel offset at " +
                    offsets[j].value +
                    " (init/reset only, not animated)"
            );
        }
    }

    api.buildMidiFileInfoReport = function (midi: MidiFileData | null | undefined, filePath?: string): string {
        var activeChannels = [];
        var controllerCount = 0;
        var pitchBendCount = 0;
        var drumNoteCount = 0;
        var drumNameSeen: StringKeyedMap<boolean> = {};
        var drumNameList = [];
        var pitchMin = 127;
        var pitchMax = 0;
        var lines = [];
        var file;
        var fileSizeKb;
        var initialTempo;
        var initialSignature;
        var i;
        var n;
        var channel;
        var channelLabel;
        var drumNames;
        var trackNames;
        var tempoMap;
        var timeSignature;
        var bendSummary;
        var centerOnlyCount;
        var constantOffsetCounts;
        var pitchBendLine;
        var hasAnimatedBends;
        var drumHitSeen;
        var drumHitName;
        var animatedBendEvents = 0;

        if (!midi || !midi.isMidi) {
            return "The selected file is not a Standard MIDI file.";
        }

        for (i = 0; i < midi.channels.length; i += 1) {
            if (midi.channels[i]) {
                activeChannels.push(midi.channels[i]);
            }
        }

        for (i = 0; i < activeChannels.length; i += 1) {
            channel = activeChannels[i];
            controllerCount += countChannelControllers(channel);
            pitchBendCount += channel.pitchBends.length;
            if (channel.pitchBends.length) {
                bendSummary = summarizePitchBends(channel.pitchBends);
                if (bendSummary.kind === "animated") {
                    animatedBendEvents += bendSummary.count;
                }
            }
        }

        for (i = 0; i < midi.notes.length; i += 1) {
            if (api.isDrumChannel(midi.notes[i].midiChannel)) {
                drumNoteCount += 1;
                if (midi.notes[i].drumName && !drumNameSeen[midi.notes[i].drumName]) {
                    drumNameSeen[midi.notes[i].drumName] = true;
                    drumNameList.push(midi.notes[i].drumName);
                }
            } else if (typeof midi.notes[i].pitch === "number") {
                if (midi.notes[i].pitch < pitchMin) {
                    pitchMin = midi.notes[i].pitch;
                }
                if (midi.notes[i].pitch > pitchMax) {
                    pitchMax = midi.notes[i].pitch;
                }
            }
        }

        lines.push("MIDI File Info");
        lines.push("==============");
        if (filePath) {
            lines.push("Path: " + filePath);
            if (typeof File !== "undefined") {
                file = new File(filePath);
                lines.push("File: " + (file.displayName || file.name || filePath));
                if (file.exists) {
                    fileSizeKb = file.length / 1024;
                    lines.push("Size: " + fileSizeKb.toFixed(1) + " KB");
                }
            } else {
                lines.push("File: " + filePath.replace(/^.*[\\\/]/, ""));
            }
        }

        lines.push("");
        lines.push("Structure");
        lines.push("---------");
        lines.push("Format: " + midiFormatLabel(midi.format));
        lines.push("Tracks declared: " + midi.trackCount);
        lines.push("Tracks parsed: " + midi.tracks.length);
        if (midi.ticksPerBeat) {
            lines.push("Timing: " + midi.ticksPerBeat + " ticks per quarter note");
        } else if (midi.framesPerSecond) {
            lines.push("Timing: " + midi.framesPerSecond + " fps, " + midi.ticksPerFrame + " ticks per frame");
        }
        lines.push("Duration: " + formatMidiDuration(midi.durationSeconds));

        if (midi.tempoEvents.length) {
            initialTempo = midi.tempoEvents[0];
            lines.push("Initial tempo: " + api.tempoToBpm(initialTempo.microsecondsPerQuarter).toFixed(2) + " BPM");
            lines.push("Tempo changes: " + midi.tempoEvents.length);
        }
        if (midi.timeSignatures.length) {
            initialSignature = midi.timeSignatures[0];
            lines.push("Initial time signature: " + initialSignature.numerator + "/" + initialSignature.denominator);
            lines.push("Time signature changes: " + midi.timeSignatures.length);
            if (!tempoMap && midi._tempoMap) {
                tempoMap = midi._tempoMap;
            } else if (!tempoMap) {
                tempoMap = midi.tempoEvents.slice().sort(function (a, b) {
                    return a.ticks - b.ticks;
                });
            }
            lines.push("");
            lines.push("Time signatures");
            lines.push("---------------");
            for (i = 0; i < midi.timeSignatures.length; i += 1) {
                timeSignature = midi.timeSignatures[i];
                lines.push(
                    formatReportTime(midi.secondsAtTick(timeSignature.ticks, tempoMap)) +
                        "  " +
                        timeSignature.numerator +
                        "/" +
                        timeSignature.denominator
                );
            }
        }

        var rawTrackNames = [];
        var trackObj;
        for (i = 0; i < midi.tracks.length; i += 1) {
            trackObj = midi.tracks[i];
            if (trackObj && trackObj.name) {
                rawTrackNames.push(trackObj.name);
            }
        }
        trackNames = uniqueSorted(rawTrackNames);
        if (trackNames.length) {
            lines.push("Track names: " + summarizeList(trackNames, 6));
        }

        lines.push("");
        lines.push("Content");
        lines.push("-------");
        lines.push("Active channels: " + activeChannels.length);
        lines.push("Notes: " + midi.notes.length);
        lines.push("Note events: " + (midi.noteEventCount || midi.notes.length));
        lines.push("Controller events: " + controllerCount);
        pitchBendLine = "Pitch bend events: " + pitchBendCount;
        if (pitchBendCount && animatedBendEvents !== pitchBendCount) {
            pitchBendLine += " (" + animatedBendEvents + " animated)";
        }
        lines.push(pitchBendLine);
        lines.push("Drum notes (channel 10): " + drumNoteCount);
        if (midi.notes.length && pitchMax >= pitchMin) {
            lines.push("Melodic pitch range: " + pitchMin + " to " + pitchMax);
        }
        if (drumNameList.length) {
            drumNameList.sort();
            lines.push("Drum names used: " + summarizeList(drumNameList, 10));
        }

        if (pitchBendCount) {
            centerOnlyCount = 0;
            constantOffsetCounts = {} as StringKeyedMap<number>;
            hasAnimatedBends = false;
            lines.push("");
            lines.push("Pitch bends");
            lines.push("-----------");
            activeChannels.sort(function (a, b) {
                return a.trackIndex - b.trackIndex || a.midiChannel - b.midiChannel;
            });
            for (i = 0; i < activeChannels.length; i += 1) {
                channel = activeChannels[i];
                if (!channel.pitchBends.length) {
                    continue;
                }
                bendSummary = summarizePitchBends(channel.pitchBends);
                if (bendSummary.kind === "animated") {
                    hasAnimatedBends = true;
                    channelLabel = formatChannelInfoLabel(channel);
                    lines.push(
                        channelLabel +
                            ": " +
                            bendSummary.count +
                            " events, range " +
                            bendSummary.min +
                            " to " +
                            bendSummary.max
                    );
                } else if (bendSummary.kind === "centerOnly") {
                    centerOnlyCount += 1;
                } else if (bendSummary.kind === "constantOffset") {
                    constantOffsetCounts[bendSummary.min] = (constantOffsetCounts[bendSummary.min] || 0) + 1;
                }
            }
            if (!hasAnimatedBends) {
                lines.push("No animated pitch bend data");
            }
            appendConstantOffsetSummary(lines, constantOffsetCounts);
            if (centerOnlyCount) {
                lines.push(centerOnlyCount + " channel(s): center-only pitch wheel resets");
            }
        }

        if (activeChannels.length) {
            lines.push("");
            lines.push("Channels");
            lines.push("--------");
            activeChannels.sort(function (a, b) {
                return a.trackIndex - b.trackIndex || a.midiChannel - b.midiChannel;
            });
            for (i = 0; i < activeChannels.length; i += 1) {
                channel = activeChannels[i];
                channelLabel = formatChannelInfoLabel(channel);
                lines.push(
                    channelLabel +
                        ": " +
                        channel.notes.length +
                        " notes, " +
                        countChannelControllers(channel) +
                        " controllers, " +
                        channel.pitchBends.length +
                        " pitch bends"
                );
                if (!api.isDrumChannel(channel.midiChannel) && channel.notes.length) {
                    pitchMin = 127;
                    pitchMax = 0;
                    for (n = 0; n < channel.notes.length; n += 1) {
                        if (channel.notes[n].pitch < pitchMin) {
                            pitchMin = channel.notes[n].pitch;
                        }
                        if (channel.notes[n].pitch > pitchMax) {
                            pitchMax = channel.notes[n].pitch;
                        }
                    }
                    lines.push("  Pitch range: " + pitchMin + " to " + pitchMax);
                }
                if (api.isDrumChannel(channel.midiChannel) && channel.notes.length) {
                    drumHitSeen = {} as StringKeyedMap<boolean>;
                    drumNames = [];
                    for (n = 0; n < channel.notes.length; n += 1) {
                        drumHitName = channel.notes[n].drumName || "Drum " + channel.notes[n].pitch;
                        if (!drumHitSeen[drumHitName]) {
                            drumHitSeen[drumHitName] = true;
                            drumNames.push(drumHitName);
                        }
                    }
                    drumNames.sort();
                    lines.push("  Drum hits: " + summarizeList(drumNames, 8));
                }
            }
        }

        if (midi.warnings && midi.warnings.length) {
            lines.push("");
            lines.push("Warnings");
            lines.push("--------");
            for (i = 0; i < midi.warnings.length; i += 1) {
                lines.push("- " + midi.warnings[i]);
            }
        }

        return lines.join("\n");
    };

    api.discardMidiFileData = function (midi: MidiFileData | null | undefined): void {
        if (!midi) {
            return;
        }
        midi.data = "";
        midi.notes = [];
        midi.noteEvents = [];
        midi.tracks = [];
        midi.channels = [];
        midi.tempoEvents = [];
        midi.timeSignatures = [];
        midi.warnings = [];
        midi._timeSegments = null;
        midi._tempoMap = null;
    };

    api.MidiFile = MidiFile as MidiFileConstructor;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = MidiFile as MidiFileConstructor;
    }
})(ReOmMIDI);
