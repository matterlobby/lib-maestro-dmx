# lib-maestro-dmx

Node.js-Bibliothek zum Zugriff auf MaestroDMX ueber OSC und show-relevante HTTP-Reads.

## Runtime

This library targets Node.js 24 LTS.
It is published as a pure ESM package.

## API

The library uses one shared host for both protocols:

- OSC writes are sent to port `7672`
- HTTP reads are loaded from the Maestro Web API under `/api/v1/...`

```ts
import { createClient } from "lib-maestro-dmx";

const client = createClient({
  host: "maestro.local"
});

const liveState = await client.live.read();
const showState = await client.showState.read();
const colorPalettes = await client.colorPalettes.read();

console.log(liveState.primary.patternId);
console.log(showState.type);
console.log(colorPalettes.palettes[0]?.name);

await client.control.group(1).setPattern("Solid Color");
await client.control.group(1).setBrightness(0.75);
await client.control.global.setBrightness(0.9);
await client.control.show.play();
```

`client.live.read()` performs one explicit HTTP request and returns the full live snapshot.
`client.live.getLastRead()` returns the most recently fetched snapshot without making a new request.
The same `read()` / `getLastRead()` pattern is available for the other HTTP reader APIs.
`client.control` provides typed OSC helpers for the full parameter list published in the MaestroDMX OSC specification.
Continuous group and global value setters are throttled per OSC address with a leading-and-trailing window.
Brightness uses 500 ms. The other throttled continuous value setters use 250 ms.
Trigger commands and trigger parameter setters are sent immediately without throttling.

## HTTP Read API

The library intentionally focuses on read access that is useful during show automation and cue orchestration.
It includes typed readers for:

- `/api/v1/live` via `client.live`
- `/api/v1/patterns` via `client.patterns`
- `/api/v1/patterns/available` via `client.patternsAvailable`
- `/api/v1/palettes` via `client.paletteAssignments`
- `/api/v1/palettes/color` via `client.colorPalettes`
- `/api/v1/palettes/fx` via `client.fxPalettes`
- `/api/v1/brightness` via `client.brightness`
- `/api/v1/show` via `client.show`
- `/api/v1/show/state` via `client.showState`
- `/api/v1/fixture_groups` via `client.fixtureGroups`
- `/api/v1/system_info` via `client.systemInfo`

These readers are aimed at runtime metadata, palette and pattern catalogs, active palette assignment, cue inspection, and current playback state.
Configuration-heavy endpoints such as stages, fixtures, active stage details, and frame driver setup are intentionally not wrapped by this library at the moment.

### Reader Semantics

`client.systemInfo`

- Reads software and device metadata such as product name, software version, UI version, API version, release type, and build information.
- Useful for diagnostics, compatibility checks, and logging which MaestroDMX unit or software generation your automation is currently talking to.

`client.brightness`

- Reads the global brightness master for the whole stage.
- In MaestroDMX terms this is the top-level brightness control of the Show page, applied on top of fixture-group brightness and cue/live settings.

`client.live`

- Reads the current Live Control state for the four fixture groups: `PRIMARY`, `SECONDARY`, `TERTIARY`, and `QUATERNARY`.
- This corresponds to the real-time control area of the Show page where each fixture group has its own pattern, color palette, FX palette, parameters, and trigger-toggle permissions.
- Use it when you need to know what is currently active on stage right now, regardless of whether that state originated from manual live control, OSC, or a running cue.

`client.patterns`

- Reads the full pattern catalog, including manifests, pattern ids, display names, descriptions, regular parameters, and advanced parameters.
- MaestroDMX distinguishes between `Maestro Patterns` and `Core Patterns`.
- Maestro patterns are autonomous, music-driven “vibes” such as `Still`, `Ambient`, `Dance`, or `Party`.
- Core patterns are more explicit looks such as `Solid Color`, `Wash`, `Spectrum`, `Chase`, or `All Black`, and can often be used with or without audio input.

`client.patternsAvailable`

- Reads the flattened list of currently available pattern ids.
- This is useful as a quick existence check before trying to select or validate a pattern id from external automation.

`client.paletteAssignments`

- Reads the currently active color palette id and FX snapshot id per fixture group.
- This is helpful because Live Control exposes both the currently selected palette and the current active palette state for a group.
- In practice this gives you the palette selection that MaestroDMX is actively using for each param group at the moment.

`client.colorPalettes`

