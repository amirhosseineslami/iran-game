"use client";

import dynamic from "next/dynamic";

const DynamicGameWorld = dynamic(
  () => import("../features/world/components/GameWorld").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="animate-pulse h-96 bg-gray-100 rounded-lg" /> },
);

export default function GameWorldWrapper() {
  return <DynamicGameWorld />;
}
