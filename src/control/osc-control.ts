import { oscFloat, OscClient } from "../transport/osc.js";

/** Valid MaestroDMX live fixture-group numbers. */
export type LiveGroup = 1 | 2 | 3 | 4;

function assertLiveGroup(group: LiveGroup): void {
  if (!Number.isInteger(group) || group < 1 || group > 4) {
    throw new RangeError("Live group must be an integer between 1 and 4.");
  }
}

function assertUnitInterval(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} must be a finite number between 0 and 1.`);
  }
}

function assertInteger(name: string, value: number, minimum = 0): void {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be an integer greater than or equal to ${minimum}.`);
  }
}

function assertString(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new RangeError(`${name} must not be empty.`);
  }
}

class GlobalControlApi {
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
  }

  /** Sets the global MaestroDMX stage brightness in the normalized range `0..1`. */
  public async setBrightness(value: number): Promise<void> {
    assertUnitInterval("Global brightness", value);
    await this.oscClient.sendThrottled("/global/brightness", { intervalMs: 300 }, oscFloat(value));
  }
}

class AudioControlApi {
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
  }

  /** Selects an audio input by its MaestroDMX input name. */
  public async setInput(name: string): Promise<void> {
    assertString("Audio input name", name);
    await this.oscClient.send("/audio/input", name);
  }

  /** Advances to the next configured audio input. */
  public async nextInput(): Promise<void> {
    await this.oscClient.send("/audio/input/next");
  }
}

class LiveControlApi {
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
  }

  /** Pauses the current live engine state. */
  public async pause(): Promise<void> {
    await this.oscClient.send("/live/pause");
  }

  /** Resumes a previously paused live engine state. */
  public async resume(): Promise<void> {
    await this.oscClient.send("/live/resume");
  }

  /** Stops the current live engine state. */
  public async stop(): Promise<void> {
    await this.oscClient.send("/live/stop");
  }
}

class LiveGroupControlApi {
  private readonly oscClient: OscClient;
  private readonly group: LiveGroup;

  public constructor(oscClient: OscClient, group: LiveGroup) {
    assertLiveGroup(group);
    this.oscClient = oscClient;
    this.group = group;
  }

  /** Selects a pattern for this fixture group by display name. */
  public async setPattern(name: string): Promise<void> {
    assertString("Pattern name", name);
    await this.oscClient.send(this.address("pattern"), name);
  }

  /** Selects a pattern for this fixture group by list index. */
  public async setPatternIndex(index: number): Promise<void> {
    assertInteger("Pattern index", index);
    await this.oscClient.send(this.address("pattern/index"), index);
  }

  /** Selects a color palette for this fixture group by palette id. */
  public async setPalette(id: number): Promise<void> {
    assertInteger("Palette id", id);
    await this.oscClient.send(this.address("palette"), id);
  }

  /** Selects a color palette for this fixture group by list index. */
  public async setPaletteIndex(index: number): Promise<void> {
    assertInteger("Palette index", index);
    await this.oscClient.send(this.address("palette/index"), index);
  }

  /** Selects an FX palette for this fixture group by list index. */
  public async setFxPaletteIndex(index: number): Promise<void> {
    assertInteger("FX palette index", index);
    await this.oscClient.send(this.address("fx/index"), index);
  }

  /** Sets per-group brightness in the normalized range `0..1`. */
  public async setBrightness(value: number): Promise<void> {
    assertUnitInterval("Brightness", value);
    await this.oscClient.sendThrottled(this.address("brightness"), { intervalMs: 500 }, oscFloat(value));
  }

  /** Sets the Maestro pattern excitement parameter in the normalized range `0..1`. */
  public async setExcitement(value: number): Promise<void> {
    assertUnitInterval("Excitement", value);
    await this.oscClient.sendThrottled(this.address("excitement"), oscFloat(value));
  }

  /** Sets the background parameter in the normalized range `0..1`. */
  public async setBackground(value: number): Promise<void> {
    assertUnitInterval("Background", value);
    await this.oscClient.sendThrottled(this.address("background"), oscFloat(value));
  }

  /** Sets moving-head motion range in the normalized range `0..1`. */
  public async setMotionRange(value: number): Promise<void> {
    assertUnitInterval("Motion range", value);
    await this.oscClient.sendThrottled(this.address("motion/range"), oscFloat(value));
  }