- Reads the color palette catalog from MaestroDMX.
- MaestroDMX distinguishes between `Grouped Palettes` and `Individual/Extended Palettes`.
- Grouped palettes contain multiple individual palettes and are especially important for Maestro patterns, because Maestro patterns intelligently move through the palettes in a group based on the music.
- Individual/Extended palettes represent either a single color or a gradient; extended palettes may also include Amber, White, and UV channel values.

`client.fxPalettes`

- Reads the available FX palette / snapshot definitions exposed by the Web API.
- In MaestroDMX terminology, snapshots are saved fixture configurations that can later be recalled through FX palettes.
- This is primarily useful when cues or live groups refer to FX palette selections that you want to resolve into a friendlier name or id.

`client.show`

- Reads the currently selected show and all of its cues.
- A show in MaestroDMX behaves like a playlist of cues; each cue contains fixture-group pattern, palette, FX palette, parameter, transition, and timing information.
- Use this to inspect the authored show structure, cue order, durations, and the pattern/palette content embedded in each cue.

`client.showState`

- Reads the runtime playback state of the active show.
- This includes whether MaestroDMX currently reports `Stopped`, `Playing`, or another state, which cue index is active, and the elapsed play time.
- Use it when you need transport-state awareness for automation, monitoring, or UI overlays.

`client.fixtureGroups`

- Reads the logical fixture groups on the stage and the fixtures assigned to them.
- MaestroDMX fixture groups are the central runtime grouping concept for patterns, palettes, brightness, pixel mapping, and trigger participation.
- This reader is intentionally limited to group-level runtime topology and does not expose full stage-editing or fixture-patching workflows.

```ts
const patterns = await client.patterns.read();
const availablePatterns = await client.patternsAvailable.read();
const paletteAssignments = await client.paletteAssignments.read();
const colorPalettes = await client.colorPalettes.read();
const fxPalettes = await client.fxPalettes.read();
const brightness = await client.brightness.read();
const show = await client.show.read();
const showState = await client.showState.read();
const fixtureGroups = await client.fixtureGroups.read();
const systemInfo = await client.systemInfo.read();

console.log(patterns.manifests[0]?.patterns[0]?.name);
console.log(availablePatterns.ids);
console.log(paletteAssignments.states[0]?.activeColorPaletteId);
console.log(colorPalettes.palettes[0]?.children);
console.log(fxPalettes.palettes);
console.log(brightness.value);
console.log(show.cues[0]?.primary.patternId);
console.log(showState.currentCue);
console.log(fixtureGroups.groups[0]?.fixtureIds);
console.log(systemInfo.version);
```

Common convenience lookups:

```ts
await client.live.read();
await client.patterns.read();
await client.patternsAvailable.read();
await client.paletteAssignments.read();
await client.colorPalettes.read();
await client.show.read();
await client.showState.read();
await client.fixtureGroups.read();

console.log(client.live.getGroup(1)?.patternId);
console.log(client.live.getPaletteId("SECONDARY"));

console.log(client.patterns.findPatternById("Wash")?.name);
console.log(client.patterns.findParameter("Wash", "brightness")?.name);
console.log(client.patternsAvailable.has("Wash"));

console.log(client.paletteAssignments.getActiveColorPaletteId("PRIMARY"));
console.log(client.colorPalettes.findById("110")?.name);
console.log(client.colorPalettes.resolveChildren("701").map((palette) => palette.name));

console.log(client.show.getCueByIndex(0)?.name);
console.log(client.show.getCueSlot(0, "PRIMARY")?.patternId);
console.log(client.showState.isPlaying());
console.log(client.showState.getCurrentCueName());

console.log(client.fixtureGroups.getGroupByParamGroup("PRIMARY")?.fixtureIds);
```

### Convenience Method Reference

`client.live.getGroup(paramGroup)`

- Returns the current live slot for a fixture group using either `1..4` or `PRIMARY..QUATERNARY`.
- Useful when external code thinks in group names instead of the raw `primary` / `secondary` object keys.

`client.live.getPatternId(paramGroup)`

- Returns only the active pattern id of the selected live group.
- Useful for quick comparisons or logging.

`client.live.getPaletteId(paramGroup)`

- Returns only the active palette id of the selected live group.

`client.patterns.listPatterns()`

- Flattens all manifests into one list of pattern definitions.
- Useful when you do not care which manifest a pattern came from.

`client.patterns.findManifestById(id)`

