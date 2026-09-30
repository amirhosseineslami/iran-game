"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useMapInstance } from "@/features/map/context/MapContext";
import { useCellLayer } from "./CellLayer";
import type { GameCell } from "@/features/world/types/gameCell";

interface CellRendererProps {
  cells: GameCell[];
  selectedCellId: string | null;
  onCellClick: (cellId: string) => void;
}

export default function CellRenderer({ cells, selectedCellId, onCellClick }: CellRendererProps) {
  const map = useMapInstance();
  
  useCellLayer({
    map,
    cells,
    selectedCellId,
    onCellClick,
  });

  // Only render to trigger the hook
  return null;
}
