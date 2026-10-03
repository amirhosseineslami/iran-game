"use client";

import { useGame } from "@/features/game/context/GameContext";
import LocationControl from "./LocationControl";

export default function PlayerLayer() {
  const { playerLocation } = useGame();

  // Only render location control if it has meaningful state to show
  // (reduces unnecessary renders and DOM nodes)
  return playerLocation ? <LocationControl /> : null;
}