- Finds a pattern manifest by id.
- Useful if you want to keep the distinction between manifests such as Maestro and Core pattern collections.

`client.patterns.findPatternById(id)`

- Finds one pattern definition by pattern id.
- This is usually the most useful pattern lookup when resolving live state or cue content to human-readable metadata.

`client.patterns.findParameter(patternId, param)`

- Resolves a regular or advanced parameter definition for a given pattern.
- Useful when building dynamic controls or showing labels and descriptions for pattern parameters.

`client.patternsAvailable.has(id)`

- Returns whether a pattern id is currently listed as available by MaestroDMX.

`client.paletteAssignments.getAssignment(paramGroup)`

- Returns the full active palette assignment object for a fixture group.

`client.paletteAssignments.getActiveColorPaletteId(paramGroup)`

- Returns only the currently active color palette id for a fixture group.

`client.paletteAssignments.getActiveFxSnapshotId(paramGroup)`

- Returns only the currently active FX snapshot id for a fixture group.

`client.colorPalettes.findById(paletteId)`

- Finds one color palette by id.

`client.colorPalettes.findByName(name)`

- Finds one color palette by its display name.

`client.colorPalettes.listGroups()`

- Returns only grouped palettes.
- Useful for UIs or automation flows that should only offer palette groups to Maestro patterns.

`client.colorPalettes.listLeafPalettes()`

- Returns only non-group palettes.
- Useful for cases where you want a concrete single palette or gradient instead of a palette collection.

`client.colorPalettes.resolveChildren(paletteId)`

- Resolves a grouped palette into its child palettes.
- Useful because Maestro patterns work particularly well with grouped palettes, while external tools often need to inspect the actual individual palettes contained inside.

`client.fxPalettes.findById(id)`

- Resolves an FX palette / snapshot id to its stored metadata.

`client.show.getCueByIndex(index)`

- Returns a cue from the selected show by zero-based array index.
- This is library indexing, not the OSC cue transport index.

`client.show.findCueByName(name)`

- Finds a cue by its cue name.

`client.show.getCueSlot(index, paramGroup)`

- Returns the slot state of one cue for one fixture group.
- Useful for questions like “what pattern does cue 7 use on SECONDARY?” without manually branching over `primary`, `secondary`, and so on.

`client.showState.isPlaying()`

- Returns `true` if the current show-state string ends in `_PLAYING`.

`client.showState.isStopped()`

- Returns `true` if the current show-state string ends in `_STOPPED`.

`client.showState.getCurrentCueName()`

- Extracts the current cue name from the runtime show-state payload when available.

`client.fixtureGroups.getGroupById(id)`

- Finds a fixture group by the internal group id.

`client.fixtureGroups.getGroupByParamGroup(paramGroup)`

- Resolves the stage fixture group that belongs to `PRIMARY`, `SECONDARY`, `TERTIARY`, or `QUATERNARY`.

`client.fixtureGroups.listFixtureIds(group)`

- Returns the fixture ids of a group, either by param-group name/index or by group id.

There is also a high-level lookup facade that combines already loaded snapshots:

```ts
await client.live.read();
await client.patterns.read();
await client.patternsAvailable.read();
await client.paletteAssignments.read();
await client.colorPalettes.read();
await client.fxPalettes.read();
await client.show.read();
await client.showState.read();
await client.fixtureGroups.read();

const livePrimary = client.lookup.resolveLiveGroupContext("PRIMARY");
const currentCuePrimary = client.lookup.resolveCurrentCueGroupContext("PRIMARY");

console.log(livePrimary?.pattern?.name);
console.log(livePrimary?.activeColorPalette?.name);
console.log(currentCuePrimary?.cue?.name);
console.log(currentCuePrimary?.slot?.paletteId);
```

### High-Level Lookup API

`client.lookup.resolveLiveGroupContext(paramGroup)`

- Combines the last loaded snapshots of `live`, `patterns`, `patternsAvailable`, `paletteAssignments`, `colorPalettes`, `fxPalettes`, and `fixtureGroups`.
- Returns one merged object for a fixture group with:
- current live slot
- resolved pattern definition
- resolved active color palette
- resolved active FX palette
- fixture-group metadata
- `patternAvailable` boolean
- Use this when you want to inspect “what is PRIMARY doing right now?” in one call.

`client.lookup.resolveCueGroupContext(cueIndex, paramGroup)`