  /** Sets moving-head motion speed in the normalized range `0..1`. */
  public async setMotionSpeed(value: number): Promise<void> {
    assertUnitInterval("Motion speed", value);
    await this.oscClient.sendThrottled(this.address("motion/speed"), oscFloat(value));
  }

  /** Sets the pattern speed parameter in the normalized range `0..1`. */
  public async setSpeed(value: number): Promise<void> {
    assertUnitInterval("Speed", value);
    await this.oscClient.sendThrottled(this.address("speed"), oscFloat(value));
  }

  /** Sets the pattern energy parameter in the normalized range `0..1`. */
  public async setEnergy(value: number): Promise<void> {
    assertUnitInterval("Energy", value);
    await this.oscClient.sendThrottled(this.address("energy"), oscFloat(value));
  }

  /** Sets the pattern variance parameter in the normalized range `0..1`. */
  public async setVariance(value: number): Promise<void> {
    assertUnitInterval("Variance", value);
    await this.oscClient.sendThrottled(this.address("variance"), oscFloat(value));
  }

  /** Sets the pattern decay parameter in the normalized range `0..1`. */
  public async setDecay(value: number): Promise<void> {
    assertUnitInterval("Decay", value);
    await this.oscClient.sendThrottled(this.address("decay"), oscFloat(value));
  }

  /** Sets the pattern attack parameter in the normalized range `0..1`. */
  public async setAttack(value: number): Promise<void> {
    assertUnitInterval("Attack", value);
    await this.oscClient.sendThrottled(this.address("attack"), oscFloat(value));
  }

  /** Sets the shape index for patterns that support shape-based mapping. */
  public async setShape(value: number): Promise<void> {
    if (!Number.isInteger(value) || value < 0 || value > 15) {
      throw new RangeError("Shape must be an integer between 0 and 15.");
    }

    await this.oscClient.send(this.address("shape"), value);
  }

  private address(suffix: string): string {
    return `/live/${this.group}/${suffix}`;
  }
}

class ShowControlApi {
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
  }

  /** Loads a show by its display name. */
  public async loadByName(name: string): Promise<void> {
    assertString("Show name", name);
    await this.oscClient.send("/show/name", name);
  }

  /** Advances to the next show in the MaestroDMX show list. */
  public async next(): Promise<void> {
    await this.oscClient.send("/show/next");
  }

  /** Moves to the previous show in the MaestroDMX show list. */
  public async previous(): Promise<void> {
    await this.oscClient.send("/show/previous");
  }

  /** Loads a show by its list index. */
  public async loadByIndex(index: number): Promise<void> {
    assertInteger("Show index", index);
    await this.oscClient.send("/show/index", index);
  }

  /** Jumps to a cue using MaestroDMX's one-based cue numbering. */
  public async loadCueByIndex(index: number): Promise<void> {
    assertInteger("Cue index", index, 1);
    await this.oscClient.send("/show/cue/index", index);
  }

  /** Advances to the next cue in the loaded show. */
  public async nextCue(): Promise<void> {
    await this.oscClient.send("/show/cue/next");
  }

  /** Moves to the previous cue in the loaded show. */
  public async previousCue(): Promise<void> {
    await this.oscClient.send("/show/cue/previous");
  }

  /** Toggles between play and pause for the loaded show. */
  public async playPause(): Promise<void> {
    await this.oscClient.send("/show/play_pause");
  }

  /** Starts playback of the loaded show. */
  public async play(): Promise<void> {
    await this.oscClient.send("/show/play");
  }

  /** Stops playback of the loaded show. */
  public async stop(): Promise<void> {
    await this.oscClient.send("/show/stop");
  }
}

