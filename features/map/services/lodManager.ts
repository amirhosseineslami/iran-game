export interface LODCell {
  id: string;
  minZoom: number;
  maxZoom: number;
  showBorder: boolean;
  showFill: boolean;
  showLabel: boolean;
}

export function getLODConfig(zoom: number): LODCell {
  if (zoom < 10) {
    return {
      id: "low",
      minZoom: 0,
      maxZoom: 10,
      showBorder: false,
      showFill: false,
      showLabel: false,
    };
  }
  if (zoom < 14) {
    return {
      id: "medium",
      minZoom: 10,
      maxZoom: 14,
      showBorder: true,
      showFill: false,
      showLabel: false,
    };
  }
  return {
    id: "high",
    minZoom: 14,
    maxZoom: 22,
    showBorder: true,
    showFill: true,
    showLabel: true,
  };
}