- Combines `show`, `patterns`, `patternsAvailable`, `colorPalettes`, and `fixtureGroups` for one cue slot.
- Use this when you want a structured view of one cue group, for example to render show-overview tooling or validate cue content.

`client.lookup.resolveCurrentCueGroupContext(paramGroup)`

- Uses the loaded `showState` to find the active cue index and then resolves the cue/group context for that runtime position.
- Useful for dashboards, stream overlays, or controller feedback that needs to know what the currently playing cue is doing on a specific fixture group.

## OSC Control API

The low-level OSC transport remains available via `client.osc.send(...)`.
For MaestroDMX-specific commands, prefer `client.control`.

```ts
await client.control.audio.setInput("USB Audio");
await client.control.audio.nextInput();

await client.control.live.pause();
await client.control.live.resume();
await client.control.live.stop();

await client.control.group(1).setPattern("Solid Color");
await client.control.group(1).setPatternIndex(3);
await client.control.group(1).setPalette(12);
await client.control.group(1).setPaletteIndex(2);
await client.control.group(1).setFxPaletteIndex(1);
await client.control.group(1).setBrightness(0.8);
await client.control.group(1).setExcitement(0.5);
await client.control.group(1).setBackground(0.2);
await client.control.group(1).setMotionRange(0.6);
await client.control.group(1).setMotionSpeed(0.7);
await client.control.group(1).setSpeed(0.4);
await client.control.group(1).setEnergy(0.9);
await client.control.group(1).setVariance(0.3);
await client.control.group(1).setDecay(0.1);
await client.control.group(1).setAttack(0.8);
await client.control.group(1).setShape(4);

await client.control.show.loadByName("Main Show");
await client.control.show.loadByIndex(0);
await client.control.show.loadCueByIndex(1);
await client.control.show.nextCue();
await client.control.show.previousCue();
await client.control.show.next();
await client.control.show.previous();
await client.control.show.playPause();
await client.control.show.play();
await client.control.show.stop();

await client.control.triggers.setStrobe(true);
await client.control.triggers.toggleStrobe();
await client.control.triggers.setStrobeBrightness(1);
await client.control.triggers.setStrobeRate(0.7);
await client.control.triggers.setBlinder(true);
await client.control.triggers.toggleBlinder();
await client.control.triggers.setBlinderBrightness(0.9);
await client.control.triggers.setBlackout(true);
await client.control.triggers.toggleBlackout();
await client.control.triggers.setFog(true);
await client.control.triggers.toggleFog();
await client.control.triggers.setFogInterval(0.5);
await client.control.triggers.setFogDuration(0.2);
await client.control.triggers.setFogVolume(0.8);
await client.control.triggers.setFogSpeed(0.4);
await client.control.triggers.setEffect(true);
await client.control.triggers.toggleEffect();
```

### OSC Method Reference

`client.control.global.setBrightness(value)`

- Sets the global stage brightness.
- MaestroDMX describes this as the global brightness of the lights on the Show page.
- This value multiplies with fixture-group brightness inside live state or cues, so it behaves like a stage-wide master dimmer rather than replacing per-group brightness.

`client.control.audio.setInput(name)`

- Selects the audio input by its configured input name.
- Useful when your automation needs to switch between built-in and USB audio devices by name.

`client.control.audio.nextInput()`

- Advances to the next configured audio input.
- Best suited for hardware-button or simple controller workflows where cycling inputs is easier than sending a named target.

`client.control.live.pause()`

- Pauses the current live show state.
- Use this when running in live mode and you want the current generated state to stop advancing temporarily.

`client.control.live.resume()`

- Resumes a previously paused live state.

`client.control.live.stop()`

- Stops the current live show.
- This is a live-mode transport action, not a show-playlist stop.

`client.control.group(group).setPattern(name)`

- Selects a pattern for a fixture group by pattern name.
- In MaestroDMX, patterns are the core lighting behaviors. Maestro patterns act like autonomous music-driven vibes, while Core patterns are more explicit looks.

`client.control.group(group).setPatternIndex(index)`

- Selects a pattern by its order in the current MaestroDMX list.
- Useful for controller surfaces with encoders, faders, or indexed selection rather than text labels.

`client.control.group(group).setPalette(id)`

- Selects a color palette by palette id.
- This is usually the better choice when your automation already works with palette ids returned by `client.colorPalettes`.

`client.control.group(group).setPaletteIndex(index)`

