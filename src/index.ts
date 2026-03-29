import { BrightnessApi } from "./read/brightness.js";
import { ColorPalettesApi } from "./read/color-palettes.js";
import { FixtureGroupsApi } from "./read/fixture-groups.js";
import { FxPalettesApi } from "./read/fx-palettes.js";
import { MaestroOscControlApiImpl } from "./control/osc-control.js";
import type { LiveGroup, MaestroOscControlApi } from "./control/osc-control.js";
import { LiveApi } from "./read/live.js";
import { PaletteAssignmentsApi } from "./read/palette-assignments.js";
import { PatternsApi } from "./read/patterns.js";
import { PatternsAvailableApi } from "./read/patterns-available.js";
import { MaestroLookupApi } from "./read/lookup.js";
import { HttpClient } from "./transport/http.js";
import { OscClient } from "./transport/osc.js";
import { ShowApi } from "./read/show.js";
import { ShowStateApi } from "./read/show-state.js";
import { SystemInfoApi } from "./read/system-info.js";

const DEFAULT_OSC_PORT = 7672;

export type { LiveGroup, MaestroOscControlApi } from "./control/osc-control.js";
export type { LiveSlotState, LiveState } from "./read/live.js";
export type { BrightnessState } from "./read/brightness.js";
export type { ColorPalette, ColorPalettesState, PaletteColor } from "./read/color-palettes.js";
export type { FixtureGroup, FixtureGroupsState } from "./read/fixture-groups.js";
export type { FxPalette, FxPalettesState } from "./read/fx-palettes.js";
export type { PaletteAssignment, PaletteAssignmentsState } from "./read/palette-assignments.js";
export type { PatternDefinition, PatternManifest, PatternParameter, PatternsState } from "./read/patterns.js";
export type { PatternsAvailableState } from "./read/patterns-available.js";
export type { CueGroupContext, CurrentCueGroupContext, LiveGroupContext } from "./read/lookup.js";
export type { ShowCue, ShowState } from "./read/show.js";
export type { ShowPlaybackState } from "./read/show-state.js";
export type { ParamGroup, SlotState } from "./read/shared.js";
export type { SystemInfoState } from "./read/system-info.js";
export type { HttpClientOptions } from "./transport/http.js";
export type { OscArgument, OscClientOptions, OscMessage, OscResponse } from "./transport/osc.js";
export { BrightnessApi } from "./read/brightness.js";
export { ColorPalettesApi } from "./read/color-palettes.js";
export { FixtureGroupsApi } from "./read/fixture-groups.js";
export { FxPalettesApi } from "./read/fx-palettes.js";
export { MaestroOscControlApiImpl } from "./control/osc-control.js";
export { LiveApi } from "./read/live.js";
export { MaestroLookupApi } from "./read/lookup.js";
export { PaletteAssignmentsApi } from "./read/palette-assignments.js";
export { PatternsApi } from "./read/patterns.js";
export { PatternsAvailableApi } from "./read/patterns-available.js";
export { ShowApi } from "./read/show.js";
export { ShowStateApi } from "./read/show-state.js";
export { SystemInfoApi } from "./read/system-info.js";
export { HttpClient } from "./transport/http.js";
export { OscClient, decodeOscMessage, encodeOscMessage, oscFloat } from "./transport/osc.js";

/**
 * Connection options for creating a MaestroDMX client.
 */
export interface MaestroDmxClientOptions {
  /** Hostname or IP address of the MaestroDMX device. */
  host: string;
  /** HTTP protocol used for Web API reads. Defaults to `http`. */
  protocol?: "http" | "https";
  /** Optional local UDP port to bind the OSC socket to. */
  localOscPort?: number;
}

/**
 * Main high-level client for MaestroDMX.
 *
 * It combines OSC writes, typed Web API readers, and snapshot-based lookup
 * helpers for common show-automation workflows.
 */
