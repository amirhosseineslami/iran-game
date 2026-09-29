"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { Map } from "maplibre-gl";

const MapContext = createContext<Map | null>(null);

interface MapProviderProps {
  map: Map | null;
  children: ReactNode;
}

export function MapProvider({
  map,
  children,
}: MapProviderProps) {
  return (
    <MapContext.Provider value={map}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapInstance() {
  return useContext(MapContext);
}
