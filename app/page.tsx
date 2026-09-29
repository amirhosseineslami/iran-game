import { GameMap } from "../features/map";
import { GameWorld } from "../features/world";
import { PlayerLayer } from "../features/player";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <GameMap>
        <GameWorld />
        <PlayerLayer />
      </GameMap>
    </main>
  );
}
