# lib-maestro-dmx

Node.js-Bibliothek zum Zugriff auf MaestroDMX ueber OSC.

## Runtime

This library targets Node.js 24 LTS.
It is published as a pure ESM package.

## API

The library uses one shared host for both protocols:

- OSC writes are sent to port `7672`
- live state reads are loaded from `/api/v1/live`

```ts
import { createClient } from "lib-maestro-dmx";

const client = createClient({
  host: "maestro.local"
});

const liveState = await client.live.read();

console.log(liveState.primary.patternId);

await client.control.group(1).setPattern("Solid Color");
await client.control.group(1).setBrightness(0.75);
await client.control.global.setBrightness(0.9);
await client.control.show.play();
```

`client.live.read()` performs one explicit HTTP request and returns the full live snapshot.
`client.live.getLastRead()` returns the most recently fetched snapshot without making a new request.
`client.control` provides typed OSC helpers for the full parameter list published in the MaestroDMX OSC specification.
Continuous group and global value setters are throttled per OSC address with a leading-and-trailing window.
Brightness uses 500 ms. The other throttled continuous value setters use 250 ms.
Trigger commands and trigger parameter setters are sent immediately without throttling.

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