- Selects a palette by its order in the palette list.
- Mainly useful for generic controller UIs where you do not want to hard-code palette ids.

`client.control.group(group).setFxPaletteIndex(index)`

- Selects an FX palette by its order in the FX palette list.
- In MaestroDMX, FX palettes are used to recall saved snapshots and effect-related stage states.

`client.control.group(group).setBrightness(value)`

- Sets fixture-group brightness for the currently active live pattern.
- This is the per-group brightness described in Maestro pattern parameters and combines with global brightness.

`client.control.group(group).setExcitement(value)`

- Sets the Maestro pattern excitement parameter.
- MaestroDMX describes Excitement as controlling how fast, flashy, and sudden the autonomous effect feels; lower values are smoother and calmer.

`client.control.group(group).setBackground(value)`

- Sets the Maestro pattern background parameter.
- Higher background values keep more light present between accents; lower values increase contrast and make flashes feel more dramatic.

`client.control.group(group).setMotionRange(value)`

- Sets moving-head motion range for the group.
- MaestroDMX describes this as the amount of PAN/TILT movement, where `0` keeps movers near their configured offset position and higher values use more of the configured width.

`client.control.group(group).setMotionSpeed(value)`

- Sets moving-head motion speed for the group.
- This specifically affects PAN/TILT-style motion on fixtures with mover attributes.

`client.control.group(group).setSpeed(value)`

- Sets the pattern speed parameter.
- For many core patterns this directly controls how fast the effect evolves; on Maestro patterns it acts more like an advanced fine-tuning control.

`client.control.group(group).setEnergy(value)`

- Sets the pattern energy parameter.
- In MaestroDMX documentation this often influences how much of a palette is used and, depending on the pattern, overall brightness and color intensity.

`client.control.group(group).setVariance(value)`

- Sets the pattern variance parameter.
- MaestroDMX describes Variance as conceptually similar to an inverse background control for core patterns.

`client.control.group(group).setDecay(value)`

- Sets the pattern decay parameter.
- This usually controls how long pulses or effects fade out, or how wide/smeared an effect feels, depending on the pattern.

`client.control.group(group).setAttack(value)`

- Sets the pattern attack parameter.
- This usually controls how quickly an effect ramps in or how sharply pulses begin.

`client.control.group(group).setShape(value)`

- Sets the shape index used by supported patterns.
- According to the OSC spec this is especially relevant for core patterns and works best in 2D mappings.

`client.control.show.loadByName(name)`

- Loads a show by its stored name.
- In MaestroDMX a show is a playlist of cues including pattern, palette, FX palette, timing, and transition data.

`client.control.show.loadByIndex(index)`

- Loads a show by its order in the show list.

`client.control.show.next()`

- Advances to the next show in the show list.

`client.control.show.previous()`

- Goes to the previous show in the show list.

`client.control.show.loadCueByIndex(index)`

- Jumps to a specific cue number in the loaded show.
- This uses the OSC cue numbering expected by MaestroDMX, which starts at `1`.

`client.control.show.nextCue()`

- Advances to the next cue in the currently loaded show.

`client.control.show.previousCue()`

- Goes back to the previous cue in the currently loaded show.

`client.control.show.playPause()`

- Toggles between playing and paused show playback.

`client.control.show.play()`

- Starts show playback from the loaded/current cue context.

`client.control.show.stop()`

- Stops show playback.

`client.control.triggers.setStrobe(enabled)`

- Engages or disengages the strobe trigger.
- Trigger buttons only work while MaestroDMX is actually playing, either in Live mode or from show cues.

`client.control.triggers.toggleStrobe()`

- Toggles the strobe trigger state.

`client.control.triggers.setStrobeBrightness(value)`

- Sets strobe brightness.

`client.control.triggers.setStrobeRate(value)`

- Sets strobe flash rate.

`client.control.triggers.setBlinder(enabled)`

- Engages or disengages the blinder trigger.
- MaestroDMX describes this as driving LED fixtures to full white or the configured white/blinder behavior of supported fixtures.

`client.control.triggers.toggleBlinder()`

- Toggles the blinder trigger state.

`client.control.triggers.setBlinderBrightness(value)`

- Sets blinder brightness.

`client.control.triggers.setBlackout(enabled)`

- Engages or disengages the blackout trigger so lights go dark.

`client.control.triggers.toggleBlackout()`

- Toggles the blackout trigger state.