export interface MaestroDmxClient {
  /** Hostname or IP address of the connected MaestroDMX device. */
  host: string;
  /** Low-level OSC transport for raw OSC access. */
  osc: OscClient;
  /** Typed MaestroDMX OSC control surface. */
  control: MaestroOscControlApi;
  /** Device and software metadata reader. */
  systemInfo: SystemInfoApi;
  /** Global stage brightness reader. */
  brightness: BrightnessApi;
  /** Current live state reader for all four fixture groups. */
  live: LiveApi;
  /** Full pattern catalog reader. */
  patterns: PatternsApi;
  /** Flattened list of available pattern ids. */
  patternsAvailable: PatternsAvailableApi;
  /** Active palette assignments per fixture group. */
  paletteAssignments: PaletteAssignmentsApi;
  /** Color palette catalog reader. */
  colorPalettes: ColorPalettesApi;
  /** FX palette / snapshot catalog reader. */
  fxPalettes: FxPalettesApi;
  /** Loaded show definition reader. */
  show: ShowApi;
  /** Runtime show playback-state reader. */
  showState: ShowStateApi;
  /** Fixture-group topology reader. */
  fixtureGroups: FixtureGroupsApi;
  /** High-level snapshot resolver across multiple readers. */
  lookup: MaestroLookupApi;
  /** Closes the underlying OSC socket and related timers. */
  close(): Promise<void>;
}

class MaestroDmxClientImpl implements MaestroDmxClient {
  public readonly host: string;
  public readonly osc: OscClient;
  public readonly control: MaestroOscControlApi;
  public readonly systemInfo: SystemInfoApi;
  public readonly brightness: BrightnessApi;
  public readonly live: LiveApi;
  public readonly patterns: PatternsApi;
  public readonly patternsAvailable: PatternsAvailableApi;
  public readonly paletteAssignments: PaletteAssignmentsApi;
  public readonly colorPalettes: ColorPalettesApi;
  public readonly fxPalettes: FxPalettesApi;
  public readonly show: ShowApi;
  public readonly showState: ShowStateApi;
  public readonly fixtureGroups: FixtureGroupsApi;
  public readonly lookup: MaestroLookupApi;

  public constructor(options: MaestroDmxClientOptions) {
    this.host = options.host;
    this.osc = new OscClient({
      host: options.host,
      port: DEFAULT_OSC_PORT,
      localPort: options.localOscPort
    });
    this.control = new MaestroOscControlApiImpl(this.osc);
    const httpClient = new HttpClient({
      host: options.host,
      protocol: options.protocol
    });
    this.systemInfo = new SystemInfoApi(httpClient);
    this.brightness = new BrightnessApi(httpClient);
    this.live = new LiveApi(httpClient);
    this.patterns = new PatternsApi(httpClient);
    this.patternsAvailable = new PatternsAvailableApi(httpClient);
    this.paletteAssignments = new PaletteAssignmentsApi(httpClient);
    this.colorPalettes = new ColorPalettesApi(httpClient);
    this.fxPalettes = new FxPalettesApi(httpClient);
    this.show = new ShowApi(httpClient);
    this.showState = new ShowStateApi(httpClient);
    this.fixtureGroups = new FixtureGroupsApi(httpClient);
    this.lookup = new MaestroLookupApi({
      live: this.live,
      patterns: this.patterns,
      patternsAvailable: this.patternsAvailable,
      paletteAssignments: this.paletteAssignments,
      colorPalettes: this.colorPalettes,
      fxPalettes: this.fxPalettes,
      show: this.show,
      showState: this.showState,
      fixtureGroups: this.fixtureGroups
    });
  }

  public async close(): Promise<void> {
    await this.osc.close();
  }
}

/** Creates a fully wired MaestroDMX client instance. */
export function createClient(options: MaestroDmxClientOptions): MaestroDmxClient {
  return new MaestroDmxClientImpl(options);
}
