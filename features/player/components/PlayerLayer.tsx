"use client";

import PlayerMarker from "./PlayerMarker";
import LocationControl from "./LocationControl";

import {
  usePlayerLocation,
} from "../hooks/usePlayerLocation";

export default function PlayerLayer() {
  const { location } =
    usePlayerLocation();

  return (
    <>
      <PlayerMarker
        location={location}
      />

      <LocationControl />
    </>
  );
}