class TriggerControlApi {
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
  }

  /** Enables or disables the strobe trigger. */
  public async setStrobe(enabled: boolean): Promise<void> {
    await this.oscClient.send("/triggers/strobe", enabled);
  }

  /** Toggles the strobe trigger. */
  public async toggleStrobe(): Promise<void> {
    await this.oscClient.send("/triggers/strobe/toggle");
  }

  /** Sets strobe brightness in the normalized range `0..1`. */
  public async setStrobeBrightness(value: number): Promise<void> {
    assertUnitInterval("Strobe brightness", value);
    await this.oscClient.send("/triggers/strobe/brightness", oscFloat(value));
  }

  /** Sets strobe flash rate in the normalized range `0..1`. */
  public async setStrobeRate(value: number): Promise<void> {
    assertUnitInterval("Strobe rate", value);
    await this.oscClient.send("/triggers/strobe/rate", oscFloat(value));
  }

  /** Enables or disables the blinder trigger. */
  public async setBlinder(enabled: boolean): Promise<void> {
    await this.oscClient.send("/triggers/blinder", enabled);
  }

  /** Toggles the blinder trigger. */
  public async toggleBlinder(): Promise<void> {
    await this.oscClient.send("/triggers/blinder/toggle");
  }

  /** Sets blinder brightness in the normalized range `0..1`. */
  public async setBlinderBrightness(value: number): Promise<void> {
    assertUnitInterval("Blinder brightness", value);
    await this.oscClient.send("/triggers/blinder/brightness", oscFloat(value));
  }

  /** Enables or disables the blackout trigger. */
  public async setBlackout(enabled: boolean): Promise<void> {
    await this.oscClient.send("/triggers/blackout", enabled);
  }

  /** Toggles the blackout trigger. */
  public async toggleBlackout(): Promise<void> {
    await this.oscClient.send("/triggers/blackout/toggle");
  }

  /** Enables or disables the fog trigger. */
  public async setFog(enabled: boolean): Promise<void> {
    await this.oscClient.send("/triggers/fog", enabled);
  }

  /** Toggles the fog trigger. */
  public async toggleFog(): Promise<void> {
    await this.oscClient.send("/triggers/fog/toggle");
  }

  /** Sets the fog interval parameter in the normalized range `0..1`. */
  public async setFogInterval(value: number): Promise<void> {
    assertUnitInterval("Fog interval", value);
    await this.oscClient.send("/triggers/fog/interval", oscFloat(value));
  }

  /** Sets the fog duration parameter in the normalized range `0..1`. */
  public async setFogDuration(value: number): Promise<void> {
    assertUnitInterval("Fog duration", value);
    await this.oscClient.send("/triggers/fog/duration", oscFloat(value));
  }

  /** Sets the fog volume parameter in the normalized range `0..1`. */
  public async setFogVolume(value: number): Promise<void> {
    assertUnitInterval("Fog volume", value);
    await this.oscClient.send("/triggers/fog/volume", oscFloat(value));
  }

  /** Sets the fog speed parameter in the normalized range `0..1`. */
  public async setFogSpeed(value: number): Promise<void> {
    assertUnitInterval("Fog speed", value);
    await this.oscClient.send("/triggers/fog/speed", oscFloat(value));
  }

  /** Enables or disables the generic effect trigger. */
  public async setEffect(enabled: boolean): Promise<void> {
    await this.oscClient.send("/triggers/effect", enabled);
  }

  /** Toggles the generic effect trigger. */
  public async toggleEffect(): Promise<void> {
    await this.oscClient.send("/triggers/effect/toggle");
  }
}

export interface MaestroOscControlApi {
  /** Global stage-level OSC controls. */
  global: GlobalControlApi;
  /** Audio-input related OSC controls. */
  audio: AudioControlApi;
  /** Live transport controls. */
  live: LiveControlApi;
  /** Show transport controls. */
  show: ShowControlApi;
  /** Global trigger-button controls. */
  triggers: TriggerControlApi;
  /** Per-fixture-group controls for patterns, palettes, and parameters. */
  group(group: LiveGroup): LiveGroupControlApi;
}

/**
 * Typed OSC control facade for the MaestroDMX OSC specification.
 */
export class MaestroOscControlApiImpl implements MaestroOscControlApi {
  public readonly global: GlobalControlApi;
  public readonly audio: AudioControlApi;
  public readonly live: LiveControlApi;
  public readonly show: ShowControlApi;
  public readonly triggers: TriggerControlApi;
  private readonly oscClient: OscClient;

  public constructor(oscClient: OscClient) {
    this.oscClient = oscClient;
    this.global = new GlobalControlApi(oscClient);
    this.audio = new AudioControlApi(oscClient);
    this.live = new LiveControlApi(oscClient);
    this.show = new ShowControlApi(oscClient);
    this.triggers = new TriggerControlApi(oscClient);
  }

  /** Returns the per-group OSC control surface for one fixture group. */
  public group(group: LiveGroup): LiveGroupControlApi {
    return new LiveGroupControlApi(this.oscClient, group);
  }
}
