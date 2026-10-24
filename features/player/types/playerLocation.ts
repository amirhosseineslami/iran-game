export interface PlayerLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  /** True when the location is a fallback (e.g. Tehran mock) rather than live GPS. */
  isMock?: boolean;
}