`client.control.triggers.setFog(enabled)`

- Engages or disengages the fog trigger.
- The exact fixture reaction depends on whether stage fixtures expose FOG ON/OFF and related fog attributes.

`client.control.triggers.toggleFog()`

- Toggles the fog trigger state.

`client.control.triggers.setFogInterval(value)`

- Sets the fog interval parameter used for timer-style fog bursts.

`client.control.triggers.setFogDuration(value)`

- Sets the fog burst duration used for timer-style fog bursts.

`client.control.triggers.setFogVolume(value)`

- Sets fog volume for fixtures or machines that expose a Fog Volume attribute.

`client.control.triggers.setFogSpeed(value)`

- Sets fog speed for fixtures or machines that expose a Fog Speed attribute.

`client.control.triggers.setEffect(enabled)`

- Engages or disengages the generic EFFECT trigger.
- MaestroDMX positions this as a catch-all trigger for effect channels such as flame or custom effect hardware.

`client.control.triggers.toggleEffect()`

- Toggles the EFFECT trigger state.

## Method Notes

- All continuous float setters in the control API use the normalized MaestroDMX OSC range `0.0 .. 1.0`.
- `client.control.group(group)` accepts only fixture groups `1..4`.
- `client.control.show.loadCueByIndex(index)` requires `index >= 1` because MaestroDMX cue transport numbering is one-based.
- Brightness setters are throttled more conservatively than other continuous parameters to reduce chatter while still tracking manual slider movement well.

## MaestroDMX Background

The descriptions above are aligned with the MaestroDMX knowledge base:

- MaestroDMX uses `Fixture Groups` as the runtime grouping for patterns, palettes, parameters, mapping, and trigger participation.
- `Live Control` is the real-time editing surface where each fixture group can have its own pattern, palettes, parameters, and trigger toggles.
- `Show Control` is a playlist-like sequence of cues with names, durations, transitions, and per-group content.
- `Color Palettes` are either grouped palettes or individual/extended palettes, and Maestro patterns are designed to move intelligently through grouped palettes based on the music.
- `Trigger Buttons` cover BLACKOUT, BLINDER, STROBE, FOG, and EFFECT and only work while MaestroDMX is actively playing.

## Entwicklung

```bash
npm install
npm test
```

## Live Test

The normal `npm test` run stays local and does not require a MaestroDMX device.

Run the opt-in live integration test explicitly:

```bash
npm run live-test
```

It talks to `maestro.local` and runs a fixed verification sequence on group `1`:

- set brightness to `0.37`
- set excitement to `0.63`
- set pattern to `Solid Color`
- set pattern to `Ambient`
- set palette id to `223`
- set palette index to `1` and verify that the reported `paletteId` is still `223`

The script polls `/api/v1/live` until each change is visible again. It is intentionally opt-in because it mutates real MaestroDMX state.

There is also an opt-in latency experiment for brightness ramps:

```bash
npm run live-test:brightness-latency
```

The script sends a 1 second brightness ramp from `0.0` to `1.0` twice:

- once as raw OSC `/live/1/brightness` messages without library throttling
- once as HTTP `PUT /api/v1/live` updates with a full `params` object

Both runs poll `/api/v1/live` and report when each target brightness becomes visible again. This is meant for comparing transport behavior on a real MaestroDMX device.

## Sandbox CLI

For ad hoc experiments there is also a small sandbox CLI:

```bash
npm run sandbox -- help
```

Examples:

```bash
npm run sandbox -- live:get
npm run sandbox -- live:watch 100
npm run sandbox -- osc:send /live/1/brightness f:0.5
npm run sandbox -- osc:brightness 1 0.5
npm run sandbox -- http:put-live '{"params":{"brightness":0.5}}'
npm run sandbox -- http:set-brightness 0.5
```

## Notification WebSocket Test

For the WebSocket notification stream, there is a separate opt-in console test:

```bash
npm run live-test:notifications
```

It connects to `ws://maestro.local/notifications`, expects each frame to contain Base64-encoded GZIP data, decompresses it, and prints the decoded payload to the console.
It connects to `ws://maestro.local/notifications`, decodes the Base64 payload, and prints the detected Protobuf structure to the console. The example payloads currently look like Protobuf envelopes with a `type.googleapis.com/...` type URL and a nested binary payload.

You can also pass a custom URL directly:

```bash
tsx test/notifications-live-test.ts ws://maestro.local/notifications
```
